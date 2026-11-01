// GET /api/learning/progress?courseSlug=  ->  { success, completedVideoIds, assignments: {videoId: code}, exam }
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fail, hasCourseAccess, isSlug, requireLearner } from "@/lib/learnerApi";

export async function GET(req: Request) {
  const who = requireLearner();
  if ("response" in who) return who.response;
  const courseSlug = new URL(req.url).searchParams.get("courseSlug");
  if (!isSlug(courseSlug)) return fail(400, "Invalid courseSlug");

  try {
    if (!(await hasCourseAccess(who.userId, courseSlug))) return fail(403, "Not enrolled in this course");
    const [videos, assignments, exam] = await Promise.all([
      supabaseAdmin.from("video_progress").select("video_id").eq("user_id", who.userId).eq("course_slug", courseSlug),
      supabaseAdmin.from("assignment_progress").select("video_id, submitted_code").eq("user_id", who.userId).eq("course_slug", courseSlug),
      supabaseAdmin.from("exam_progress").select("is_passed, attempts_used").eq("user_id", who.userId).eq("course_slug", courseSlug).maybeSingle(),
    ]);
    if (videos.error) throw videos.error;
    if (assignments.error) throw assignments.error;
    if (exam.error) throw exam.error;

    const submissions: Record<string, string> = {};
    for (const row of assignments.data ?? []) if (row.video_id && row.submitted_code) submissions[row.video_id] = row.submitted_code;
    return NextResponse.json({
      success: true,
      completedVideoIds: (videos.data ?? []).map((r) => r.video_id),
      completedAssignmentIds: (assignments.data ?? []).map((r) => r.video_id),
      assignments: submissions,
      exam: exam.data ?? null,
    });
  } catch (error) {
    console.error("Load progress failed:", error);
    return fail(500, "Failed to load progress");
  }
}
