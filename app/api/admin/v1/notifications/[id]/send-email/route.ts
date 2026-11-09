import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { ApiError, conflict, handle, ok, unprocessable } from "@/lib/adminApi/envelope";
import { limitWrites } from "@/lib/adminApi/request";
import { checkEmailSend, renderNotificationEmail } from "@/lib/adminApi/notifications";
import { claimEmail, countRecipients, getNotification, idParam, recordEmail, releaseEmail, requireMailConfig, resolveRecipients, sendAll, view } from "@/lib/adminApi/notificationStore";
import { effective, savedSettings } from "@/lib/adminApi/engagementStore";
import { rateLimitTake } from "@/lib/rateLimit";
import { writeAudit } from "@/lib/adminApi/audit";

export const maxDuration = 60;

// The only way an e-mail leaves for a notification: explicit, immediate, once. Owner only (permission notifications:send).
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return handle(async () => {
    const actor = await authorize(req, "notifications:send");
    await limitWrites(actor);
    const id = idParam(params.id);
    const n = await getNotification(id);
    const { values } = await savedSettings();
    const limits = effective(values);
    const cap = limits["announcement-email-cap"] as number;
    const daily = limits["daily-email-cap"] as number;

    const total = await countRecipients(n.target);
    checkEmailSend(n, total, cap);                       // cheap checks first, before anyone is looked up
    requireMailConfig();
    const seen = new Set<string>();
    const people = (await resolveRecipients(n.target, cap + 1)).filter((p) => {      // one e-mail per address; people with no address are skipped
      const e = p.email?.toLowerCase();
      if (!e || seen.has(e)) return false;
      seen.add(e);
      return true;
    });
    checkEmailSend(n, people.length, cap);
    const skipped = Math.max(0, total - people.length);

    if (!(await claimEmail(id))) throw conflict("The e-mail for this notification was already sent. It is sent once");
    const budget = await rateLimitTake("send-email:all", 86400, people.length, daily);   // the contact form draws on the same daily budget
    if (budget !== "ok") {
      await releaseEmail(id);
      if (budget === "denied") throw unprocessable(`This would pass today's e-mail limit of ${daily} (the contact form counts too). Try tomorrow or raise daily-email-cap`);
      throw new ApiError(503, "limit_unavailable", "The e-mail limit counter is not reachable, so nothing was sent");
    }
    const { sent, failed } = await sendAll(people, renderNotificationEmail(n));
    if (sent === 0) await releaseEmail(id); else await recordEmail(id, sent);
    await writeAudit({ actor, action: "send-email", resource: "notification", resourceId: id, before: { emailSentAt: null }, after: { sent, failed, skipped, recipients: people.length } });
    if (sent === 0) throw new ApiError(502, "send_failed", "No e-mail could be sent. Nothing was recorded, so you can try again");
    return ok({ sent, failed, skipped, notification: view(await getNotification(id)) });
  });
}
