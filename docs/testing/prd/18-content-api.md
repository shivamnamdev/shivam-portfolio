# **Product Requirements Document (PRD)**

**Product Name:** TM – Digital Learning Experience Platform  
**Feature:** \[API\] Content API: curriculum of a cohort (phase 2 of the admin portal epic)  
**Prepared By:** Shivam Namdev & Claude Code  
**Date:** Nov 4, 2026  
**Status:** Built with the Blueprint approved on 2026-11-04 (`docs/architecture/admin-portal-phase2-content-api.md`)

---

## 1. Feature Overview
The admin can build and change the modules and lessons (videos, documents, assignments, resources) of a cohort through `/api/admin/v1/curriculum/**`, edit safely as a draft, publish, or discard the draft. Learners see nothing different yet (phase 5). Stored in `content_docs` (kind `curriculum`, key = cohort slug), no new table and no new SQL.

## 2. Business Objectives
* Safe editing: drafts never reach learners; publish and discard are explicit.
* No learner loses progress because a lesson was deleted.
* Nobody can add grading code or change what is an exam through the API.
* Every change is audited (summary only) and every write is rate limited and versioned.

## 3. Rules under test (blueprint section 5)
R1 unique lesson ids; R2 https links on allowed hosts only; R3 limits (60 modules, 200 lessons, 20 resources); R4 a lesson with learner progress cannot be removed; R5 an empty curriculum cannot be published; R6 exam flags are read-only through the generic lesson calls (amended 2026-11-14, approved: only `PUT /curriculum/{cohort}/exam` may change them, owner and admin keys, for a course with a grader in code; the lesson must be a video with an assignment file outside a locked module; one exam per course; removal refused with 409 once a learner has passed it; see `docs/architecture/exam-switch.md`). Unit `AAPI-UNIT-EXM-001..009`, API `AAPI-EXM-001..007` and `AIA-CRT-006`; R7 the cohort must exist, the first write creates the curriculum; R8 reorders must list every id exactly once.

## 4. Test coverage
**Unit (no DB, `tests/unit/admin-api-curriculum.spec.ts`, 17 tests):** `AAPI-UNIT-CUR-001` to `017` (ids, links, resources, bodies, uniqueness and limits, module and lesson operations, reorder rules, publish and discard, removed ids, protected flags, replace, stable ids, round trip on the real three courses, known junk reported, permissions).
**API (QA, `tests/api/admin-api-curriculum.spec.ts`, 7 tests):** `AAPI-CUR-001` to `007`. The generic access, 401 and 403, and the OpenAPI contract tests (`AAPI-AUTH-001/002`, `AAPI-OAS-002`) cover the new routes automatically.
Run all admin API tests: `npm run test:admin-api`.

## 5. Import of today's curricula
`POST /api/admin/v1/import/curriculum` (owner only, permission `import:run`) copies `data/learning-content.ts` into the tables. It is an endpoint, not a script, because the repo has no TypeScript runner and adding one needs the owner's approval. **Dry run by default** (`apply: true` writes). Repeatable: a second run says `unchanged`. A curriculum that an admin edited is reported as `differs` and left alone unless `overwrite: true`. Imported curricula are published (the files are what learners see today). Everything it does not copy is listed under `dropped` with the reason. Unit: `AAPI-UNIT-IMP-001` to `005`; API: `AAPI-IMP-001` to `003`. 

`POST /api/admin/v1/import/catalog` (same rules, owner only) copies the courses and cohorts of `data/courses.ts` (not the QA fixture): one course and one cohort per entry, same slug, published. Body `{ slugs?, apply?, overwrite? }`. Price strings become numbers, the links go under the cohort's `private` part, the pitch blocks go to the course, `format` (`live` or `recorded`) is copied. The report says per entry whether a link is set, never the link. Sales pages, prices and coupons keep reading the files until their own flags are switched. Unit: `AAPI-UNIT-CAT-001` to `010`; API: `AAPI-IMP-004` to `007`. Coupons are not imported.

## 5b. Not covered yet
* Learner portal reads (phase 5) and admin screens (phase 4).

## 6. Manual cases
`docs/testing/cases/prd18-content-api.csv`. Request bodies to paste: `docs/testing/admin-api-sample-requests.md` section 7.
