# Findings

Research, discoveries, and constraints. Append dated entries.

### 2026-10-27 — Checkout flow review (for testing PRD 04)

- All three courses in `data/courses.ts` have `enrollmentClosed: true`, so the Buy Now UI is not reachable on any live page. Checkout UI tests need an open-cohort fixture (decision D1).
- `components/ActiveCohorts.tsx`: `finally { setIsProcessing(false) }` runs right after `paymentObject.open()`, so the button is clickable while the Razorpay overlay is open (possible duplicate orders); no `ondismiss` handler.
- Success modal copy says "Your payment is verified" for free enrollments too; modal routes to `/learning`, which is the intended destination (owner decision 2026-10-29; PRD 03 §4.6 corrected).
- Errors and the login prompt use `window.alert`; automation must handle dialogs.
- Coupon rules: `EXISTINGSTUDENT_BATCH03` is public (₹1,999 / $50 off) and makes the ₹399 / $9.99 and ₹1,999 courses free; no expiry or usage limits; real Clerk user ids are committed in `data/coupons.ts`.
- No Razorpay webhook: a buyer who pays but loses connectivity before `verify-payment` is charged without enrollment.
- `verify-payment` sends the receipt email (BCC admin) when an enrollment is newly created; tests would send real email unless suppressed.
- Local `.env.local` uses Razorpay test keys (`rzp_test_`). `RAZORPAY_KEY_SECRET` allows a test to sign a payment for a real test-mode order, so the full stack can be tested without driving the Razorpay iframe.
- PRD 02 import: product URL was `app.vwo.com` (wrong product); corrected. Details in `docs/testing/CHANGELOG.md`.

### 2026-10-27 — Owner decisions and `/api-docs` review

- D1 deferred, D2–D4 decided (see `docs/testing/README.md`). Personas and environments in `docs/testing/TEST_DATA.md`.
- `app/api-docs/page.tsx` is a protected route (not in `publicRoutes`) whose email allowlist (`ALLOWED_TESTERS`) is enforced **client-side only**; it is not in PRD 01's route inventory. Add it to the Auth PRD's next revision. The allowlist is where the QA persona emails come from.
- Swagger spec in `/api-docs` has drifted from the code: `create-order` lists `userId` in the body; `verify-payment` lists `userId`, `courseSlug`, `userEmail`, `userName`, `courseTitle`, `amountPaid`, `couponCode`, but the route now reads only the three Razorpay fields; `enroll-free` lists `courseSlug`, `userId`, `userName`, `userEmail`, which the route ignores. Fix when the API PRDs are written (OpenAPI skill).
- Persona email mismatch: `financial.bazar@gmail.com` (owner's table) vs `financetrail.bazar@gmail.com` (code). Asked as Q1.

### 2026-10-27 — `admin-course-manager` branch review (one commit, `c0a91d4`)

- Adds only `app/api/admin/content/route.ts`: `POST` upserts `cms_courses`, `cms_curriculum`, `cms_coupons` with the service-role key. **Nothing in the app reads those tables**: `lib/pricing.ts`, `ActiveCohorts` and the pages still use `data/courses.ts` and `data/coupons.ts`, so a course or coupon created through it has no effect yet.
- **Authorization hole:** the guard is `apiKey !== ADMIN_API_KEY && !userId`, so **any signed-in Clerk user passes** and can upsert courses and coupons (for example a public 100% coupon). It also honours the `x-api-key` bypass in production (PRD §13 S9) and the route is not in the admin check used elsewhere (`isAdminEmail`). Do not merge as is; require `isAdminEmail` (or the test key outside production) and validate the payload.
- Implication for tests: a CMS-created fixture is not possible until a read side exists; until then the QA fixture is a gated entry in `data/`.
- Clerk instance for local/QA is a development instance (`pk_test_`); Google sign-in cannot be automated reliably, see `docs/testing/TEST_DATA.md`.

### 2026-10-27 — Workbook read and fixture build

- 517 manual cases exist (auth 208, public 169, pricing 140); only pricing is unexecuted. See `docs/testing/CASE_INVENTORY.md`.
- `AUTH-PUB-006` failed result is stale: SCP-27 fixed in `01bbeee` (2026-09-09); routes whitelisted in `middleware.ts`.
- Empty `allowedUsers` means "anyone" in `data/coupons.ts`; any coupon built from env must fail closed (done for `QA100`).
- Playwright `reuseExistingServer` silently reuses a dev server on port 3000 started without `NEXT_PUBLIC_QA_FIXTURES`; fixed by `PORT`. Two Next dev servers must not share `.next` (cache write errors seen); `distDir` now `.next-e2e` for non-default ports. Next rewrites `tsconfig.json` for any new dist dir, hence the pre-declared include.
- `node_modules/next/dist/docs/` (referenced by AGENTS.md) does not exist in this install (Next 14.2.35); used the public Next 14 behaviour for `NEXT_PUBLIC_*` (inlined at build/dev start) and `distDir`.
- Razorpay test account accepts USD orders (a $1 order was created).
- Dev Clerk instance has only 3 users; the enrolled student `financetrail.bazar@gmail.com` is not among them.

### 2026-10-27 — Automation batch 1 (PRD 01)

- Clerk sign-in tokens work on Clerk v4 / dev instance "Shivam Academy - QA Staging" for Google-only accounts; the hosted sign-in page accepts `__clerk_ticket`. Dev instances reload the page twice on first load (handshake): wait for `networkidle` before redeeming.
- `setActive()` navigates, so it must not be awaited inside `page.evaluate`.
- Playwright `describe.configure({ mode: 'serial' })` skips the rest after a failure; use `mode: 'default'` for "sequential but independent".
- No admin link in the navigation for anyone; admin and enrolment checks on `/admin`, `/learning/[slug]`, `/live/[slug]` are client-side (anon Supabase read), middleware only enforces sign-in (PRD §13 S2 still open).
- `/live` without a slug is a 404 for signed-in users; Clerk sends visitors to sign-in first.
- SCP-29 fixed (server-side admin check). Swagger spec drift still open for the API PRDs.
- Allure 3 CLI (`allure`) is Node-based; classic Allure 2 needs Java, which is not installed here.

### 2026-10-27 — Automation batch 2 (PRD 02, no-login sheets)

- Homepage is a brand/bento page: no testimonials, benefits list or social proof; PRD 02 section 4.1 describes a fuller landing page. Either the PRD or the page needs to change (`PUB-LAND-006`).
- Mobile: the WhatsApp widget's bubble overlaps the footer's "Terms of Service" link (`PUB-MOB-015`). The mobile menu toggle is an icon-only `<button>` with no accessible name (`PUB-A11Y-011`).
- Mobile menu's Dashboard entry is `a[href="/learning"]`, not a link named exactly "Dashboard".
- Machine load (other sessions) made foreground runs time out; long Playwright runs go to the background.

### 2026-10-28 — Automation batch 3 (PRD 03)

- `/api/enroll-free` is not idempotent under concurrency: `grantEnrollment` does check-then-insert and `user_enrollments` has no unique (user_id, course_slug); 6 parallel calls produced 4 to 6 rows. Fix: unique constraint plus insert-or-ignore (docs/DATABASE.md must change with it).
- Coupons live in `data/coupons.ts`, which is imported by the client page, so every code and the restricted user-id lists ship in the browser bundle; no expiry date or usage limit exists (`CDP-COUP-007/008`).
- Success modal routes to `/learning`; the course page is not marked enrolled behind the modal.
- Catalog cards have no instructor, rating, currency toggle or preview (PRD 03 section 4.1 expects them).
- Test infra: Clerk sign-in under load occasionally times out (passes on retry); run with `--workers=2`. Tests sharing one persona across files race: DB-writing specs live in one file/worker.

## 2026-10-30 to 2026-11-01 (QA programme)

Defects (all in Jira, tests keep failing on purpose until fixed; see `docs/testing/runs/2026-10-31.md`):
- Checkout and enrolment: Buy Now re-enabled while the Razorpay window is open (SCP-50), paid order floored at one unit (SCP-51), no order timeout (SCP-65), parallel enrolments (SCP-44) and, once the unique rule exists, the losing request answered 500 (SCP-85, fixed on a branch).
- Learning and dashboard: empty lesson list when the YouTube API fails (SCP-47), starter code after reload (SCP-48), no like button (SCP-49), View Solution before submitting (SCP-54), no Git lab reset (SCP-55), empty submission saved (SCP-56), streak uses the UTC date (SCP-60), dashboard waits for four requests in a row (SCP-77).
- Public pages and accessibility: WhatsApp button covers the Terms link and the coupon Apply button on phones (SCP-36, SCP-64), icon-only controls without a name (SCP-58), no testimonials on the home page (SCP-57), catalog cards without instructor, rating, currency control or preview (SCP-61 to SCP-63).
- APIs: verify-payment 500 for an unknown order (SCP-66), Clerk webhook not idempotent and 500 without `email_addresses` (SCP-67, SCP-68), no rate limit on `send-email` (SCP-69), public AI tutor (SCP-70), certificate route for any name and 500 for non-Latin names (SCP-71, SCP-72), `track-time` inflation (SCP-73).
- Database and security: the public Supabase key can read and write every learner table; policy "Allow public read/write" (ALL, true) plus DELETE/TRUNCATE grants on seven tables (SCP-74 to SCP-76, root cause SCP-82), missing indexes (SCP-83), `cms_` tables readable (SCP-84), coupon codes in the public JavaScript (SCP-53), admin e-mail compared case-sensitively (SCP-59).
- Performance (production build): every page is dynamic and `no-store` (SCP-80), admin user directory without `Cache-Control: no-store` (SCP-81).

Environment findings:
- `GMAIL_USER` and `GMAIL_APP_PASSWORD` are empty in `.env.local`: no e-mail has ever been sent by a test, the contact form answers 500 locally (SCP-35), verify-payment and the Clerk webhook skip mail silently.
- Clerk development instance answers the first document request with a 401 handshake page and WebKit blocks Clerk's script chunk (uncaught error on every page): checks for uncaught errors skip WebKit; Clerk's dev 401 is ignored in the failed-request check.
- A file-level `test.use({ userAgent })` is inherited by `browser.newContext()`, so Clerk answered 401 to signed-in API calls: `tests/support/api.ts` sets a browser User-Agent.
- Dev server numbers are inflated (2.7 MB JavaScript); the production build (separate folder `.next-prod`, port 3101) is fast: TTFB 12 to 18 ms, 180 KB JavaScript, slow-phone LCP under 1 s. Long runs on a busy network produce timeouts that pass alone (PAYA-BND-001, AIA-XP-002, ADM-ENR-019).
- The live database policies cannot be read through the REST API: they need the Supabase SQL editor (script and checker in `docs/testing/sql/`, `scripts/policy-check.py`).
- `gh` is not installed: pull requests are opened by the owner from a compare link.

Decisions and rules recorded: failures must not block automation (Allure and run pages show them); persona ids are namespaced per PRD; every Jira ticket is approved by the owner; the bug-fix workflow (branch, Jira bug under SCP-2, RCA, fix, PR, Jira comment) is in `.claude/skills/bug-fix-workflow/SKILL.md`.

- 2026-11-01: the QA Supabase project has no `video_likes` or `test_attempts` table (production has both), so the like button never worked on QA and the old browser code hid the error. The new like route reports errors; the social route shows zero likes if the likes lookup fails.
- 2026-11-01: `exam_progress` still stores a score computed in the browser. The server now caps attempts at 5 and validates 0-100, but cannot prove the score is honest.
