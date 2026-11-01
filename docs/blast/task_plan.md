# Task Plan

Phases, goals, checklists, and the approved Blueprint for the current task. See [CONSTITUTION.md](../../CONSTITUTION.md) §2–3.

## Current task

Testing programme, 2026-10-30 to 2026-11-01 (owner plan: PRDs and manual cases first, then automation, then API, database, performance). Goal: cover all QA of the portal, log every defect in Jira (epic SCP-3 stories, bugs under SCP-2), keep a dated run history.

Blueprint approved by the owner in the chat of each day ("go ahead" per step; every Jira ticket approved; fixes and PRs only on request).

- [x] UI PRDs 01 to 08: 1,168 cases in total with PRDs 09 to 15; UI automation done (PRD 01 to 08: 203, 160, 134, 111, 70, 81, 104, 81 cases automated)
- [x] API PRDs 09 to 13 (payment, enrollment, Clerk/webhook/user lookup, e-mail, AI tutor/certificate/time/XP): 127 cases, specs in `tests/api/`
- [x] Database PRD 14 (44 cases: 28 automated, 16 manual policy inventory, SQL in `docs/testing/sql/`) and performance PRD 15 (35 cases, dev server and production build)
- [x] First full run 2026-10-31: 714 tests, 643 passed, 1 flaky, 31 failed (all known defects, ticketed), 39 skipped. Page `docs/testing/runs/2026-10-31.md`; Jira SCP-78 (run log) and SCP-79
- [x] Jira: SCP-44 to SCP-85 created or updated; every story under SCP-3 carries an automation status comment
- [x] Policy inventory on QA run by the owner (2026-10-31): public read/write policies and write grants on seven tables (SCP-82); steps 1 and 2 of the fix applied by the owner on QA (2026-11-01); re-test 224 passed / 13 failed (expected) / 26 skipped
- [x] SCP-85 (unique violation answered 500) fixed on branch `fix/SCP-85-unique-violation-in-grant-enrollment`, pushed, PR to be opened by the owner; skill `.claude/skills/bug-fix-workflow` and `scripts/jira.py` on branch `docs/bug-fix-workflow-skill`
- [ ] Owner: open and merge both PRs; commit the `DB-Policy` documentation work (policy SQL, checker, PRD 14 results)
- [ ] Owner: run the policy inventory on production (read-only, POL-015), then apply steps 1 and 2 there after SCP-85 is deployed; POL-012 (backups) and POL-016 (delete one learner) are manual
- [ ] Database fix step 3 (cms_ tables, SCP-84) and step 4 (code changes before locking the other six tables, SCP-74 to SCP-76)
- [ ] Not covered yet: Firefox/WebKit full runs, security PRD (headers, `npm audit`, stored XSS in Q&A), automated accessibility scan, real Razorpay checkout, e-mail content and counts (Gmail variables are empty locally), k6 load run, CI workflow for the full suite (QA secrets), production smoke
- [ ] PRDs 05 and 07 to 15 are still "PRD draft": owner review pending

### State of the roadmap (2026-11-01)

| # | Feature | PRD | State |
|---|---|---|---|
| 1 to 8 | UI: auth, public, catalog, checkout, free enrollment, dashboard, learning, admin | 01 to 08 | Tests done; remaining cases are `test.fixme` for defects or missing access |
| 9 to 13 | API: payment, enrollment, Clerk/webhook/lookup, e-mail, AI/certificate/time/XP | 09 to 13 | Tests done; 3 e-mail content cases and 2 server-state cases manual |
| 14 | Database integrity and policy inventory | 14 | Automated cases done; 16 manual SQL cases (QA graded, production pending) |
| 15 | Performance | 15 | Baseline on dev server and production build; k6, 1000+ users and sustained load open |

Source of truth: [docs/testing/README.md](../testing/README.md), [COVERAGE.md](../testing/COVERAGE.md), [runs/README.md](../testing/runs/README.md).

## Earlier task: automation batch 1 (2026-10-27)

Automation batch 1 (2026-10-27): automate the existing manual cases, PRD 01 first; Allure report; fix SCP-29.

- [x] Sign-in helper (Clerk token), persona seeding with snapshot/restore, Allure 3, coverage script
- [x] PRD 01: 203/204 cases automated, SCP-29 fixed; full run 155 passed / 2 skipped / 0 failed
- [x] PRD 02 no-login sheets: 95 of 161 cases (71 tests, 68 pass, 3 fail on real findings)
- [ ] PRD 02 remaining 66 cases, PRD 03 (140 cases) and checkout scenarios CK-xx (questions Q11 to Q13 in `docs/testing/README.md`)
- [ ] User: commit/PR, add `SUPABASE_SERVICE_ROLE_KEY` secret to enable seeded specs in CI

### Earlier in the day: documentation hub and QA fixture

Testing documentation hub (2026-10-27): one folder (`docs/testing/`) holds every testing PRD, the feature registry and a changelog; write PRD 04 (Checkout Flow UI) in the same structure as PRDs 01–03, with testing weightage. Test cases are written afterwards, PRD by PRD.

### Discovery
- North Star: every feature has a testing PRD and a traceable history before any test is written.
- Integrations: none (docs only). Razorpay keys verified as test-mode (`rzp_test_`).
- Source of Truth: `docs/testing/` (PRDs, registry, changelog); product behaviour from code and PRD §13.
- Delivery Payload: markdown docs in the repo.
- Behavioral Rules: no code changes; PRD 04 stays `draft` until the user reviews it; decisions D1–D4 in `docs/testing/README.md` are the user's.

### Data schema (input/output)
N/A (documentation). Scenario ID format: `CK-NN` (checkout); future PRDs use their own two-letter prefix.

### Blueprint approved by user: yes (request of 2026-10-27)

### Checklist
- [x] `docs/testing/` created; PRDs 01–03 imported / moved (history kept with `git mv`)
- [x] PRD 04 Checkout Flow written (36 scenarios, weightage, testability requirements)
- [x] Registry, changelog, template
- [x] User review of PRD 04 (accepted); D1 deferred, D2–D4 decided; `TEST_DATA.md` added
- [x] Answers to Q1–Q5 recorded (2026-10-27)
- [ ] Go-ahead for the QA fixture course + QA-only free coupon (`data/`, env-gated), Clerk ids lookup, sign-in-token spike, QA env variables
- [ ] Read the xlsx test cases (Q6), map to PRD scenario ids, then automate
- [ ] Write test cases from PRDs 01–04 (next task)

### QA fixture course + free coupon (approved 2026-10-27: "Go ahead with checkout flow")

- North Star: checkout and free-enrollment UI become testable without touching the three real (closed) courses.
- Integrations: none new. Dev Clerk instance ids for the coupon come from env, not source.
- Source of Truth: `data/courses.ts`, `data/coupons.ts`.
- Shapes: course `qa-checkout-sandbox` = clone of the batch-2 course with `enrollmentClosed:false`, ₹10 / $1; coupon `QA100` = 100%, `allowedUsers` = `NEXT_PUBLIC_QA_FREE_COUPON_USERS` (comma separated Clerk ids).
- Behavioral rules: both exist **only** when `NEXT_PUBLIC_QA_FIXTURES=1`; hidden from `/courses`; never set in Vercel production. With the flag off the data is byte-for-byte the current catalog.
- [x] Implement gated fixture + hide from catalog
- [x] Verify flag off (unchanged suite) and flag on (suite + fixture visible)
- [x] Clerk read-only lookup, workbooks read (`CASE_INVENTORY.md`)
- [ ] User sets `NEXT_PUBLIC_QA_FIXTURES` / `NEXT_PUBLIC_QA_FREE_COUPON_USERS` in `.env.qa` and CI only (never Vercel production)
- [ ] Answers Q7–Q10 (`docs/testing/README.md`), then map the 517 cases to PRD scenario ids

## Previous tasks

### PR smoke suite (2026-10-26)

PR smoke suite (2026-10-26): tag existing Playwright tests `@smoke`, add public-route / auth-redirect / share-OG / webhook tests, run only `@smoke` on Chromium for every PR.

#### Discovery
- North Star: every PR runs a fast, deterministic smoke gate on Chromium.
- Integrations: Clerk (dev instance), GitHub Actions. No new secrets except CLERK_WEBHOOK_SECRET in CI.
- Source of Truth: `data/courses.ts`, `data/learning-content.ts`, `tests/`.
- Delivery Payload: GitHub PR check + Playwright HTML report artifact.
- Behavioral Rules: no email sends, no payments, no DB writes in smoke tests.

#### Data schema (input/output)

#### Blueprint approved by user: yes ("implement it", 2026-10-26)

#### Checklist
- [x] `@smoke` tag on existing specs
- [x] tests/ui/smoke.spec.ts, tests/api/webhook.spec.ts
- [x] `npm run test:smoke`, CI smoke job (chromium)
- [ ] Full 3-browser run moved to push-to-main

- [x] 2026-10-28 PRD 03 automation: 134/140 ids (6 fixme: no coupon expiry/limit/API). 8 genuine failures kept visible in Allure. Next: PRD 02 remaining 66, checkout CK-xx extras, Jira tickets for the PRD 03 findings (awaiting user approval).

## Product-wide testing roadmap (owner's precedence list, recorded 2026-10-29)

Order follows the real journey: user lands → signs in → buys/joins → learns → administers → data persists → performs under load. Layers in order: UI, API, Database, Performance.

**Phase 1 — UI**

| # | Feature | PRD | State (2026-10-29) |
|---|---|---|---|
| 1 | Authentication & role protection | 01 | Tests done (203/204) |
| 2 | Public pages & navigation | 02 | Tests partial (95/161) |
| 3 | Course catalog & pricing | 03 | Tests partial (134/140 automated; 7 genuine failures; redirect expectation corrected 2026-10-29; SCP-43) |
| 4 | Checkout flow | 04 | PRD ready; mocked-gateway scenarios covered by PRD 03 specs, CK-xx still to map |
| 5 | Free enrollment flow | 05 | **PRD draft written 2026-10-29** |
| 6 | Student dashboard & course access | 06 | PRD ready; 82 manual cases written 2026-10-30 |
| 7 | Learning lab flow | 07 | PRD draft; 107 manual cases written 2026-10-30 |
| 8 | Admin flow | 08 | PRD draft; 83 manual cases written 2026-10-30 |

**Phase 2 — API:** payment APIs (`create-order`, `verify-payment`), enrollment APIs (`enroll-free`, admin enroll), user lookup APIs (`get-all-users`, `get-clerk-users`), webhook APIs (Clerk), email APIs (`send-email`), AI tutor, certificate generation (PRDs 09 to 13).

**Phase 3 — Database:** `user_enrollments` persistence (duplicate checks, course-to-user link), Clerk user sync, admin activity log, assignment/progress records, CRM data integrity (PRD 14).

**Phase 4 — Performance:** checkout under load, login/auth under load, learning lab responsiveness, admin CRM performance, backend latency and throughput (p95/p99), peak concurrent users, fail-safe handling (PRD 15).

**Production-ready execution order:** Authentication → Course access/public pages → Purchase flow → Free enrollment flow → Dashboard/student access → Learning lab → Admin portal → Payment APIs → Enrollment APIs → Clerk/webhook APIs → Data integrity in Supabase → Performance validation.

Source of truth for status: [docs/testing/README.md](../testing/README.md) (registry) and [docs/testing/COVERAGE.md](../testing/COVERAGE.md).
