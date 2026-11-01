// POST /api/learning/submit-assignment  { courseSlug, videoId, submittedCode, title?, kind? }  ->  { success, firstSubmission }
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getDisplayName, getPrimaryEmail } from "@/lib/serverAuth";
import { fail, hasCourseAccess, isItemId, isSlug, readJson, requireLearner } from "@/lib/learnerApi";

const MAX_CODE_CHARS = 200_000;
const MAX_TITLE_CHARS = 200;

export async function POST(req: Request) {
  const who = requireLearner();
  if ("response" in who) return who.response;
  const body = await readJson(req);
  if (!body || !isSlug(body.courseSlug) || !isItemId(body.videoId)) return fail(400, "Invalid request");
  if (typeof body.submittedCode !== "string" || body.submittedCode.length === 0 || body.submittedCode.length > MAX_CODE_CHARS) {
    return fail(400, "Invalid submission");
  }
  const title = typeof body.title === "string" ? body.title.slice(0, MAX_TITLE_CHARS) : "";
  const label = body.kind === "git" ? "New Git Lab Submission: " : "New Code Submission: ";

  try {
    if (!(await hasCourseAccess(who.userId, body.courseSlug))) return fail(403, "Not enrolled in this course");
    const existing = await supabaseAdmin
      .from("assignment_progress").select("id").eq("user_id", who.userId).eq("course_slug", body.courseSlug).eq("video_id", body.videoId).limit(1);
    if (existing.error) throw existing.error;
    const firstSubmission = (existing.data ?? []).length === 0;

    const user = await currentUser();
    const { error } = await supabaseAdmin.from("assignment_progress").upsert(
      {
        user_id: who.userId, course_slug: body.courseSlug, video_id: body.videoId, submitted_code: body.submittedCode,
        user_name: getDisplayName(user), completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,course_slug,video_id" },
    );
    if (error) throw error;

    if (firstSubmission) {
      // The activity feed is best effort: a failed log line must not fail the submission.
      await supabaseAdmin.from("admin_activity_log").insert([{ type: "submission", message: label + title, user_email: getPrimaryEmail(user) }]);
    }
    return NextResponse.json({ success: true, firstSubmission });
  } catch (error) {
    console.error("Submit assignment failed:", error);
    return fail(500, "Failed to save submission");
  }
}
