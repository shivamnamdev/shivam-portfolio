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
R1 unique lesson ids; R2 https links on allowed hosts only; R3 limits (60 modules, 200 lessons, 20 resources); R4 a lesson with learner progress cannot be removed; R5 an empty curriculum cannot be published; R6 exam flags are read-only; R7 the cohort must exist, the first write creates the curriculum; R8 reorders must list every id exactly once.

## 4. Test coverage
**Unit (no DB, `tests/unit/admin-api-curriculum.spec.ts`, 17 tests):** `AAPI-UNIT-CUR-001` to `017` (ids, links, resources, bodies, uniqueness and limits, module and lesson operations, reorder rules, publish and discard, removed ids, protected flags, replace, stable ids, round trip on the real three courses, known junk reported, permissions).
**API (QA, `tests/api/admin-api-curriculum.spec.ts`, 7 tests):** `AAPI-CUR-001` to `007`. The generic access, 401 and 403, and the OpenAPI contract tests (`AAPI-AUTH-001/002`, `AAPI-OAS-002`) cover the new routes automatically.
Run all admin API tests: `npm run test:admin-api`.

## 5. Not covered yet
* The import script that copies today's `data/learning-content.ts` into the tables (next step; its conversion code is already unit-tested).
* Learner portal reads (phase 5) and admin screens (phase 4).

## 6. Manual cases
`docs/testing/cases/prd18-content-api.csv`. Request bodies to paste: `docs/testing/admin-api-sample-requests.md` section 7.
