# Curriculum editor parity with the data files (Blueprint, PROPOSED, awaiting owner approval)

Requested by the owner on 2026-11-14 after checking the imported curricula in the portal against `data/learning-content.ts`. Rule from CONSTITUTION §2: no implementation code until this is approved.

## 1. North Star

Everything the owner used to write by hand in `data/learning-content.ts` can be done in the curriculum editor, in plain words, without knowing the field names: add a video or a document, attach the assignment and solution files, the starter code, the "continue from the previous code" switch, the git lab files, and extra materials. Video rows show the YouTube title and thumbnail so the owner recognises them. The final exam is visible at a glance.

## 2. Findings (2026-11-14)

| # | In the data file | Editor today | Change |
|---|---|---|---|
| 1 | Document lesson (`doc-…` id, title, description, file link, type) | Possible only by typing a `doc-` id, then editing title and description, then adding a resource. Nothing says the first resource is the document. | **Add a document** path in the add form: title, link, type. Id generated from the title. |
| 2 | Git lab `solutionUrl` (both Git days have one) | **Missing from the git lab form; saving a git lesson drops it.** | Add the field. Bug. |
| 3–6 | `rawUrl`, `solutionUrl`, `starterCodeUrl`, `carryOverCode`, `instructionsUrl`, `starterRepoUrl`, `expectedStateUrl`, `validatorUrl` | Present inside Edit lesson, labelled with the raw field names. | Plain-language labels and one-line hints; carry-over worded "Continue from the previous assignment's code". |
| 7 | Materials on a video (`resources`) | Present ("Resources"). | None. |
| 8 | Advanced module | Present (checkbox). | None. |
| 9 | Final exam (`isExam`, `serverGraded`, `expectedOutcomeUrl`) | Row badge "Exam"; the panel says the exam is fixed in the repository (rule R6 of phase 2). | **Exam card** at the top of the cohort's curriculum: which lesson is the exam, its files, what the grader checks; links to the row. Stays read-only (section 4.4). |
| 10 | Video title, description, thumbnail (the learner page reads them from YouTube) | Not shown; rows read "Video <id>". | **Show them in the editor**, read from YouTube in the browser, like the learner page. Not stored. |
| 11 | Commented-out video ids | No per-lesson hide; delete the lesson instead. | Not in this slice. |

Owner confirmations (2026-11-14): "continued assignment" = `carryOverCode`; the exam must be listed in the portal; the YouTube title, description and thumbnail must be visible in the portal.

## 3. Design

**3.1 Add a lesson (page).** The add form gets a switch: *Video* (today's YouTube link or id box) or *Document* (title, file link, type PDF or Document, description optional). A document is created as a `doc-<slug-of-title>` lesson with `title`, `description` and one resource `{ title, url, type }`, in one `POST /lessons` call (the API already accepts all of it). The id is checked against the lessons already in the course and gets a numeric suffix on a clash. The raw id box stays available under "Advanced: type an id".

**3.2 Edit lesson (LessonPanel).**
- Labels become: *Assignment file*, *Solution file*, *Starter code / add-on file* (Python); *Instructions*, *Starter repository (.json)*, *Expected state (.json)*, *Validator (.json)*, *Solution* (Git). Each has a hint "raw.githubusercontent.com link".
- `GIT_FIELDS` gains `solutionUrl`. `formToAssignment` therefore sends it for git labs. A unit test round-trips a git assignment with every field (the fix for finding 2).
- Carry-over checkbox reads "Continue from the previous assignment's code (the editor opens with it)".
- Document lesson: the panel shows *Document file* (title, link, type) as the first and only resource, plus "Extra materials" for the rest, so the owner never has to know which resource is the document.

**3.3 Video details from YouTube (read only).** The page fetches `snippet(title, description, thumbnails)` for the video ids of the cohort in one request per 50 ids with `NEXT_PUBLIC_YOUTUBE_API_KEY`, the same call the learner page makes. Rows show the thumbnail (`mqdefault`), the YouTube title and the duration; the panel shows the description. Nothing is stored and nothing goes through the admin API. When the key is missing or the call fails, rows fall back to today's label and a one-line note says "YouTube details unavailable". The learner keeps reading titles from YouTube, so the portal `title` remains an admin-only label and is described as such in the panel.

**3.4 Exam card.** Above the module list, when any lesson has `assignment.isExam`: "Final exam: <lesson label> in <module>", with the exam file, add-on file and expected result as links (read only) and a "Go to lesson" button that opens the row. When no lesson is an exam the card says the course has no exam. Rule R6 stands: `isExam`, `serverGraded` and `expectedOutcomeUrl` cannot be set or moved through the portal, because the grader for each exam is server code in `lib/examGraders.ts` and is reviewed in git. Making a new exam is a code change plus a curriculum import; the card says so in one line.

## 4. Data shapes

No new document fields. `POST /lessons` body for a document: `{ id: "doc-<slug>", title, description?, resources: [{ title, url, type: "PDF" | "Document" }] }` (existing shape). `PATCH /lessons/{id}` for a git lab now carries `solutionUrl` (existing optional field). YouTube read: `GET https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=…` from the browser; nothing stored.

## 5. Build order (unit tests before the next layer)

1. `lib/adminUi/curriculum.ts`: `GIT_FIELDS` + `solutionUrl`, `FIELD_LABELS`, `documentLessonBody(title, url, type, description, existingIds)`, `examOf(modules)`; unit tests (`AUI-CUR-*`): git round trip keeps every field, labels cover every field, document id slug and clash suffix, exam lookup.
2. `LessonPanel`: labels and hints, document file block, carry-over wording.
3. Page: Video / Document add switch, exam card, YouTube details with fallback.
4. UI tests on QA (`ADM-CUR-*`): add a document in two fields and see it in the preview; edit a git lab and confirm the solution link survives a save; the exam card names the python-beginners exam; rows show YouTube titles when the key is set (mocked in the test like the learner suite does).
5. Docs: PRD 20 (admin UI) cases, `docs/testing/CHANGELOG.md`, constitution log.

No SQL, no new package, no new environment variable.

## 6. Risks

- YouTube quota: one request per 50 videos per page view, same as the learner page; no retries.
- A raw-id power user still can; the Document path only adds a shorter way.
- The git `solutionUrl` fix changes what a save sends; the API already accepts it, so nothing else moves.

## 7. Owner decisions pending

1. Approve this Blueprint.
2. Exam stays read-only in the portal (3.4), with the card making it visible — yes, or do you want to choose the exam lesson in the portal (needs a grader-in-code rule rethink)?
3. Hidden-lesson toggle (finding 11): leave out for now — yes?
