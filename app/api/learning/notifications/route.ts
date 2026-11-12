// GET /api/learning/notifications  ->  { success, source, items: [{ id, type, title, body, link|null, publishAt, read, dateText? }], unread }
// The signed-in learner's bell: live notifications aimed at them (never an admin alert), newest first, with their own read state. With
// PORTAL_ENGAGEMENT=files it is the old hand-written list and the browser keeps the read count (source "files").
import { NextResponse } from "next/server";
import { requireLearner } from "@/lib/learnerApi";
import { getBell } from "@/lib/catalog/engagement";

export const dynamic = "force-dynamic";

export async function GET() {
  const who = await requireLearner();
  if ("response" in who) return who.response;
  return NextResponse.json({ success: true, ...(await getBell(who.userId)) }, { headers: { "Cache-Control": "private, no-store" } });
}
