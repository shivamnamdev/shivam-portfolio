import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { handle, ok } from "@/lib/adminApi/envelope";
import { countRecipients, getNotification, idParam, sampleRecipients } from "@/lib/adminApi/notificationStore";
import { SAMPLE_SIZE } from "@/lib/adminApi/notifications";

// How many people the target reaches and who a few of them are (at most 5): enough to check the target, never a list to copy.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return handle(async () => {
    await authorize(req, "notifications:read");
    const n = await getNotification(idParam(params.id));
    const [count, sample] = await Promise.all([countRecipients(n.target), n.target.kind === "all" || n.target.kind === "admins" ? Promise.resolve([]) : sampleRecipients(n.target)]);
    return ok({ target: n.target, count, sample: sample.slice(0, SAMPLE_SIZE).map((p) => ({ name: p.name, email: p.email })), sampleSize: SAMPLE_SIZE });
  });
}
