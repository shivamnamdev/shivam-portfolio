# Marking the final exam in the portal (Blueprint, PROPOSED, awaiting owner approval)

Requested by the owner on 2026-11-14: "how to mark a particular video as exam, not assignment, I couldn't differentiate it" and, after the options were shown, "I want to make it through portal, so update R6 and ready the plan." Rule from CONSTITUTION §2: no implementation code until this is approved.

## 1. North Star

The owner marks which lesson is the final exam with one switch in the curriculum editor, sees it unmistakably on the row and in the preview, and never has to edit `data/learning-content.ts` or re-import (which would overwrite portal edits).

## 2. Rule R6, amended

Phase 2 (`admin-portal-phase2-content-api.md`) said: `isExam` and `serverGraded` cannot be set through the API. **New R6 (2026-11-14):**

- `isExam`, `serverGraded` and `expectedOutcomeUrl` still **cannot be set through the generic lesson endpoints** (`PATCH /lessons/{id}`, `PUT` of the whole curriculum). Those keep refusing them, so no ordinary save can create or move an exam by accident.
- They can be changed only through one dedicated owner-or-admin call, `PUT /api/admin/v1/curriculum/{cohort}/exam`, which enforces the rules in section 4.
- The grader itself stays in code (`lib/examGraders.ts`, reviewed in git, runs on the server). The portal can only mark an exam for a course that **already has a grader**. Writing a grader for a new course remains a code change.
- The import (`allowProtected`) is unchanged: it copies the flags from the files and never overwrites an edited curriculum without `overwrite`.

Why this is safe: the grader is keyed by **course slug**, not by video (`EXAM_GRADERS[slug]`; the grade route answers "This course has no exam" without one). Which video carries the exam is only the flag, and the learner's pass state (`exam_progress`) is keyed by slug too, so moving the flag to another video loses nobody's result.

## 3. Data shapes

Request `PUT /curriculum/{cohort}/exam` (needs `If-Match` like every curriculum write):
`{ lessonId: string | null, expectedOutcomeUrl?: string }`. `lessonId` makes that lesson the exam; `null` removes the exam. `expectedOutcomeUrl` is an `https://raw.githubusercontent.com/…` link (empty allowed).

Response: the whole updated curriculum (as the other curriculum calls), plus on the read call `GET /curriculum/{cohort}` a new boolean `examGrader` (does the course have a grader in code). No new stored field: `assignment.isExam`, `serverGraded`, `expectedOutcomeUrl` already exist. No SQL, no new package.

## 4. Rules (server, unit-tested)

1. **E1** The course must have a grader in code, else 422 "This course has no exam grader yet. A grader has to be added in the code first." (`examGraderExists(slug)`, pure and unit-tested.)
2. **E2** The lesson must exist in the working copy, be a **video** (not a `doc-` lesson) and already have an **assignment with an assignment file** (`rawUrl`), else 422 "Add the assignment file first".
3. **E3** The lesson must not sit in a module marked "Locked until the exam is passed" (the exam would be unreachable), else 422.
4. **E4** At most one exam per course: setting it on a lesson **clears** `isExam`, `serverGraded` and `expectedOutcomeUrl` on the previous exam lesson, which stays an ordinary assignment. Setting it on the lesson that already holds it only updates `expectedOutcomeUrl`.
5. **E5** Setting sets `isExam: true` and `serverGraded: true` (the only grading there is).
6. **E6** Removing (`lessonId: null`) is refused with 409 when any learner has passed the exam (`exam_progress.is_passed`), since their advanced lessons are unlocked by it; the message gives the count. Moving the flag to another lesson is always allowed.
7. Same envelope as the other writes: `If-Match` (428/409), write rate limit, audit entry `update curriculum` with before and after lesson ids (never code or links).

## 5. UI

- **Edit lesson panel:** a switch **"This lesson is the final exam"** under the assignment (video lessons with an assignment file only), with the *Expected result* link box beside it. Disabled with the reason when the course has no grader (E1), when the lesson is a document, has no assignment file, or sits in a locked module. When another lesson is the exam, the switch says "Moves the exam from *<lesson>*".
- **Unmistakable:** the row badge, the preview and the exam card use a purple **"🏆 Final exam"** (matching the learner page), not the blue "Assignment" pill. The panel header reads "Final exam".
- **Exam card:** unchanged, plus a hint "Open any lesson with an assignment to make it the exam".
- The old text "set in the repository and cannot be changed or removed here" is replaced.

## 6. Build order (unit tests before the next layer)

1. `examGraderExists` and the pure `setExam(modules, lessonId, expectedOutcomeUrl)` / `clearExam(modules)` in `lib/adminApi/curriculum.ts` with unit tests `AAPI-UNIT-EXM-*` (E1 to E6, the generic endpoints still refuse the flags, the import still keeps them, the real Python exam round trips).
2. The route, `examGrader` on the read response, OpenAPI entry, API tests on QA `AAPI-EXM-*` (set, move, clear, refusals, passed learner blocks clear, admin allowed, anonymous refused).
3. UI: switch, purple badge, preview, card; helper tests `ADMUI-UNIT-CUR-*`; UI tests `ADMUI-CUR-013..` on QA.
4. Learner check with `PORTAL_LEARNING=database`: a lesson marked in the portal shows "🏆 Final Exam" and the exam flow still grades (existing `LRN-EXM-*` suite).
5. Docs: R6 in phase 2 text (done in this change), PRD 18 and PRD 20, OpenAPI, changelog, constitution log.

## 7. Risks

- Moving the exam while learners are mid-exam: they see the exam on the new lesson on the next published copy (60 s cache); their attempts and pass state are unaffected (keyed by slug).
- A course without a grader can show no exam switch: intended (E1); the card explains why.
- Publish still gates what learners see: an exam marked in the working copy is invisible to them until the curriculum is published.

## 8. Owner decisions pending

1. Approve this Blueprint (it changes rule R6).
2. Who may mark the exam: **owner and admin** (as proposed) or owner only?
3. Removing the exam once a learner has passed it: **refuse** (as proposed) or allow with a warning?
