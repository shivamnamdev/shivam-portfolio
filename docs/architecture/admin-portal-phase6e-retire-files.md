# Phase 6e: retire the data files as a runtime source (Blueprint, PROPOSED 2026-11-07, awaiting owner approval)

Status: proposed. Nothing here is built until the owner approves it **and** the soak gate in section 3 is met. It is the last slice of [phase 6](admin-portal-phase6-cutover.md); the owner chose "start planning" on 2026-11-07, not "start building".

## 1. North Star
Production learners, prices, coupons and lessons come from the portal's database only. The site no longer ships or reads `data/courses.ts`, `data/coupons.ts`, `data/learning-content.ts` and `data/notifications.ts` at run time, so no coupon code or private link can be in any JavaScript bundle (closes SCP-53 for good), and there is one source of truth to explain and to back up.

## 2. What exists today (inventory, 2026-11-07)
| Data file | Runtime readers | What replaces it |
|---|---|---|
| `data/courses.ts` (371 lines; fixture course included) | `lib/catalog/{catalog,learning,commerce}.ts`, `lib/adminApi/enrolmentStore.ts`, `app/courses/page.tsx` (`isQaFixture`) | published courses and cohorts in `content_docs`; the QA fixture moves to a test-only module |
| `data/coupons.ts` (old four codes + env-driven `QA100`) | `lib/pricing.ts` (browser and server `resolveCoupon`), `lib/catalog/commerce.ts` (`qaCoupons`) | the `coupons` table; `QA100` stays environment-driven in the test-only module |
| `data/learning-content.ts` (546 lines, curricula) | `lib/catalog/learning.ts`, `lib/certificateEligibility.ts`, `lib/adminApi/progressStore.ts`, `app/api/admin/v1/import/curriculum` | published `curriculum` documents |
| `data/notifications.ts` (hand-written bell list) | `lib/catalog/engagement.ts` (files source) | `notifications` table (the bell already starts empty) |
| `data/testimonials.ts` | `components/Testimonials.tsx` | **out of scope**: marketing copy that is not in the portal; it stays |

42 test files import these data files (fixtures derived from `activeCourses`, price tables, the fixture course).

## 3. Gate: nothing starts until all of these are true (checked and written in `progress.md`)
1. The owner has switched all four flags to `database` **in production** (runbook `docs/architecture/cutover-runbook.md`) and the soak has run. Proposal: **14 days**, with **zero** `catalog:`, `commerce:`, `learning:` and `engagement:` fallback lines in the production logs.
2. `node scripts/cutover-check.mjs` is OK for all four flags against production.
3. The owner took a **backup** of production (Supabase backup or an export of `content_docs`, `coupons`, `notifications`, `notification_reads`), because after 6e the files are no longer a safety net (git history keeps them, the live database is then the only copy of the day-to-day content).
4. The `course-cta-update-3` work is on `main` and the phase 4 to 6 branches are merged.

## 4. Decisions the owner must make (recommendations first)
1. **When the database cannot be read, what does a learner see?** (a) **Recommended:** the last good copy for catalog, lessons and bell (served stale for up to a day), a friendly "try again" for prices, coupons and orders (never a guessed price), and a log line `catalog: ... failed`. (b) Keep the files as a permanent emergency fallback (then 6e shrinks to "make `database` the default and delete the flags", the files stay in the build). (c) Plain error page.
2. **How are the tests fed after the files go?** (a) **Recommended:** the files move to `seed/` (not imported by `app/`, `lib/` or `components/`), a `scripts/seed-qa.mjs` copies them into the **QA** database before a test run (idempotent, QA project only, refuses production), and the 42 test files read the same seed. (b) Rewrite each test to create its own portal data (much larger).
3. **The curriculum import tool** (`POST /api/admin/v1/import/curriculum`, the Import screen helper): keep until you confirm the production import is final, then delete it with `data/learning-content.ts`. (Recommended: delete in this slice, the seed script replaces it for QA.)
4. **Soak length** (14 days proposed) and whether `get`-style visibility is enough: the check is the production log search for the four prefixes.

## 5. Slices (each its own commit, separately revertable; shown to the owner before commit)
- **6e-1 Safety net.** Read side only: replace each `readWithFallback(...files)` with the decision 1 behaviour (stale copy or friendly error), keep the flags working. Unit tests for the new "database down" answers (catalog, lesson, bell, price, coupon) and the API specs run with a database that fails (an invalid service key in the test process).
- **6e-2 Close SCP-53.** `lib/pricing.ts` stops importing `data/coupons`; the browser path `resolveCoupon` is deleted; `ActiveCohorts` and `CoursePricing` always use `/api/coupons/check` (the `couponCheck` prop goes). New test `bundle-secrets` case: no coupon code (old four or any portal code) and no private link in any client chunk or page HTML, with the flags removed.
- **6e-3 Remove the flags.** Delete `chooseSource`, the `PORTAL_*` reads, `pricingSource`, the `files` branches of `catalog`, `learning`, `engagement` and `commerce`; unit tests of the deleted rules go with them, tests of the kept rules stay. Remove the four variables from Vercel afterwards (owner).
- **6e-4 Remove the data.** Move `data/courses.ts`, `coupons.ts`, `learning-content.ts`, `notifications.ts` to `seed/` (decision 2a) with only the QA fixture and `QA100` kept where the app needs them (`data/qa-fixture.ts`, loaded only when `NEXT_PUBLIC_QA_FIXTURES=1`); delete the import route if decided (decision 3); update `docs/CONTENT_MANAGEMENT.md` and `docs/FEATURES.md` (content is edited in the admin portal only).
- **6e-5 Tests and docs.** `scripts/seed-qa.mjs`, the 42 test files repointed to `seed/`, a full run of all suites on a freshly seeded QA project, PRD 21 and the runbook updated, the Maintenance Log line.

## 6. Data shapes
No new payloads. New or moved files: `seed/*` (the old data files, same shapes), `data/qa-fixture.ts` (fixture course + `QA100`), `scripts/seed-qa.mjs` (output lines `seeded: N courses, N cohorts, N curricula`; exit 0 ok, 1 refused because the URL is not the QA project, 2 read or write error). Behaviour change: with the database unreadable, price, coupon and order routes answer **503** `{ success: false, error: "Could not load prices. Please try again." }` (never a file price).

## 7. Security rules
After 6e-2 the client JavaScript contains no coupon code (the bundle test fails the build otherwise). `seed-qa.mjs` refuses to run unless `NEXT_PUBLIC_SUPABASE_URL` equals the QA project's URL (a list kept in `.env.local`, never committed) and never prints a key. The fixture module is imported only when the QA flag is set, so production builds carry no fixture data.

## 8. Tests that ship with each slice
6e-1: the database-down answers. 6e-2: the bundle and page-HTML secrets test, the coupon box specs (server only). 6e-3: the learner suites with no flags set. 6e-4: `qa-fixture` unit and UI specs. 6e-5: the full suites on a seeded QA project, once. Every slice: `tsc`, unit tests, the matrix specs that touch its area (payment, enrolment, learner APIs; discovery, public, sales-funnel, smoke UI).

## 9. Risks
| Risk | Mitigation |
|---|---|
| Content only in the files is lost (something never imported) | `cutover-check` plus a diff script between `seed/` and the portal before 6e-4; the files stay in git history |
| A database outage now shows stale data or an error | decision 1(a); the stale copy covers read pages, prices and orders refuse rather than guess |
| 42 test files break at once | 6e-5 comes with the seed script; slices before it keep the files in the build, so tests keep passing until 6e-4 |
| Deleting the flags removes the one-line rollback | gate 1 (soak), gate 3 (backup), one commit per slice so `git revert` restores a flag |

## 10. Rollback
Per slice `git revert` (6e-1 to 6e-5 are independent in that order). After 6e-4 the old data returns from `seed/` or git history; the database backup (gate 3) covers the portal content.

## 11. Order of work and what you will see
Gate (section 3) first, then 6e-1 to 6e-5, each shown with its test results before any commit. Estimated effort: 6e-1 and 6e-2 are small, 6e-3 medium, 6e-4 and 6e-5 are the large part (the 42 test files).
