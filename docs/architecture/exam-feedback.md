# Exam result, improvement note, e-mails and admin view (SCP-115) — approved 2026-11-18 (rule-based notes, three pull requests, owner copy to the site mailbox)

## 1. North Star
After every final-exam submission the learner sees how they did and what to improve, gets the same by e-mail, and the owner sees it by e-mail and in the admin portal.

## 2. Today
`POST /api/learning/exam-grade` runs the grader and stores only `attempts_used`, `is_passed`, `last_score` in `exam_progress`. The learner sees a toast and the grader's text report in the output panel. The submitted code is not stored, nobody is e-mailed, the admin portal shows nothing about exam attempts. Mail is sent with nodemailer through the site Gmail account (`GMAIL_USER`, `GMAIL_APP_PASSWORD`).

## 3. Proposed behaviour
1. **Result card** (learner screen, after Submit): "Passing score: 80%", the score, attempts used and left.
   - 80 or more: green card, celebration (CSS confetti, no package), "Exam passed" and what it unlocked.
   - Less than 80: red card, a motivational note (a few lines, rotated), attempts left; when none are left, say so.
2. **Your code and improvement note** (same card): the submitted code, read only, and one line per question: passed, or what to improve. The notes are written by the grader from the checks it already makes (rule-based, no AI), for example "Q3: check the department averages and every final payslip (gross, deductions, net, band)". They are hints per question, not a line-by-line code review.
3. **E-mail to the learner after every submission** (to the account's primary e-mail): subject with the score, body with passed or not, the score, attempts left when not passed, the improvement note; attachments `exam-attempt-<n>.py` (the code) and `exam-attempt-<n>-improvement-note.txt`. A failed send never fails the grading and never uses an attempt.
4. **E-mail to the owner** with the same content plus learner name and e-mail (to `GMAIL_USER`, the site mailbox).
5. **Admin portal**: Submissions screen gets an "Exam attempts" list (learner, course, attempt, score, passed, date); opening one shows the code (as text, one at a time) and the improvement note. Read only. API `GET /api/admin/v1/exam-attempts` and `/{id}` (owner and admin keys), documented in OpenAPI.

## 4. Data shapes
New table `exam_attempts` (SQL in `docs/testing/sql/step10-exam-attempts.sql`, run by the owner; RLS on, service role only, rollback included):
`id uuid`, `user_id text`, `user_name text`, `user_email text`, `course_slug text`, `attempt_no int`, `score int`, `passed boolean`, `code text` (max 200,000 characters, as today), `notes jsonb` (`[{ q, label, passed, note }]`), `created_at timestamptz`, `mail_learner text` (`sent|failed|skipped`), `mail_owner text`. Unique `user_id + course_slug + attempt_no`. Index `created_at desc`.
Grader output: one extra line `EXAM_FEEDBACK:<json>` before `EXAM_SCORE:`; `lib/runExam.ts` parses it into `notes` (a missing or broken line gives an empty list, never an error).
`exam-grade` response gains `notes` and `attempts_left`; nothing is removed.

## 5. Rules (unit-tested in `tests/unit/`)
- Result colour and text depend only on `score >= 80` (one function, `lib/examResult.ts`, with the motivational lines and the attempts-left text).
- E-mail text is built by a pure function (`lib/examMail.ts`): all learner-supplied text is escaped in HTML; the code goes only as an attachment, never in the HTML body; file names are fixed patterns.
- Mail is sent after the result is saved; a failure is stored as `failed` and logged, not thrown. No mail without the Gmail variables (stored as `skipped`).
- Volume is bounded by the 5 attempts per learner and course; plus a site-wide cap (300 mails a day, via `rate_limits`); over the cap the mail is `skipped` and the attempt still saves.
- The admin user submitting an exam is saved but not mailed to the learner address.
- Privacy: the code goes only to the learner's own address, the owner's mailbox and the database; no third party beyond the Gmail SMTP already used for the site.

## 6. Delivery in three pull requests (each with tests and docs)
A. Grader feedback notes + result card + submitted code and notes on screen (no SQL).
B. `exam_attempts` table + saving + e-mails to learner and owner (SQL, needs the owner to run it).
C. Admin API and the "Exam attempts" screen.

## 7. Risks and open points
- Notes are generic hints per question until a model-assisted review is approved (see `exam-library.md` sections 9 and 10; provider, retention and consent notice still open).
- Gmail daily sending limits (about 500 a day for a personal account): the 300-a-day site cap keeps well below.
- Stored code is learner data: retention is not limited by this change (decide if old attempts should be deleted after a period).

## 8. Decisions needed
A. Improvement note: rule-based hints per question (recommended, built now), or AI-written (separate approval, privacy notice first)?
B. Three pull requests as in section 6 (recommended), or one?
C. Owner copy to the site mailbox (`GMAIL_USER`) or to another address?

## 9. Pull request A as built (2026-11-18)
- `lib/examGraderBatch1.ts` prints `EXAM_FEEDBACK:<json>` (a note per question); `lib/examNotes.ts` reads it (`splitFeedback`, capped at 20 notes of 600 characters, a broken line gives no notes) and `lib/runExam.ts` returns `notes` and strips the line from the report. `notesAsText` is the text used later for the attachment and the admin view.
- `lib/examResult.ts`: `PASS_MARK` (80), `MAX_ATTEMPTS` (5), `examResultView` (tone, title, motivational message by attempt, attempts left). `exam-grade` now answers with `attempts_left` and `notes` as well (nothing removed).
- `components/learning/ExamResultModal.tsx`: result window with the passing score, the score, green with a falling-confetti celebration (framer-motion, off for reduced motion) at 80 or more, red with the motivational note below, one note per question and the submitted code (shown as text). The existing toast stays.
- Tests: `EXR-UNIT-001..007`, `EXGB-UNIT-010`, `LRNA-EXG-012`, `LRN-EXM-013` (red window, five notes, code, Escape closes), `LRN-EXM-014` (green window with the celebration; the grader answer is simulated because a real pass needs the full solution).
- Not in this PR: saving the attempt, the e-mails, the admin portal view (B and C).

## 10. Pull request B as built (2026-11-18)
- `docs/testing/sql/step10-exam-attempts.sql`: table `exam_attempts` (section 4 of this document), RLS on, rollback included. **The owner runs it on QA, then production.**
- `lib/examAttempts.ts`: `saveAttempt` (insert; a missing table is logged "exam attempt not saved" and never fails the grading) and `mailAttempt`. `exam-grade` saves the row before it answers and sends the mails in `after()` (Next 16), so the learner does not wait for them.
- `lib/examMail.ts` (pure, unit-tested): the learner mail (subject with the score and the attempts left, passing score, result, improvement note, attachments `exam-attempt-<n>.py` and `exam-attempt-<n>-improvement-note.txt`) and the owner copy (adds name, e-mail, course, attempt). HTML is escaped, the code is only an attachment, a failing send is `failed` and never thrown.
- No mail from a QA server (`NEXT_PUBLIC_QA_FIXTURES=1`), for the admin's own submissions, without `GMAIL_USER` and `GMAIL_APP_PASSWORD`, or past 150 submissions a day for the whole site (`rate_limits` key `exam-mail:all`); the row then says `skipped`. The learner's address is the Clerk primary e-mail; the owner copy goes to `GMAIL_USER`.
- Tests: `EXM-UNIT-001..005`; `LRNA-EXG-013` (saved rows, mail `skipped` on a QA server) skips until the SQL file has been run on the QA project. The real Gmail send with attachments is not covered by an automated test (it would mail real people): check it with one real submission on a server without `NEXT_PUBLIC_QA_FIXTURES`.
