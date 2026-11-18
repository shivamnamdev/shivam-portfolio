// lib/examMail.ts
// The e-mails sent after every exam submission (SCP-115 part B): one to the learner, one copy to the owner. Pure: it builds the messages
// and hands them to an injected sender, so the text, the escaping and the failure handling are unit-tested without a mail server.
// Rules: every value that came from a person is escaped in the HTML; the code goes only as an attachment, never into the body; the
// attachment names are fixed patterns; a failing send is reported as "failed", never thrown.
import { escapeHtml } from "./escapeHtml";
import { notesAsText, type ExamNote } from "./examNotes";
import { PASS_MARK, MAX_ATTEMPTS } from "./examResult";

export type ExamMailInput = {
  learnerName: string; learnerEmail: string | null; courseTitle: string; courseSlug: string;
  attemptNo: number; score: number; passed: boolean;   // `passed`: this attempt reached the passing score
  alreadyPassed: boolean;                              // an earlier attempt passed
  attemptsLeft: number; notes: ExamNote[]; code: string;
};
export type MailMessage = { subject: string; text: string; html: string; attachments: Array<{ filename: string; content: string }> };
export type ExamMails = { learner: MailMessage; owner: MailMessage };
export type MailStatus = "sent" | "failed" | "skipped";

const clean = (s: string) => s.replace(/[\r\n]+/g, " ").slice(0, 100);

function body(i: ExamMailInput, forOwner: boolean): { text: string; html: string } {
  const verdict = i.passed ? `PASSED (passing score ${PASS_MARK}%)` : `not passed yet (passing score ${PASS_MARK}%)`;
  const left = i.passed || i.alreadyPassed ? "" : i.attemptsLeft > 0 ? `Attempts left: ${i.attemptsLeft} of ${MAX_ATTEMPTS}.` : `No attempts left (${MAX_ATTEMPTS} of ${MAX_ATTEMPTS} used).`;
  const intro = forOwner
    ? `${i.learnerName} (${i.learnerEmail ?? "no e-mail"}) submitted attempt ${i.attemptNo} of the exam in ${i.courseTitle}.`
    : `Hi ${i.learnerName}, here is the result of your exam attempt ${i.attemptNo} in ${i.courseTitle}.`;
  const text = [
    intro, "", `Score: ${i.score}%`, `Result: ${verdict}`, left, "",
    "Improvement note:", notesAsText(i.notes, i.score, PASS_MARK).trim(), "",
    "Your submitted code and the improvement note are attached to this e-mail.",
  ].filter((l, idx, a) => !(l === "" && a[idx - 1] === "")).join("\n");
  const colour = i.passed ? "#15803d" : "#b91c1c";
  const rows = i.notes.map((n) => `<li style="margin:6px 0"><strong style="color:${n.passed ? "#15803d" : "#b91c1c"}">${n.passed ? "OK" : "Improve"}</strong> · ${escapeHtml(n.label)}: ${escapeHtml(n.note)}</li>`).join("");
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#222;max-width:600px">
<h2 style="color:${colour};margin:0 0 8px">${i.passed ? "🎉 " : ""}Exam attempt ${i.attemptNo}: ${i.score}%</h2>
<p>${escapeHtml(intro)}</p>
<p><strong>Result:</strong> <span style="color:${colour}">${escapeHtml(verdict)}</span><br>${left ? `<strong>${escapeHtml(left)}</strong>` : ""}</p>
<h3 style="margin:16px 0 4px">Improvement note</h3><ul style="padding-left:18px">${rows || "<li>No per-question notes were produced for this attempt.</li>"}</ul>
<p style="color:#555">Your submitted code and the improvement note are attached.</p></div>`;
  return { text, html };
}

export function buildExamMails(i: ExamMailInput): ExamMails {
  const attachments = [
    { filename: `exam-attempt-${i.attemptNo}.py`, content: i.code },
    { filename: `exam-attempt-${i.attemptNo}-improvement-note.txt`, content: notesAsText(i.notes, i.score, PASS_MARK) },
  ];
  const state = i.passed ? "passed" : i.alreadyPassed ? "below passing score" : i.attemptsLeft > 0 ? `${i.attemptsLeft} attempt${i.attemptsLeft === 1 ? "" : "s"} left` : "no attempts left";
  return {
    learner: { subject: `Your exam result: ${i.score}% (${state})`, ...body(i, false), attachments },
    owner: { subject: `[Exam] ${clean(i.learnerName)} scored ${i.score}% (attempt ${i.attemptNo}/${MAX_ATTEMPTS}) - ${clean(i.courseTitle)}`, ...body(i, true), attachments },
  };
}

export type Sender = (m: MailMessage & { to: string }) => Promise<void>;

/** Sends both messages. `enabled: false` (no mail set-up, a QA server, the admin, the daily cap) skips both. Never throws. */
export async function deliverExamMails(
  mails: ExamMails, to: { learner: string | null; owner: string | null }, send: Sender, enabled: boolean,
): Promise<{ learner: MailStatus; owner: MailStatus }> {
  const one = async (m: MailMessage, address: string | null): Promise<MailStatus> => {
    if (!enabled || !address) return "skipped";
    try { await send({ ...m, to: address }); return "sent"; } catch (e) { console.error("exam mail failed:", (e as Error).message?.slice(0, 120)); return "failed"; }
  };
  const [learner, owner] = await Promise.all([one(mails.learner, to.learner), one(mails.owner, to.owner)]);
  return { learner, owner };
}
