// POST /api/learning/exam-grade  { courseSlug, files, inputs }  ->  { success, score, is_passed, attempts_used, report }
// The server runs the learner's code against the course's grader (lib/examGraders.ts) and records the result itself.
// The browser never sends a score. `inputs` are the answers the learner typed into input() pop-ups, in order.
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fail, hasCourseAccess, isSlug, readJson, requireLearner } from "@/lib/learnerApi";
import { isAdminEmail } from "@/lib/admin";
import { getPrimaryEmail } from "@/lib/serverAuth";
import { EXAM_GRADERS } from "@/lib/examGraders";
import { runExam } from "@/lib/runExam";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 5;
const PASS_MARK = 80;
const MAX_CODE_CHARS = 200_000;
const MAX_STEPS = 30;
const MAX_INPUTS = 200;
const MAX_INPUT_CHARS = 1000;

const grading = new Set<string>();   // one grade at a time per learner (per server instance)

// The same join the browser used: every file of every step, in order.
function combine(files: unknown): string | null {
  if (!Array.isArray(files) || files.length === 0 || files.length > MAX_STEPS) return null;
  let total = 0;
  const parts: string[] = [];
  for (const step of files) {
    if (!step || typeof step !== "object" || Array.isArray(step)) return null;
    const texts = Object.values(step as Record<string, unknown>);
    if (!texts.every(t => typeof t === "string")) return null;
    const joined = (texts as string[]).join("\n\n");
    total += joined.length;
    parts.push(joined);
  }
  return total > MAX_CODE_CHARS ? null : parts.join("\n\n");
}

export async function POST(req: Request) {
  const who = requireLearner();
  if ("response" in who) return who.response;
  const body = await readJson(req);
  const code = body ? combine(body.files) : null;
  const inputs = body?.inputs ?? [];
  if (
    !body || !isSlug(body.courseSlug) || code === null || !Array.isArray(inputs) || inputs.length > MAX_INPUTS ||
    !inputs.every(i => typeof i === "string" && i.length <= MAX_INPUT_CHARS)
  ) return fail(400, "Invalid request");
  const grader = EXAM_GRADERS[body.courseSlug];
  if (!grader) return fail(404, "This course has no exam");

  if (grading.has(who.userId)) return fail(429, "Your exam is already being graded");
  grading.add(who.userId);
  try {
    if (!(await hasCourseAccess(who.userId, body.courseSlug))) return fail(403, "Not enrolled in this course");
    const { data: current, error: readError } = await supabaseAdmin
      .from("exam_progress").select("is_passed, attempts_used").eq("user_id", who.userId).eq("course_slug", body.courseSlug).maybeSingle();
    if (readError) throw readError;

    const used = current?.attempts_used ?? 0;
    const alreadyPassed = !!current?.is_passed;
    const isAdmin = isAdminEmail(getPrimaryEmail(await currentUser()));
    if (used >= MAX_ATTEMPTS && !alreadyPassed && !isAdmin) return fail(403, "No exam attempts left");

    // The attempt is counted before grading: a crash or a timeout still uses it.
    const attempts = used + 1;
    const { error: countError } = await supabaseAdmin.from("exam_progress").upsert(
      { user_id: who.userId, course_slug: body.courseSlug, attempts_used: attempts, is_passed: alreadyPassed },
      { onConflict: "user_id,course_slug" },
    );
    if (countError) throw countError;

    const run = await runExam({ code, inputs: inputs as string[], grader });
    if (run.status === "timeout") return fail(408, "Your program ran for too long (20 seconds of computing). This attempt was counted.");
    if (run.status === "error") return fail(500, "The exam could not be graded. This attempt was counted.");

    const passed = run.score >= PASS_MARK;
    const { error } = await supabaseAdmin.from("exam_progress").upsert(
      {
        user_id: who.userId, course_slug: body.courseSlug, attempts_used: attempts, is_passed: passed || alreadyPassed,
        last_score: run.score, completed_at: passed ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,course_slug" },
    );
    if (error) throw error;
    return NextResponse.json({ success: true, score: run.score, is_passed: passed || alreadyPassed, attempts_used: attempts, report: run.report });
  } catch (error) {
    console.error("Exam grade failed:", error);
    return fail(500, "Failed to grade the exam");
  } finally {
    grading.delete(who.userId);
  }
}
