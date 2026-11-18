// lib/examAttempts.ts
// Server-only. Saves one row per exam submission (table exam_attempts, docs/testing/sql/step10-exam-attempts.sql) and sends the e-mails
// (lib/examMail.ts). Neither may ever fail or slow the grading: a missing table or a mail error is logged and the learner still gets
// the result. No mail is sent from a QA server (NEXT_PUBLIC_QA_FIXTURES=1), for the admin's own submissions, without the Gmail
// set-up, or past 150 attempts a day for the whole site (two mails each, well under Gmail's daily limit).
import "server-only";
import nodemailer from "nodemailer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { rateLimitAllows } from "@/lib/rateLimit";
import { buildExamMails, deliverExamMails, type ExamMailInput, type MailStatus, type Sender } from "@/lib/examMail";

const DAILY_CAP = 150;

export type AttemptRow = {
  userId: string; userName: string; userEmail: string | null; courseSlug: string; attemptNo: number; score: number; passed: boolean;
  code: string; notes: ExamMailInput["notes"];
};

/** Returns the saved row's id, or null when it could not be saved (the reason is logged). */
export async function saveAttempt(a: AttemptRow): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin.from("exam_attempts").insert({
      user_id: a.userId, user_name: a.userName, user_email: a.userEmail, course_slug: a.courseSlug, attempt_no: a.attemptNo,
      score: a.score, passed: a.passed, code: a.code, notes: a.notes,
    }).select("id").single();
    if (error) throw error;
    return data.id as string;
  } catch (e) {
    console.error("exam attempt not saved:", (e as Error).message?.slice(0, 120));
    return null;
  }
}

const gmailSender: Sender = async (m) => {
  const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.GMAIL_USER, pass: (process.env.GMAIL_APP_PASSWORD ?? "").replace(/\s+/g, "") } });
  await transporter.sendMail({ from: `Shivam Academy <${process.env.GMAIL_USER}>`, to: m.to, subject: m.subject, text: m.text, html: m.html, attachments: m.attachments });
};

/** Sends the learner's e-mail and the owner's copy, then stores their status on the saved row. Never throws. */
export async function mailAttempt(attemptId: string | null, input: ExamMailInput, opts: { isAdmin: boolean }): Promise<{ learner: MailStatus; owner: MailStatus }> {
  let statuses: { learner: MailStatus; owner: MailStatus } = { learner: "skipped", owner: "skipped" };
  try {
    const configured = !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD;
    const allowed = !opts.isAdmin && configured && process.env.NEXT_PUBLIC_QA_FIXTURES !== "1" && await rateLimitAllows("exam-mail:all", 86400, DAILY_CAP);
    statuses = await deliverExamMails(buildExamMails(input), { learner: input.learnerEmail, owner: process.env.GMAIL_USER ?? null }, gmailSender, allowed);
    if (attemptId) {
      const { error } = await supabaseAdmin.from("exam_attempts").update({ mail_learner: statuses.learner, mail_owner: statuses.owner }).eq("id", attemptId);
      if (error) throw error;
    }
  } catch (e) {
    console.error("exam attempt mail step failed:", (e as Error).message?.slice(0, 120));
  }
  return statuses;
}
