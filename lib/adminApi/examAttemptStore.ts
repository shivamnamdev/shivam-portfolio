// lib/adminApi/examAttemptStore.ts
// Database side of the read-only "Exam attempts" routes (SCP-115 part C). The list selects the code only to count its length and drops it
// before the answer is built. If the table has not been created yet (docs/testing/sql/step10-exam-attempts.sql) the list answers 424 with a
// message that names the file (the screen shows it), so an empty screen is never mistaken for "no attempts"; a single attempt is then "not found".
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ApiError, notFound, badRequest } from "./envelope";
import { likeSafe, type ListParams } from "./request";
import { examAttemptDetail, examAttemptRow, type DbExamAttempt, type ExamAttemptRow } from "./examAttempts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const examAttemptId = (s: string): string => { if (!UUID.test(s)) throw notFound("exam attempt not found"); return s.toLowerCase(); };
const COLS = "id, user_id, user_name, user_email, course_slug, attempt_no, score, passed, mail_learner, mail_owner, created_at";
const missingTable = (e: { code?: string } | null) => e?.code === "PGRST205" || e?.code === "42P01";

export async function listExamAttempts(p: ListParams, f: { cohortSlug: string | null; userId: string | null }): Promise<{ items: ExamAttemptRow[]; next: string | null }> {
  if (p.status && p.status !== "passed" && p.status !== "failed") throw badRequest("status must be passed or failed");
  let q = supabaseAdmin.from("exam_attempts").select(`${COLS}, code`).order("created_at", { ascending: false }).limit(p.limit + 1);
  if (f.cohortSlug) q = q.eq("course_slug", f.cohortSlug);
  if (f.userId) q = q.eq("user_id", f.userId);
  if (p.status) q = q.eq("passed", p.status === "passed");
  if (p.cursor) { if (Number.isNaN(Date.parse(p.cursor))) throw badRequest("cursor is not valid"); q = q.lt("created_at", p.cursor); }
  if (p.q) { const s = likeSafe(p.q); if (s) q = q.or(`user_name.ilike.%${s}%,user_email.ilike.%${s}%`); }
  const { data, error } = await q;
  if (error) {
    if (missingTable(error)) throw new ApiError(424, "not_set_up", "The exam attempts table has not been created on this database yet. Run docs/testing/sql/step10-exam-attempts.sql in Supabase, then reload.");
    throw error;
  }
  const rows = (data ?? []) as DbExamAttempt[];
  const page = rows.slice(0, p.limit);
  return { items: page.map(examAttemptRow), next: rows.length > p.limit ? page[page.length - 1].created_at : null };
}

export async function getExamAttempt(id: string) {
  const { data, error } = await supabaseAdmin.from("exam_attempts").select(`${COLS}, code, notes`).eq("id", id).maybeSingle();
  if (error && !missingTable(error)) throw error;
  if (!data) throw notFound("exam attempt not found");
  return examAttemptDetail(data as DbExamAttempt);
}
