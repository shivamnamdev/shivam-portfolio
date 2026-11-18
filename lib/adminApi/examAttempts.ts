// lib/adminApi/examAttempts.ts
// Pure row shapes of the read-only "Exam attempts" admin routes (SCP-115 part C). A list row never carries the code or the notes; the
// single-attempt route adds them. The database side is examAttemptStore.ts.
import { cleanNotes, notesAsText, type ExamNote } from "@/lib/examNotes";
import { PASS_MARK } from "@/lib/examResult";

export type DbExamAttempt = {
  id: string; user_id: string; user_name: string | null; user_email: string | null; course_slug: string; attempt_no: number; score: number; passed: boolean;
  code?: string | null; notes?: unknown; mail_learner: string; mail_owner: string; created_at: string;
};
export type ExamAttemptRow = {
  id: string; userId: string; name: string; email: string | null; cohortSlug: string; attemptNo: number; score: number; passed: boolean;
  createdAt: string; codeLength: number; mailLearner: string; mailOwner: string;
};
const MAIL = new Set(["pending", "sent", "failed", "skipped"]);
const mail = (s: string) => (MAIL.has(s) ? s : "pending");

export function examAttemptRow(r: DbExamAttempt): ExamAttemptRow {
  return {
    id: r.id, userId: r.user_id, name: r.user_name?.trim() || r.user_email || r.user_id, email: r.user_email, cohortSlug: r.course_slug, attemptNo: r.attempt_no,
    score: r.score, passed: r.passed, createdAt: r.created_at, codeLength: (r.code ?? "").length, mailLearner: mail(r.mail_learner), mailOwner: mail(r.mail_owner),
  };
}

/** The one place an attempt carries its code: the single-attempt route. `notesText` is the same improvement note the learner was e-mailed. */
export function examAttemptDetail(r: DbExamAttempt): ExamAttemptRow & { code: string; notes: ExamNote[]; notesText: string; passMark: number } {
  const notes = cleanNotes(r.notes);
  return { ...examAttemptRow({ ...r, code: r.code ?? "" }), code: r.code ?? "", notes, notesText: notesAsText(notes, r.score, PASS_MARK), passMark: PASS_MARK };
}
