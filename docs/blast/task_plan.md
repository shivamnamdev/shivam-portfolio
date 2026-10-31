# Task Plan

Phases, goals, checklists, and the approved Blueprint for the current task. See [CONSTITUTION.md](../../CONSTITUTION.md) §2–3.

## Current task

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
