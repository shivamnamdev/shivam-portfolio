// POST /api/learning/notifications/read  body { ids?: string[] }  ->  { success, unread }
// Marks notifications as read for the signed-in learner only. Without ids it marks everything in their bell; ids the learner cannot see are ignored.
import { NextResponse } from "next/server";
import { fail, readJson, requireLearner } from "@/lib/learnerApi";
import { markRead } from "@/lib/catalog/engagement";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const who = await requireLearner();
  if ("response" in who) return who.response;
  const body = await readJson(req);
  if (body === null) return fail(400, "Invalid request");
  let ids: string[] | undefined;
  if (body.ids !== undefined) {
    if (!Array.isArray(body.ids) || body.ids.length > 100 || !body.ids.every((i) => typeof i === "string" && UUID.test(i))) return fail(400, "ids must be a list of up to 100 notification ids");
    ids = body.ids.map((i: string) => i.toLowerCase());
  }
  try {
    return NextResponse.json({ success: true, ...(await markRead(who.userId, ids)) });
  } catch (e) {
    console.error("mark read failed:", (e as Error).message?.slice(0, 120));
    return fail(500, "Could not update your notifications");
  }
}
