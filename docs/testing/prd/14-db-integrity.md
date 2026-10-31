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

One case is automated: `DBI-POL-011` searches the production build (`.next-prod/static`) for the service-role key; it passed on 2026-10-31 (the key is not in the browser bundle). The other fifteen appear in the spec as `test.fixme` placeholders so they show in the coverage report as manual.

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
