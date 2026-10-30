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

## 2026-10-28 (automation batch 3: PRD 03)

- Added `tests/unit/discovery-pricing-rules.spec.ts` and `tests/ui/discovery/` (`catalog-cards`, `pricing-currency-coupon`, `checkout-flow`, `checkout-real-db`) plus `tests/support/checkout.ts` (mocked Razorpay stub, dialog/page-error trackers, in-page click-to-paint timer).
- Coverage: **134 of 140** PRD 03 ids automated; 6 are `test.fixme` (`CDP-COUP-007/008`, `CDP-E2E-006` need coupon expiry / usage limit; `CDP-ERR-002/003/008` assume a coupon API, but coupons are validated in the browser).
- Strategy: payment calls are mocked in the browser (no money, no popup); free enrolment, enrolled state, real order amounts and forged-signature checks run against the app's own API and the QA Supabase with the edu persona (rows always removed). UI-only tests use the mavish persona so they never overlap with the DB-writing file (lesson from run 1: two files sharing one persona raced).
- Result (Chromium, seeded, fixture on, 2 workers; flaky sign-ins pass on retry): **8 genuine failures, rest passing**:
  - `CDP-003/005`, `CDP-008`/`CDP-CUR-003`, `CDP-009/010`: catalog cards show title, status, duration, price only: no instructor, rating, currency toggle or quick preview.
  - `CDP-PAY-007`/`RED-001`/`RED-003`/`E2E-001`, `CDP-FREE-006`/`RED-002`: the success screen sends the learner to `/learning`, not `/learning/[slug]`.
  - `CDP-RACE-003`: 6 concurrent `/api/enroll-free` calls created 4 to 6 rows for one user and course (check-then-insert race, no unique constraint).

## 2026-10-29 (PRD 05: Free Enrollment Flow)

- Owner asked for the next PRD from the topic list; PRD 04 already exists (Checkout), so the next topic, **Free Enrollment Flow**, became `prd/05-ui-free-enrollment-flow.md` (status: draft, awaiting owner review).
- 36 scenarios `FE-01…FE-36`, 8-state model F1…F8, weightage (idempotency and server rules 20% each), risks R-FE-1…10, readiness. About 20 scenarios map to PRD 03 cases that are already automated (listed in section 10), so nothing is written twice.
- Risks recorded from earlier runs: duplicate rows under concurrency (R-FE-1), modal says "payment verified" (R-FE-2), redirect to `/learning` (R-FE-4, SCP-42), all coupons shipped in the client bundle (R-FE-5), public coupons without expiry/limit (R-FE-6), no email on the free path (R-FE-8).
- Added the owner's full product-wide precedence list (UI → API → Database → Performance, 12-step production order) to `docs/blast/task_plan.md` and `docs/blast/progress.md` so the roadmap is kept with the history.

## 2026-10-29 (manual test cases: PRD 04 workbook)

- Owner approved: PRD 04 first; Automated column instead of pre-filled results; personas per workbook (CHK.*).
- Built `docs/testing/workbooks/[UI] Checkout Flow Testing.xlsx` (same layout as the PRD 01-03 workbooks): sheet "Test User Data", 10 case sheets, "Traceability to Functional Requirements" with COUNTIF coverage and a status chart. Columns: TC ID, Scenario, Preconditions, Steps, Expected Result, Priority, Result (dropdown Passed/Failed/NA), plus two new ones: PRD Scenario (CK-xx) and Automated (existing spec or `CDP-…` case id, or No).
- **114 cases** (`CHK-ENTRY/ORDER/AMT/PAY/FAIL/IDEM/POST/XB/REAL/E2E-nnn`) cover CK-01 to CK-36; also `docs/testing/cases/prd04-checkout.csv`; `scripts/case-coverage.mjs` now reports PRD 04 (0% automated until test titles carry `CHK-` ids; about 35 cases are already covered by tests under PRD 03 ids, listed in the Automated column).
- Generator: `scripts/workbooks/build_workbook.py` + `prd04_cases.py` (needs `openpyxl`, kept out of `package.json`; run it from a scratch venv). Edit the case content in `prd04_cases.py` and re-run to regenerate.
- Known expectations written into cases: PRD 04 says the modal routes to `/learning` while PRD 03 says `/learning/[slug]` (SCP-42); fixed coupons make the QA course free, so non-zero fixed-coupon integrity cannot be tested on C1; FAIL-005 and FAIL-010 document accepted gaps R-CK-5 and R-CK-3.

## 2026-10-29 (batch 4: redirect decision, tagging, PRD 05 workbook, real gateway)

- **Decision (owner): after payment or free enrolment the learner goes to `/learning`** (the dashboard, which lists the new course). PRD 03 section 4.6 and its CSV expectations, PRD 04 R-CK-7, PRD 05 and the READMEs were corrected; tests `[CDP-PAY-007]`, `[CDP-FREE-006]` and related now assert `/learning` plus the dashboard (and, in the database run, that the dashboard lists the new course). The original workbook (`.xlsx`) wording was not changed by me. Jira SCP-42 was rewritten: it now covers only the "payment is verified" copy and the stale enrolled state on free enrolments (priority Low).
- Tagged the existing tests with `CHK-` ids (30 titles). `case-coverage.mjs` now understands `CHK-` and `FRE-`: PRD 04 at 53 of 114 automated.
- Built `docs/testing/workbooks/[UI] Free Enrollment Flow Testing.xlsx` (PRD 05): 71 cases, 8 sheets, ids `FRE-CTA/REQ/SUC/POS/IDEM/ERR/MOB/E2E-nnn`, personas V1, B1, B2, S1, A1; CSV `cases/prd05-free-enrollment.csv`; generator `scripts/workbooks/prd05_cases.py`.
- **Real Razorpay test mode works** (owner supplied `rzp_test_` keys): `checkout-real-gateway.spec.ts` (4 tests, opt-in `E2E_REAL_GATEWAY=1`, ~2 min) covers the real overlay, a successful test-card payment (row created, success modal), the failure button (message, nothing granted) and the live-key guard. Details in `TEST_DATA.md`. Run in Chromium, all 4 passed.

## 2026-10-30 (PRD 06: Student Dashboard & Course Access)

- Wrote `prd/06-ui-student-dashboard-course-access.md` (draft, awaiting owner review): 8-state dashboard model plus 4 lobby states, 18 functional requirements, 15 acceptance criteria, 42 scenarios `SD-01…SD-42` (about 10 already covered by PRD 01 access automation), weightage (course list 25%, access to live/recordings 20%), 10 risks, readiness.
- Findings recorded as risks: course `whatsappLink` and `liveLink` are in the public JS bundle (R-SD-2, not yet ticketed); an enrollment-request failure shows the empty state, so a paying learner may think the purchase failed (R-SD-4); streak/name/email are written from the browser and the leaderboard reads `user_stats` directly (R-SD-3); four owner/test emails are hard-coded in the page (R-SD-5); UTC date logic for streaks (R-SD-7).
- No code changed.

## 2026-10-30 (PRD 06 approved + workbook, PRD 07)

- Owner approved PRD 06. Built `docs/testing/workbooks/[UI] Student Dashboard & Course Access Testing.xlsx`: **82 cases**, 9 sheets, ids `DSH-STATE/CARD/CHG/STAT/RES/LOB/ERR/MOB/E2E-nnn`; CSV `cases/prd06-student-dashboard.csv`; generator `scripts/workbooks/prd06_cases.py`.
- Jira: created SCP-45 (course WhatsApp/live links readable without enrolling) and SCP-46 (dashboard shows the empty state when the enrollment request fails) from PRD 06 risks R-SD-2 and R-SD-4.
- Wrote `prd/07-ui-learning-experience.md` (draft): 10-state page model, 20 requirements, 15 acceptance criteria, 60 scenarios `LX-01…60`, weightage (Python lab 20%, progress 15%, exam/locks/certificate 15%), 10 risks (browser-side progress and exam gate R-LX-1, four external dependencies R-LX-2, mobile SCP-33/34, keyboard SCP-32, mock AI tutor, missing likes table).
- Owner plan for today: finish all PRDs and manual test cases first, automate afterwards.
- Jira stories updated with results: SCP-4, 5, 6, 7 (moved to In Progress); SCP-8 and SCP-9 below.

## 2026-10-30 (batch 5: PRD 07 workbook, PRD 08 and workbook)

- Built `[UI] Learning Experience Testing.xlsx` (PRD 07): **107 cases**, 10 sheets, ids `LRN-LOAD/PLY/TAB/PY/GIT/AI/EXM/EXT/MOB/E2E-nnn`; CSV `prd07-learning-experience.csv`.
- Wrote `prd/08-ui-admin-portal.md` (draft): 9-state portal model, 18 requirements, 14 acceptance criteria, 45 scenarios `AD-01…45` (AD-01…03 already covered by PRD 01), weightage (admin-only access/data exposure 25%, manual enrollment 25%, KPI/table accuracy 20%), 10 risks (browser-side table reads R-AD-1, KPI drift R-AD-4, single hard-coded admin and a case-sensitive page check R-AD-5/6).
- Built `[UI] Admin Portal Testing.xlsx` (PRD 08): **83 cases**, 8 sheets, ids `ADM-GATE/KPI/TBL/PRG/ASG/ENG/ENR/RSL/MOB/E2E-nnn`; CSV `prd08-admin-portal.csv`.
- All UI PRDs (01 to 08) now exist and have manual cases: new workbooks 04 to 08 hold 114 + 71 + 82 + 107 + 83 = **457 cases**; with PRDs 01 to 03 (505) the manual suite is **962 cases**. `scripts/case-coverage.mjs` tracks every workbook.
- Next (owner plan): review the PRDs, then automate.

## 2026-10-30 (automation)

- PRD 06 automation started: `tests/ui/dashboard/dashboard-learners.spec.ts` (read-only, S1/S2/A1/V1) and `dashboard-edu-writes.spec.ts` (U1/M1 grants, one worker), helper `tests/support/dashboard.ts`. 61 of 82 cases tagged; 30 tests pass, 1 `test.fixme` (DSH-ERR-001 = SCP-46). Note: course titles in the workbook (e.g. "Python Beginners Batch 2") differ from the data (`Python Live Session (Batch 2)`); tests use the data titles.
- PRD 07 automation started: `tests/ui/learning/learning-readonly.spec.ts` (Git course learner S1, admin, visitor, mocked YouTube/GitHub) and `learning-python-writes.spec.ts` (mavish: progress, Q&A, lab entry; progress rows snapshotted and restored), helper `tests/support/learning.ts`. Result: 21 pass, 1 `test.fixme` (LRN-EXT-001: a failed YouTube Data API request leaves the sidebar empty instead of showing fallback titles). Not yet automated: Python run/submit/solution, Git simulator, exam/certificate, Share, likes.
- PRD 07 lab automation: Python lab (run, errors, infinite loop, visualise, files, submit/update/solution, progress %) added to `learning-python-writes.spec.ts`; new `learning-git-lab.spec.ts` (simulator commands, graph, submit, AI request). Learning suite: 36 pass, 2 `test.fixme` (SCP-47 YouTube failure, SCP-48 reload shows starter code).
- PRD 07 exam/certificate: new `tests/ui/learning/learning-exam.spec.ts` (Course C, edu with a temporary grant; exam state seeded through the service role): locked/unlocked advanced lessons, exam attempts counter, failed attempt row, five-attempts refusal, certificate offered only at 100% and downloaded as PDF, certificate failure alert. 10 pass, 1 `test.fixme` (LRN-TAB-011: the course page has no like button; `toggleLike()` is never called). A real exam *pass* through the auto-grader is not automated (needs the full solution), so pass is seeded.

## 2026-10-30 (PRD 04/05 automation)

- Logged SCP-49 (course page has no like button; LRN-TAB-011 `test.fixme`).
- PRD 04: new `tests/ui/discovery/checkout-paid-gaps.spec.ts` (closed cohort, visitor prompts, order/verify error paths, overlay options, success modal, mobile, keyboard) and `payment-api-guards.spec.ts` (401, closed/unknown course, restricted and invalid coupon, wrong signature; all refused before anything is written). Coverage 53 → 87 of 114.
- PRD 05: new `tests/ui/discovery/free-enrollment.spec.ts` (price/CTA states, coupon replacement, wrong-account coupon, keyboard, modal, network failure, mobile) and FRE ids added to the existing real-DB and mocked free-enrolment tests. Coverage 0 → 52 of 71. `test.fixme`: FRE-SUC-004 (SCP-42) and FRE-MOB-002 (ticket pending: ~10 px sideways scroll at 390 px once QA100 is applied).
- Still open for PRD 04/05: Firefox/WebKit smoke, receipt email, activity-log/admin checks, stale-tab and refresh-while-processing, two-tab and concurrent verification, real-order cases that need Razorpay test keys.
- PRD 04/05 leftovers: new `checkout-real-flows.spec.ts` (edu, QA database): free enrolment (server derives the course, activity log, reload/dashboard/course page, stale tab, retry after failure, fixed public coupon, refresh/coupon/currency changes mid-request) and paid orders with real Razorpay TEST-mode orders and a signature computed from the test secret (order bound to buyer and course, no-notes order refused, verified INR/USD payment, repeat verification adds nothing, another account gets 403, dashboard and course page). Also: literal ORDER-007/008/009 tests, CHK-FAIL-005 `test.fixme` (R-CK-5), USD purchase mock, parsePrice and USD coupon unit tests, and activity-log cleanup in `checkout-real-db.spec.ts` (40 leftover "New Free Enrollment" rows for edu were removed). Coverage: PRD 04 106/114, PRD 05 66/71.
- Finding: the server floors a paid order at 1 unit, so a USD price below $1 after a coupon (e.g. 20% off the $1 fixture = $0.80) is charged as $1.00 while the UI shows $0.80. Real courses are priced well above $1, so this only bites on very low prices; recorded, not ticketed.
- Not automated: Firefox/WebKit smoke (CHK-XB-004/005, FRE-MOB-006/007), receipt/welcome e-mail count (CHK-IDEM-004, CHK-POST-010: need the inbox), order timeout (CHK-ORDER-012), return-after-sign-in (CHK-ENTRY-008), two-tab paid attempt (CHK-IDEM-007), enrolled state behind the modal without reload (FRE-POS-006, known gap), admin views (FRE-POS-008, FRE-E2E-008: PRD 08).

## 2026-10-30 (PRD 02 remaining cases)

- PRD 02: new `tests/ui/public/conversion-journeys.spec.ts` (CTA state context, course-detail conversion, logged-in navigation, share-link redirects, end-to-end journeys). Payments and enrolment are mocked in the browser, nothing is written. Coverage 95 → 160 of 161 (PUB-A11Y-010 is a `test.fixme`, SCP-32).
- 13 cases (PUB-NAV-001..004, PUB-MOB-004..007, PUB-INFO-001..005) were already automated but hidden from the coverage script by loop-generated titles; rewrote them with literal ids, same assertions.
- Workbook mapping: "paid course C1" and "free course C2" are the QA fixture (₹10 / $1) and the same page after QA100 (coupons need sign-in, so the free journey runs as a signed-in account). Real courses are all closed, so their CTA is View Open Cohorts / You are Enrolled.
- Several workbook rows have the same id on two sheets (PUB-E2E-001..008); one test carries each id, covering both rows.
- Full `tests/ui/public` run: 97 passed, 5 failed. Three are the known defects PUB-LAND-006, PUB-MOB-015, PUB-A11Y-011 (kept failing on purpose, already logged above). The other two were a click before hydration in my new tests; fixed by waiting for network idle, both pass.

## 2026-10-30 (PRD 06 remaining cases)

- PRD 06: new `tests/ui/dashboard/dashboard-stats-journeys.spec.ts`: streak (first visit, next day, gap, same-day reload), Total XP from progress rows, five-row leaderboard order and medals (QA rows `qa_lb_*`, removed afterwards), unknown-slug enrolment, admin list, free and paid enrolment appearing on the dashboard, a second purchase (bazar), lobby link in a new tab, sign-out, recovery after a failed load, session ended mid-page, visitor-to-learner. Edu's stats row and every enrolment/progress row are restored after each test.
- QA fixture course now has a `liveLink` (only when `NEXT_PUBLIC_QA_FIXTURES=1`) so DSH-LOB-006/007 can run. Real courses unchanged.
- Firefox/WebKit smoke (DSH-MOB-007/008): the cards/lobby smoke plus the CARD and visitor cases pass on both. WebKit first failed in the test helpers (Clerk's own navigation interrupted `goto`); `signInAs` and `openDashboard` now retry that one goto. Chromium unaffected.
- DSH-RES-004 is `test.fixme`: every course has a syllabus PDF, so a course without one cannot be set up without changing course data.
- Dashboard folder on Chromium: 47 passed. Coverage PRD 06: 82 of 82 cases accounted for (81 automated, 1 blocked).
- `tests/README.md` list of specs that share the `edu` account now has five files.

## 2026-10-30 (PRD 07 remaining cases)

- PRD 07: 22 remaining cases added. `learning-git-lab.spec.ts` (bazar): Materials tab and link, AI reply cleared on lesson change, simulator fresh after switching lessons, Firefox/WebKit smoke, YouTube + GitHub outage. `learning-python-writes.spec.ts` (mavish, new nested describe): document lesson Mark as Read, multi-step assignment, reference solution runs, autocomplete, empty submit, video/Monaco failure, session ended mid-lesson, phone lab, watch-complete-reload-XP, stuck-then-helped. `learning-exam.spec.ts`: locked advanced lesson opens after a (seeded) pass. `openCourse` now takes `github` (custom assignment text or `fail`).
- Defects confirmed by a probe and kept as `test.fixme`: `LRN-PY-012` View Solution is shown before the learner has submitted (the PRD expects it only after); `LRN-PY-016` Esc does not close the solution window (same area as SCP-32); `LRN-GIT-010` the Git lab has no Reset control. No tickets created yet.
- Observed, not asserted: `LRN-PY-019` an empty editor can be submitted (no empty check in `submitAssignment`); the test only requires feedback and no crash.
- `LRN-MOB-002` (phone lab, SCP-34) and `LRN-E2E-004` pass now. Firefox and WebKit smoke (`LRN-MOB-006/007`) pass.
- Coverage script now reports PRD 07 (104 of 107, 3 blocked) and PRD 08 (0 of 83). Note: cases whose `test.fixme(true, ...)` sits inside the test body (LRN-EXT-001, LRN-PY-010, LRN-TAB-011) still count as automated because the script only sees a fixme on the title line.
- `tests/ui/learning` on Chromium: 63 passed, 6 skipped (fixme), 0 failed.

## 2026-10-30 (Jira round and PRD 08)

- Logged defects found by the automation: SCP-50 (Buy Now enabled while the Razorpay window is open), SCP-51 (paid orders floored at 1 unit), SCP-52 (10 px sideways scroll after a 100% coupon on a phone), SCP-53 (coupon codes in the public JavaScript, no expiry), SCP-54 (View Solution before submitting), SCP-55 (no Git lab Reset), SCP-56 (empty Python submission accepted). Comment added to SCP-32 (Esc does not close the solution window). The related `test.fixme` reasons now name the tickets.
- PRD 08 (admin portal): new `tests/ui/admin/admin-readonly.spec.ts` (access, KPI cards, tab headers, rows, CRM fallbacks, code modal, empty states, failures, form validation, phone and keyboard; table data is answered locally so no row is written) and `admin-enroll-writes.spec.ts` (manual enrolment through the form, real rows and ordering, free and paid enrolments seen in the admin tables; edu is the target and everything is removed afterwards). New helper `tests/support/admin.ts`.
- Coverage PRD 08: 83 cases, 81 automated, 2 `test.fixme`. `ADM-GATE-011` (mixed-case admin email: no such account) and `ADM-RSL-007` (the public Supabase key can read `user_enrollments`, `assignment_progress` and `user_stats`; confirmed by a direct query: all three returned rows, known gap SCP-39).
- Firefox/WebKit smoke for the portal passes. `ADM-GATE-005` (no uncaught errors) skips WebKit, where Clerk's development script chunk from clerk.accounts.dev is blocked on every page.
- `tests/ui/admin` on Chromium: 43 passed, 2 skipped (fixme). The new writes spec is added to the edu shared-account list in `tests/README.md`.
