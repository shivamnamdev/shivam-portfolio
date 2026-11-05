import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { handle, ok } from "@/lib/adminApi/envelope";
import { limitWrites, listParams } from "@/lib/adminApi/request";
import { parseObject, readBody } from "@/lib/adminApi/validate";
import { buildNotification, notificationCreateShape } from "@/lib/adminApi/notifications";
import { insertNotification, listNotifications, view } from "@/lib/adminApi/notificationStore";
import { writeAudit } from "@/lib/adminApi/audit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { unprocessable } from "@/lib/adminApi/envelope";

export async function GET(req: NextRequest) {
  return handle(async () => {
    await authorize(req, "notifications:read");
    const now = new Date();
    const { items, next } = await listNotifications(listParams(req), now);
    return ok({ items: items.map((n) => view(n, now)), nextCursor: next });
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const actor = await authorize(req, "notifications:write");
    await limitWrites(actor);
    const input = parseObject(await readBody(req), notificationCreateShape);
    const now = new Date();
    const n = buildNotification(input as never, now);
    if (n.target.kind === "cohort") {   // a typo in the cohort would make the notification reach nobody
      const { data, error } = await supabaseAdmin.from("content_docs").select("key").eq("kind", "cohort").eq("key", n.target.cohortSlug).maybeSingle();
      if (error) throw error;
      if (!data) throw unprocessable(`cohort not found: ${n.target.cohortSlug}`);
    }
    const saved = await insertNotification(n, actor.id);
    await writeAudit({ actor, action: "create", resource: "notification", resourceId: saved.id, after: view(saved, now) });
    return ok(view(saved, now), 201);
  });
}
