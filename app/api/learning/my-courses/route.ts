// GET /api/learning/my-courses  ->  { success, courses: [{ id, slug, title, statusText, duration, resources?, format? }] }
// The cards of the courses the signed-in learner holds (no private link). The dashboard used to filter a bundled list of every course.
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fail, requireLearner } from "@/lib/learnerApi";
import { getMyCourses } from "@/lib/catalog/learning";

export const dynamic = "force-dynamic";

export async function GET() {
  const who = await requireLearner();
  if ("response" in who) return who.response;
  const { data, error } = await supabaseAdmin.from("user_enrollments").select("course_slug").eq("user_id", who.userId);
  if (error) { console.error("my-courses lookup failed:", error.message); return fail(500, "Could not load your courses"); }
  try {
    return NextResponse.json({ success: true, courses: await getMyCourses((data ?? []).map((r) => r.course_slug as string)) });
  } catch (e) {
    console.error("my-courses failed:", (e as Error).message?.slice(0, 120));
    return fail(500, "Could not load your courses");
  }
}
