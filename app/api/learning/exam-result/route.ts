// POST /api/learning/exam-result  { courseSlug, score }  ->  { success, is_passed, attempts_used }
// The score is still computed in the browser (Pyodide); the server enforces the attempt cap and the 0-100 range.
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fail, hasCourseAccess, isSlug, readJson, requireLearner } from "@/lib/learnerApi";
import { isAdminEmail } from "@/lib/admin";
import { currentUser } from "@clerk/nextjs/server";
import { getPrimaryEmail } from "@/lib/serverAuth";

const MAX_ATTEMPTS = 5;
const PASS_MARK = 80;

export async function POST(req: Request) {
  const who = requireLearner();
  if ("response" in who) return who.response;
  const body = await readJson(req);
  if (!body || !isSlug(body.courseSlug) || typeof body.score !== "number" || !Number.isInteger(body.score) || body.score < 0 || body.score > 100) {
    return fail(400, "Invalid request");
  }

  try {
    if (!(await hasCourseAccess(who.userId, body.courseSlug))) return fail(403, "Not enrolled in this course");
    const { data: current, error: readError } = await supabaseAdmin
      .from("exam_progress").select("is_passed, attempts_used").eq("user_id", who.userId).eq("course_slug", body.courseSlug).maybeSingle();
    if (readError) throw readError;

    const used = current?.attempts_used ?? 0;
    const alreadyPassed = !!current?.is_passed;
    const isAdmin = isAdminEmail(getPrimaryEmail(await currentUser()));
    if (used >= MAX_ATTEMPTS && !alreadyPassed && !isAdmin) return fail(403, "No exam attempts left");

    const passed = body.score >= PASS_MARK;
    const attempts = used + 1;
    const { error } = await supabaseAdmin.from("exam_progress").upsert(
      {
        user_id: who.userId, course_slug: body.courseSlug, attempts_used: attempts, is_passed: passed || alreadyPassed,
        last_score: body.score, completed_at: passed ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,course_slug" },
    );
    if (error) throw error;
    return NextResponse.json({ success: true, is_passed: passed || alreadyPassed, attempts_used: attempts });
  } catch (error) {
    console.error("Exam result failed:", error);
    return fail(500, "Failed to save exam result");
  }
}
