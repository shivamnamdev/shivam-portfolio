# Exam library: reuse an exam from another course, or create a new one (Blueprint, PROPOSED 2026-11-16)

Requested by the owner on 2026-11-16: "there must be an option to utilize existing exams from other courses or create a new one." Rule from CONSTITUTION §2: no implementation code until approved.

## 1. North Star
On the exam switch of any course the owner can pick **which exam** it is: one that already exists (for example the Python Batch 1 exam) or a new one, without a code change for the reuse case.

## 2. Today
- A grader is a Python script in `lib/examGraders.ts`, `EXAM_GRADERS[courseSlug]`; only `python-beginners` has one. It runs on the server in a sandbox (`lib/runExam.ts`) and never reaches a browser.
- Which exam a course uses is its slug; a learner's result (`exam_progress`) is keyed by `(user_id, course_slug)`.
- The portal can mark the exam lesson only for a course whose slug has a grader (rule E1, `exam-switch.md`).

## 3. Proposed design (two steps, each shipped separately)

**Step 1: reuse (small, no SQL).**
- Give each grader an **exam id** (first one: `python-batch-1-final`). `EXAM_GRADERS` becomes keyed by exam id; a small map `COURSE_EXAM[courseSlug] = examId` keeps `python-beginners` working unchanged.
- New optional field on the stored cohort (jsonb, no SQL): `examId`. Rule E1 becomes: the course has an `examId` that exists in code.
- Exam switch panel: a dropdown "Which exam?" listing the exams in the library (name, number of questions), shown when the lesson is marked as the exam. Choosing one sets `examId`; `exam-grade` looks it up by the course's `examId`.
- Results stay per course (`exam_progress` keyed by course slug), so Python Foundation learners have their own attempts and pass state even when they take the same exam as Batch 1. Pass rule, attempts limit and certificate rule are unchanged.
- Reusing an exam means reusing its questions: the exam lesson should point to the same exam document. The panel says so.

**Step 2: create a new exam (needs a decision, section 4).** Not in step 1.

## 4. Decision needed for step 2 (the owner chooses)
A grader is code that runs on the server. Authoring one in the portal means an admin writes code that the server executes. Options:
- **A. In the repository (today).** A new exam is a code change and review, then it appears in the library. Safest, no portal work. Needs a developer (or me) per new exam.
- **B. Declarative exam in the portal.** Questions with checks the portal can express (expected output contains / matches, a function returns X for inputs Y), stored as data and graded by one fixed grader. No admin-written code; limited to the kinds of checks we define. Medium build, no SQL if stored like other content.
- **C. Python grader written in the portal, owner only.** Most flexible, same power as today's graders, but stores code that the server runs; owner only, sandboxed, versioned, audited, and it needs a test-run button. Largest build and the largest risk.

Recommendation: ship step 1 now; for step 2 choose **B** if the owner will write many simple exams, otherwise stay on **A**. C only if graders as rich as the Python Batch 1 one must be written without a developer.

## 5. Data shapes
- Cohort document: `examId?: string` (matches an id in `lib/examGraders.ts`).
- `GET /curriculum/{cohort}`: `examGrader: boolean` stays; adds `examId: string | null` and `exams: Array<{ id, title, questions }>` (library list, no answers).
- `PUT /curriculum/{cohort}/exam`: body gains `examId?: string`; refused (422) when it is not in the library.
- `POST /api/learning/exam-grade` unchanged for the client; the server resolves the grader through the course's `examId`.

## 6. Rules and tests (unit first)
1. X1 Unknown `examId` refused. X2 Marking an exam lesson needs an `examId` (or the existing slug mapping). X3 Changing `examId` after any learner passed is refused with a count (their pass was on the old exam); moving the lesson is still allowed. X4 `python-beginners` keeps working with no data change.
2. Unit tests `AAPI-UNIT-EXL-*` (lookup, refusals, back-compat), API tests on QA, UI tests for the dropdown, learner check that Python Foundation grades with the shared exam and keeps separate results.

## 7. Risks
- Same exam, different courses: answers are shared knowledge between cohorts; acceptable for the owner's use, noted.
- Changing the exam after learners have attempts: covered by X3.

## 8. Open questions for the owner
1. Approve step 1 as written?
2. Step 2: A, B or C?
3. Should Python Foundation use the Python Batch 1 exam right away (first use of step 1)?
