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
