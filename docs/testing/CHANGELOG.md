# Testing Docs Changelog

Append only. One line per significant change to a testing PRD, plan, spec or the registry. Format: `YYYY-MM-DD — change — reason`.

## 2026-10-27

- Created `docs/testing/` as the single home for testing PRDs, registry and history — keep all docs in one place and trace every feature (BLAST).
- Imported PRD 01 *Authentication & Access Control* from `~/Downloads` (version dated Sept 5, 2026) unchanged → `prd/01-ui-authentication-access-control.md`.
- Imported PRD 02 *Public Pages & Navigation* → `prd/02-ui-public-pages-navigation.md`. Edits: removed Markdown export escapes (`\#`, `\-`, `\|`) so it renders; product URL `app.vwo.com` → `shivamnamdev.com` (copy error); "patent paths" → "pattern paths"; removed the trailing AI offer text ("If you want, I can also generate…").
- Moved PRD 03 *Course Discovery & Pricing* from `docs/PRD_COURSE_DISCOVERY_PRICING_TESTING.md` → `prd/03-ui-course-discovery-pricing.md` (`git mv`, history kept). Updated the two links in `docs/PRD_TM_DIGITAL_LEARNING_PLATFORM.md`.
- Added PRD 04 *Checkout Flow* (draft) from `components/ActiveCohorts.tsx`, `create-order`, `verify-payment`, `enroll-free`, PRD §5.4 / §13. New: state model, 36 scenario IDs (CK-01…CK-36), testing weightage, environment/testability requirements (TR-1…TR-8), 10 risks.
- Added `README.md` (precedence, registry, workflow, open decisions) and `TEMPLATE.md`.
- Findings from the code review for PRD 04 (see also `docs/blast/findings.md`): all courses closed (no testable checkout); button re-enabled while Razorpay overlay is open and no `ondismiss`; success modal copy says "payment is verified" for free enrollments; modal routes to `/learning` not `/learning/[slug]`; no Razorpay webhook fallback for "paid but not enrolled"; coupons have no expiry/usage limit.

- Owner review: PRD 04 accepted as written → status `PRD ready`.
- D1 deferred (keep the three courses; revisit with the course/UI/CTA enhancement phase). Added PRD 04 §15.3 *Execution Readiness*: only CK-03 and CK-05 can run while all cohorts are closed; the rest are `test.fixme` pointing to TR-1.
- D2 decided: added `TEST_DATA.md` with personas V1, V2, U1, S1, A1, C1, C2, SL1, SL2. Discrepancy found: the persona table says `financial.bazar@gmail.com`, `app/api-docs/page.tsx` says `financetrail.bazar@gmail.com` (Q1). Admin `shivamnamdev.corp@gmail.com` confirmed against `lib/admin.ts`.
- D3 decided: dedicated QA Supabase project exists; required variable names recorded in `TEST_DATA.md` (values stay out of the repo). Note: `lib/supabaseAdmin.ts` falls back to the anon client when `SUPABASE_SERVICE_ROLE_KEY` is missing, so QA must set it.
- D4 decided: emails go to the owner's inbox, filtered by subject label; tests use an identifiable subject prefix (TR-2).

- Answers: Q1 `financetrail.bazar@gmail.com` (S1; `TEST_DATA.md` corrected). Q2/Q3: real courses stay closed; add a QA fixture course and a QA-only 100% coupon (D1 refined, proposal in `TEST_DATA.md`, awaiting go-ahead). Q4: sign-in strategy documented (Clerk sign-in token preferred, passwords as fallback). Q5: local Clerk is a development instance; remaining checks listed.
- Existing test cases for PRDs 01–03 are in xlsx outside the repo; to be read, mapped to PRD scenario ids and, once the scope is complete, automated (Q6).
- Moved this work to branch `docs/testing-hub` (branched from `main` after PR #58 merged).

## 2026-10-27 (later)

- Owner replies: sign-in may be Google or direct; local keys are development/test only (production keys exist only in Vercel); use `~/Downloads` for the xlsx files.
- Read-only Clerk lookup (development instance, 3 users in total): `shivamnamdev.corp@gmail.com`, `shivamnamdev.edu@gmail.com`, `mavish.ps8@gmail.com` found; `financetrail.bazar@gmail.com` (and `financial.bazar`) **not found** (Q8). Ids recorded in `TEST_DATA.md`.
- Read the three workbooks (stdlib parser in the scratchpad, nothing installed): **517** cases, 353 passed / 5 failed / 16 NA / 143 not run. Added `CASE_INVENTORY.md` with per-sheet counts, automation readiness, failures, bugs and persona conflicts. `AUTH-PUB-006` / SCP-27 is stale (fixed in `01bbeee`).
- Built the QA fixture (D1 done): `data/courses.ts` (`qa-checkout-sandbox`, ₹10 / $1), `data/coupons.ts` (`QA100`, fails closed without user ids), `/courses` hides it; gate `NEXT_PUBLIC_QA_FIXTURES=1`. Verified: flag off 41 passed / 5 skipped; flag on 46 passed / 1 skipped; Razorpay test orders ₹10 and $1 created.
- Test infrastructure: `playwright.config.ts` honours `PORT` and uses `.next-e2e` as build dir for non-default ports (`next.config.mjs` `distDir`), so a flagged run never shares `.next` with a dev server on 3000; `tsconfig.json` pre-declares `.next-e2e/types`. Added `tests/unit|ui|api/qa-fixture.spec.ts`.
- Found while testing: a dev server was already on port 3000, and Playwright reused it, hiding the fixture from the server. Hence the `PORT` option.

## 2026-10-27 (automation batch 1)

- Owner answers: Q7 agreed (namespaced personas); Q8 `financetrail.bazar@gmail.com` added to the QA Clerk instance (verified, id recorded); Q9 failures never block automation, an Allure report of failures is produced at the end; Q10 fix SCP-29 now; start automating the existing manual cases.
- **SCP-29 fixed**: `/api-docs` is now a server component that redirects non-admins before any Swagger code or spec is sent (`app/api-docs/page.tsx`, spec moved to `ApiDocsClient.tsx`). The four-email client-side allowlist is gone. 4 tests.
- **Sign-in without Google**: `tests/support/clerk.ts` mints a Clerk sign-in token and redeems it (verified on Clerk v4 for Google-only accounts, also through the hosted sign-in page); refuses non-`sk_test_` keys.
- **Persona seeding**: `tests/support/global-setup.ts` / `global-teardown.ts` snapshot, seed and restore `user_enrollments` for edu, mavish, bazar (admin untouched). Verified: the 5 original QA rows are back with their original ids and timestamps after a full run.
- **Allure 3** (`allure-playwright@3.6.0`, `allure@3.22.1`, Node only): `npm run report:allure`; CI uploads `allure-report/`.
- **PRD 01 automated**: 203 of 204 unique case ids (505 unique ids across the 3 workbooks, 517 rows) in `tests/ui/auth/*.spec.ts`, titles carry the case ids. `AUTH-PROT-004` is `test.fixme` (no public link to a protected route). Cases that were "Failed" or "NA" manually (`AUTH-MW-005/006/007`, `AUTH-INVALID-005/006`, `AUTH-PUB-006`) pass automatically.
- Full Chromium run with seeding and the QA fixture: **155 passed, 2 skipped, 0 failed** (6.1 min).
- Workbooks converted to `docs/testing/cases/*.csv`; `scripts/case-coverage.mjs` writes `docs/testing/COVERAGE.md`.
- Finding: there is no admin link in the navigation, even for the admin (admin must type `/admin`); recorded in `access-control.spec.ts` (`AUTH-UI-004`).

## 2026-10-27 (automation batch 2: PRD 02, no-login sheets)

- Owner: Q11 yes (start with the no-login PRD 02 sheets).
- Added `tests/ui/public/` (3 specs, 71 tests): landing, primary navigation, legal pages, security boundary, catalog and discovery, reliability, performance budgets (4 s on a warmed dev server), mobile navigation (390x844) and keyboard accessibility. PRD 02 coverage: 95 of 161 case ids (59%); overall 298 of 505 (59%).
- Result of the consolidated run (Chromium, seeded personas, QA fixture on): **68 passed, 3 failed**. The failures are real findings, left failing so they show in Allure:
  - `PUB-LAND-006`: the homepage has no testimonials / social-proof section (testimonials exist on course pages only; `components/Testimonials.tsx` is unused, PRD section 13 E5).
  - `PUB-MOB-015`: on a phone the floating WhatsApp bubble covers the "Terms of Service" footer link, so it cannot be tapped.
  - `PUB-A11Y-011`: icon-only controls have no accessible name (for example the mobile menu toggle).
- Manual "Failed" cases that now pass automatically: `PUB-LAND-008` (homepage to discovery), `PUB-MOB-008` (Log In on mobile). `PUB-A11Y-010` (Python lab close button by keyboard, SCP-32) is a Learning Lab case.
- Test-infrastructure notes: `signInAs` is viewport-agnostic (account button, not the desktop-only Dashboard link); `alert()` dialogs need a handler registered before the click; clicks right after navigation need `networkidle` (hydration); footer links on mobile are tapped by coordinates.
