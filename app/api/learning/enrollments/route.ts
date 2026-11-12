// GET /api/learning/enrollments  ->  { success, slugs: string[] }
// The signed-in learner's own course slugs. The browser cannot read user_enrollments (it lists every learner's
// id and course), so the dashboard, lesson page, live lobby and checkout ask this route instead (SCP-74).
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fail, requireLearner } from "@/lib/learnerApi";

export const dynamic = "force-dynamic";

export async function GET() {
  const who = await requireLearner();
  if ("response" in who) return who.response;

  const { data, error } = await supabaseAdmin.from("user_enrollments").select("course_slug").eq("user_id", who.userId);
  if (error) {
    console.error("enrollments lookup failed:", error.message);
    return fail(500, "Could not load enrollments");
  }
  return NextResponse.json({ success: true, slugs: (data ?? []).map(r => r.course_slug as string) });
}
