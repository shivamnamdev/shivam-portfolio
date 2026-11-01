// POST /api/learning/complete-video  { courseSlug, videoId }  ->  { success }
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fail, hasCourseAccess, isItemId, isSlug, readJson, requireLearner, UNIQUE_VIOLATION } from "@/lib/learnerApi";

export async function POST(req: Request) {
  const who = requireLearner();
  if ("response" in who) return who.response;
  const body = await readJson(req);
  if (!body || !isSlug(body.courseSlug) || !isItemId(body.videoId)) return fail(400, "Invalid request");

  try {
    if (!(await hasCourseAccess(who.userId, body.courseSlug))) return fail(403, "Not enrolled in this course");
    const { error } = await supabaseAdmin
      .from("video_progress").insert([{ user_id: who.userId, course_slug: body.courseSlug, video_id: body.videoId }]);
    // Already marked complete: same outcome as the first request.
    if (error && error.code !== UNIQUE_VIOLATION) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Complete video failed:", error);
    return fail(500, "Failed to save progress");
  }
}
