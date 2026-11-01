# **Product Requirements Document (PRD)**

**Product Name:** TM – Digital Learning Experience Platform  
**Feature:** \[DB\] Database Integrity Testing (Supabase)  
**Prepared By:** Shivam Namdev & Claude Code  
**Date:** Oct 30, 2026  
**Status:** PRD draft — written from `docs/DATABASE.md`, `docs/SUPABASE_HARDENING.md` and the live QA schema

---

## 1. Feature Overview

All persistent data lives in Supabase (Postgres, accessed through PostgREST): `user_enrollments`, `video_progress`, `assignment_progress`, `exam_progress`, `video_comments`, `user_stats`, `admin_activity_log` (plus unused `cms_courses`, `cms_curriculum`, `cms_coupons`). Server routes write with the service-role key (`lib/supabaseAdmin.ts`); the browser reads and writes most tables with the public anon key (`lib/supabaseClient.ts`). This PRD checks the **database itself**: schema, constraints, what the anon key may do, and the quality of the data. UI and API behaviour on top of it are in PRDs 01–13.

## 2. Business Objectives

* An enrolment is the only thing that unlocks a course, so nobody but the server may create, change or delete one.
* No learner can read another learner's personal data or code.
* Duplicates and orphans cannot appear; defaults and required fields hold.

## 3. Scope

**In scope:** table and column presence, keys, defaults, NOT NULL, unique constraints, upsert behaviour, what the anon key can read and write, data quality, text round trips. **Out of scope:** the application logic that uses the tables (PRDs 04–13), query speed (PRD 15), backup and restore, migrations, the unused `cms_*` tables (listed as a risk).

## 4. Data Model (as found in the QA project)

| Table | Key | Unique rule expected | Required | Notes |
| --- | --- | --- | --- | --- |
| `user_enrollments` | uuid `id` | (user_id, course_slug) — **missing** | user_id, course_slug | `enrolled_at` default now (UTC); `coupon_used`, `user_name`, `user_email` optional |
| `video_progress` | uuid `id` | (user_id, course_slug, video_id) | those three | `completed_at` default now |
| `assignment_progress` | uuid `id` | (user_id, course_slug, video_id) | those three | `submitted_code`, `user_name` |
| `exam_progress` | uuid `id` | (user_id, course_slug) | those two | attempts 0, passed false, score 0 |
| `user_stats` | `user_id` | primary key | user_id, user_name | streak 1, points 0, time 0, date today |
| `video_comments` | uuid `id` | — | video_id, user_id, user_name, content | |
| `admin_activity_log` | uuid `id` | — | type, message | `is_read` default false |
| `video_likes` | — | — | — | **does not exist**, but the course page queries it (SCP-49) |

## 5. Functional Requirements

| ID | Requirement |
| --- | --- |
| FR1 | Every table in the model exists with exactly the documented columns. |
| FR2 | Ids are generated uuids; `user_stats` is keyed by user. |
| FR3 | Required columns refuse NULL; defaults apply. |
| FR4 | Progress, assignment, exam and stats rows are unique per their natural key; upserts are idempotent. |
| FR5 | An enrolment is unique per learner and course (hardening step 1). |
| FR6 | The anon key cannot insert, change or delete enrolments (hardening step 2). |
| FR7 | The anon key cannot read other learners' enrolments, submitted code or e-mail addresses. |
| FR8 | The anon key cannot forge activity-log entries, change another learner's points or post as another user. |
| FR9 | No duplicate or unknown-course enrolments; no placeholder identities. |
| FR10 | Test runs leave no rows behind; persona state is the seeded state. |
| FR11 | Text of any content round-trips unchanged and is never executed as SQL. |
| FR12 | Row level security is on for every table and the policies and grants say what the runbook intends (manual SQL inventory). |
| FR13 | The unique constraints and the indexes the application relies on exist. |
| FR14 | Backups exist and a restore has been tried; the QA project matches production; a learner's data can be deleted completely. |

## 6. Test Coverage Matrix

44 cases (28 automated plus a 16-case manual policy inventory) in [the workbook](../workbooks/%5BDB%5D%20Database%20Integrity%20Testing.xlsx) (ids `DBI-…`) and [`cases/prd14-database.csv`](../cases/prd14-database.csv). Automation: `tests/db/db-integrity.spec.ts` (assertions through the service role; access cases through the anon key).

### 6.1 Policy inventory (manual, `DBI-POL-001` to `016`)

The live policies, grants and indexes cannot be read through the REST API, so these cases are run by the owner in the Supabase SQL editor with read-only `SELECT` statements (the exact SQL is in each case of the workbook sheet *Policy Inventory (manual)*): RLS flags, policy list, grants for `anon`/`authenticated`, unique constraints and indexes, per-user rules (`auth.jwt() ->> 'sub'`), exposed functions and views, the `cms_*` tables, orphan rows, Realtime publications, Storage buckets, extensions, backups and a restore test, a re-test after the hardening runbook, QA-versus-production comparison, and deleting one learner's data. Run them first on QA, then on production (read-only). Record each result in the workbook (Passed / Failed / NA).

**One script for the SQL cases.** [`docs/testing/sql/policy-inventory.sql`](../sql/policy-inventory.sql) runs the SELECT statements for POL-001 to 010 and 013 as one query (read-only, one result table). Paste it into the Supabase SQL editor, export the result as CSV, and grade it with `python3 -I scripts/policy-check.py <export.csv> QA --write docs/testing/runs/policy-QA-<date>.md`. The checker prints PASS, FAIL or REVIEW with the evidence per case. POL-012 (backups), 014 (re-test after the runbook), 015 (QA versus production: run the same script on production and compare the two outputs) and 016 (delete one learner) stay manual.

One case is automated: `DBI-POL-011` searches the production build (`.next-prod/static`) for the service-role key; it passed on 2026-10-31 (the key is not in the browser bundle). The other fifteen appear in the spec as `test.fixme` placeholders so they show in the coverage report as manual.

### 6.2 Result of the policy inventory on QA (2026-10-31)

Run by the owner with `docs/testing/sql/policy-inventory.sql`; export stored in `docs/testing/sql/results/policy-QA-2026-10-31.csv`, graded in [`runs/policy-QA-2026-10-31.md`](../runs/policy-QA-2026-10-31.md).

| Case | Result | Evidence |
| --- | --- | --- |
| POL-001 RLS on | **Pass** | all 10 tables have row level security on |
| POL-002 policies | **Fail** | seven tables carry the policy "Allow public read/write": `ALL`, role `public`, `using true`, including `user_enrollments` |
| POL-003 grants | **Fail** | `anon` and `authenticated` hold DELETE, INSERT, UPDATE and also TRUNCATE, TRIGGER and REFERENCES on every table |
| POL-004 constraints and indexes | **Fail** | no unique (user_id, course_slug) on `user_enrollments`; no index on `user_id` / `video_id` for `video_comments`, `admin_activity_log`, `user_enrollments`. Progress and exam unique rules exist |
| POL-005 per-user rule | **Fail** | none of the 10 policies refers to the JWT: every row is open to every caller |
| POL-006 functions and views | Pass | none |
| POL-007 cms tables | Review | 1 course, 1 curriculum, 2 coupon rows (`LAUNCH500`, `QA_TEST_100`) readable by anyone; the application does not use them |
| POL-008 orphans | Review | none: no progress row without a stats row, no enrolment outside the catalog |
| POL-009 Realtime, POL-010 Storage | Pass | nothing published, no buckets |
| POL-013 extensions | Pass | uuid-ossp 1.1, pgcrypto, supabase_vault |

Read: reads and writes are open to anyone holding the public key; with DELETE and TRUNCATE granted, anyone can erase the enrolments, progress and the admin log, not only add to them. Row level security is on but the policies make it a no-op. Tickets: SCP-82 (policies and grants, root cause), SCP-74, SCP-75, SCP-76 (the symptoms found by the DBI-ACC cases), SCP-83 (indexes), SCP-84 (cms tables). A reviewed fix script, **not run**, is in [`sql/hardening-proposal.sql`](../sql/hardening-proposal.sql): steps 1 and 2 are safe now (the server writes enrolments); step 4 needs code changes first because the browser still writes the other tables.

### 6.3 Re-test after steps 1 and 2 of the fix (2026-11-01)

The owner ran steps 1 and 2 of `sql/hardening-proposal.sql` on QA (revoke TRUNCATE/TRIGGER/REFERENCES, remove duplicates, unique rule, read-only policy and grants on `user_enrollments`). 263 tests were re-run (database spec, enrolment and payment APIs, checkout, free enrollment, dashboard, admin, access control): 224 passed, 13 failed after one retry, 26 skipped.

| Case | Before | After |
| --- | --- | --- |
| DBI-CON-005 unique enrolment | fail | **pass** |
| DBI-ACC-001 / 002 anon cannot insert, change or delete an enrolment | fail | **pass** (`42501 permission denied`) |
| Checkout, enrolment, dashboard, admin, access-control specs | pass | **still pass**: nothing in the app needed browser writes to `user_enrollments` |
| DBI-ACC-003 to 008, SCH-006 | fail | unchanged: steps 3 and 4 not applied (SCP-75, SCP-76, SCP-49) |
| ENRA-FRE-015, ENRA-ADM-011, PAYA-RBT-001, FRE-IDEM-004 (parallel calls) | extra rows | **no extra rows, but the losing call answers 500** instead of 200/409 |

New consequence of the unique rule: `grantEnrollment()` still does check-then-insert and does not handle the unique violation (`23505`), so when two requests race, the loser gets a 500 even though the learner is enrolled. On `verify-payment` that means a learner who has paid can see an error after a double submit. Fix: treat `23505` as "already enrolled" in `lib/enrollments.ts` (SCP-44).

### 6.4 Production (2026-11-01)

First inventory on production ([policy-PROD-2026-11-01.md](../runs/policy-PROD-2026-11-01.md)): same gaps as QA (open "Allow public read/write" on all 9 tables, TRUNCATE for anon) and no unique rule on `user_enrollments`. The `cms_` tables do not exist there, so SCP-84 does not apply. The duplicate query found one learner enrolled twice in `python-beginners`.

After steps 1 and 2 (backup first, SCP-85 deployed): 40 rows became 39, the unique rule `user_enrollments_user_course_unique` exists, `user_enrollments` is read-only for anon and authenticated, TRUNCATE/TRIGGER/REFERENCES are revoked ([retest](../runs/policy-PROD-retest-2026-11-01.md)). SCP-44 closed. The other 8 tables still have the open policy (SCP-74 to SCP-76, step 4). Two `video_progress` rows have no `user_stats` row (POL-008, harmless).

## 7. Risks

| Risk | Ticket |
| --- | --- |
| R-DB-1 Anyone with the public key can create, change and delete enrolments (free access to every course). | SCP-74 |
| R-DB-2 Anyone can read all e-mail addresses, submitted code and enrolments. | SCP-75 |
| R-DB-3 Anyone can forge the admin activity log, change leaderboard points and post as another user. | SCP-76 |
| R-DB-4 `user_enrollments` has no unique constraint; parallel grants create duplicates. | SCP-44 |
| R-DB-5 `video_likes` is queried but does not exist. | SCP-49 |
| R-DB-6 `cms_*` tables are not used by the application and are readable with the public key. | — |
| R-DB-7 The QA project may not match production: the access cases must be repeated on production with read-only queries (`pg_policies`, `pg_constraint`) before any fix. | — |

## 8. Weightage and Testability

Access with the public key 35% · constraints 25% · schema 20% · data quality 20%. Needs `SUPABASE_SERVICE_ROLE_KEY` and the anon key of the QA project (never production), `E2E_SEED_PERSONAS=1`. Test rows use the `qa_db_` prefix and are removed after each test.

## 9. Definition of Done

All 28 cases automated; known failures keep failing visibly with a ticket until the runbook is applied, then pass; no leftovers; CHANGELOG line added.
