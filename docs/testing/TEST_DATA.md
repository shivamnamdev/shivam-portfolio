# Test Data: Personas, Accounts, Environments

Who and what the tests use. **No passwords, keys or tokens belong in this file**: credentials go in `.env.qa` (git-ignored) locally and in GitHub Secrets in CI. Source: owner decisions of 2026-10-27 (see [CHANGELOG.md](CHANGELOG.md)).

## Personas (canonical, namespaced per PRD: decision Q7)

Each workbook keeps its own ids; the code in `tests/support/personas.ts` maps every id to one account. Emails are not secrets; Clerk ids are looked up by email at run time.

| Account | Clerk id (dev/QA instance) | Sign-in methods |
| --- | --- | --- |
| `shivamnamdev.corp@gmail.com` | `user_3HqamPFib8naUkLNPxL3NZOg04i` | Google |
| `shivamnamdev.edu@gmail.com` | `user_3HqZ9LJ5SwgMYOdM4cnvqCPxPo4` | Google + password |
| `mavish.ps8@gmail.com` | `user_3HqkaA1yNqqgFZYBzpMDdS6HMcN` | Google |
| `financetrail.bazar@gmail.com` | `user_3LGRyfhrExmWeAOWmp1ORxyNUIf` (added 2026-10-27) | Google |

### AUTH.* (Authentication workbook, PRD 01)

| Id | Account | Meaning | Seeded state |
| --- | --- | --- | --- |
| V1 | none | unauthenticated visitor | n/a |
| U1 | `shivamnamdev.edu@gmail.com` | authenticated, not enrolled in any course | no enrolments |
| S1 | `mavish.ps8@gmail.com` | enrolled in Course A | `python-beginners-batch-2` |
| S2 | `financetrail.bazar@gmail.com` | enrolled in Course B only | `git-beginner-batch-1` |
| A1 | `shivamnamdev.corp@gmail.com` | admin | untouched (all courses) |
| E1 | `financetrail.bazar@gmail.com` | expired / invalid session | session revoked or forged during the test |

Course A = `python-beginners-batch-2`, Course B = `git-beginner-batch-1`, Course C = `python-beginners` (used only for the temporary "enrolment added / removed" case).

### PUB.* (Public Pages and Discovery & Pricing workbooks, PRDs 02 and 03)

| Id | Account | Meaning |
| --- | --- | --- |
| V1 | none | anonymous first-time visitor |
| V2 | `shivamnamdev.edu@gmail.com` | returning anonymous visitor (account used signed out) |
| U1 | `mavish.ps8@gmail.com` | authenticated user |
| S1 | `financetrail.bazar@gmail.com` | enrolled learning access |
| A1 | `shivamnamdev.corp@gmail.com` | admin |
| C1 | `financetrail.bazar@gmail.com` | representative paid course: the QA fixture without a coupon |
| C2 | edu, mavish, bazar | representative free course: the QA fixture with `QA100` |
| SL1 | bazar, mavish | valid share link: each opens a lesson of a course they own (bazar: Course B, mavish: Course A) |
| SL2 | `mavish.ps8@gmail.com` | ineligible share link: a Course B lesson |

The two namespaces share accounts but never need different states at the same time: the seeded state below satisfies both.

## QA data state, seeding and restore

The QA Supabase project (`user_enrollments`, 5 rows before the automation was introduced) is **not** modified permanently. With `E2E_SEED_PERSONAS=1` the run:

1. restores any snapshot left by a crashed run (`.tmp/e2e-enrollment-snapshot.json`);
2. snapshots the persona rows (edu, mavish, bazar; the admin is never touched);
3. applies the canonical state: edu none, mavish Course A, bazar Course B;
4. after the run (`global-teardown`) puts the snapshot back, including row ids and timestamps.

Original rows at first read (2026-10-27): mavish: `python-beginners-batch-2`; edu: `git-beginner-batch-1` (coupon `TEACHER_DAY_GIFT`); admin: all three courses. Tests that must change state mid-run (for example access after an enrolment is added or removed) use Course C and always revoke in `finally`.

Safety guards: the sign-in helpers throw unless `CLERK_SECRET_KEY` starts with `sk_test_`; seeding only runs when `E2E_SEED_PERSONAS=1`; the QA project is the one behind `NEXT_PUBLIC_SUPABASE_URL` (confirm this is QA before enabling seeding on a new machine).

## Fixture course and coupons (built 2026-10-27)

Owner answers: all real cohorts stay closed, tests get their own course, and a coupon makes it free.

| Item | Detail |
| --- | --- |
| Course | `qa-checkout-sandbox` ("QA Checkout Sandbox"): open cohort, ₹10 / $1 (original ₹20 / $2), clone of the batch-2 course content. In `data/courses.ts`. |
| Free coupon | `QA100`: 100% off, `allowedUsers` = Clerk ids from `NEXT_PUBLIC_QA_FREE_COUPON_USERS` (comma separated). In `data/coupons.ts`. Created **only** if the list is non-empty (an empty list would mean "anyone" in this repo, so it fails closed). |
| Gate | Both exist only when `NEXT_PUBLIC_QA_FIXTURES=1`. With the flag off the data equals the real catalog. Hidden from `/courses` in every case. **Never set the flag in Vercel production.** |
| Paid path (C1) | the fixture without a coupon, or with `BIRTHDAY20` for discount cases |
| Free path (C2) | the fixture with `QA100` |
| Later | when the CMS branch is merged **and** the app reads courses/coupons from Supabase, tests can create fixtures through the API |

Verified (Chromium): flag off 41 passed / 5 skipped; flag on 46 passed / 1 skipped. Razorpay test mode created a ₹10 order (1000 paise) and a $1 order (100 cents), so USD is enabled on the test account. Guard tests: `tests/unit/qa-fixture.spec.ts`, `tests/ui/qa-fixture.spec.ts`, `tests/api/qa-fixture.spec.ts`.

Run it (own server and build dir, so a dev server on port 3000 is not touched):

```bash
PORT=3100 NEXT_PUBLIC_QA_FIXTURES=1 \
NEXT_PUBLIC_QA_FREE_COUPON_USERS="<clerk id>,<clerk id>" \
npx playwright test --project=chromium
```

## Courses (kept as-is for now)

| Slug | Status in `data/courses.ts` | Notes |
| --- | --- | --- |
| `git-beginner-batch-1` | closed | ₹399 / $9.99 |
| `python-beginners-batch-2` | closed | ₹1,999 / $25 |
| `python-beginners` | closed | ₹599 / $150 |

Owner decision (2026-10-27): keep the catalog unchanged until documentation and basic testing are done; then improve courses, UI, CTAs and portal structure. Any test that needs an open cohort is **blocked, not skipped silently** (see PRD 04 §15.3).

## Environments

| Env | Supabase | Razorpay | Clerk | Used for |
| --- | --- | --- | --- | --- |
| `local` | developer's `.env.local` | test keys | development instance | exploratory runs |
| `qa` | dedicated QA project (owner confirmed it exists) | test keys only | development instance | all automation, PR and nightly |
| `prod` | production project | live keys | production instance | **never targeted by automated tests** |

Required variables for `qa` (names only; values never in the repo or in chat):

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | QA project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable/anon key (browser reads, e.g. enrollment check) |
| `SUPABASE_SERVICE_ROLE_KEY` | server writes, test seeding and cleanup. **Required:** without it `lib/supabaseAdmin.ts` silently falls back to the anon client |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` | must be `rzp_test_` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` | Clerk |
| `ADMIN_API_KEY` | API-test bypass (non-production only) |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | outbound email (see D4) |
| `TEST_USER_EMAIL`, `TEST_USER_PASSWORD` per persona | sign-in (names to be finalised in the auth spec) |

QA schema must match production: tables in [docs/DATABASE.md](../DATABASE.md), plus `unique (user_id, course_slug)` on `user_enrollments` from [docs/SUPABASE_HARDENING.md](../SUPABASE_HARDENING.md).

## Sign-in strategy for automation (Q4): decided and verified

Playwright cannot reliably automate Google's sign-in page, so personas are signed in with a **Clerk sign-in token**: the helper (`tests/support/clerk.ts`) mints a one-time token for the persona through the Backend API and redeems it in the browser (ticket strategy). Verified on Clerk v4 and the QA instance on 2026-10-27 for Google-only accounts, both through the app (`signInAs`) and through Clerk's hosted sign-in page after a redirect from a protected URL (`signInThroughHostedRedirect`). The Clerk modal itself (open, unknown account, cancel) is tested through its real UI.

Fallbacks, not needed so far: password for `shivamnamdev.edu@gmail.com` (already enabled), `+clerk_test` addresses.

## Clerk details needed (Q5)

| Detail | Status |
| --- | --- |
| Instance type for QA and local | ✅ **development** (`pk_test_` / `sk_test_` in `.env.local`) |
| Do the personas exist in that instance? | ✅ all four exist (the enrolled student was added by the owner on 2026-10-27) |
| Is the QA Clerk instance the same as local? | ✅ the local keys belong to the instance titled **"Shivam Academy - QA Staging"** (`moving-mammal-95.clerk.accounts.dev`, development type); the sign-in modal shows that name |
| Which sign-in methods are enabled? | owner: Google **and** direct (email/password) sign-in are allowed; existing accounts: 2 Google-only, 1 Google + password |
| Webhook secret for QA | `CLERK_WEBHOOK_SECRET` of the QA endpoint, if it differs |

## Email policy (D4)

Receipts and welcome emails go to the owner's inbox. The owner filters them by a subject label. Any test that can trigger an email must make its subject identifiable (for example a fixed prefix such as `[QA-AUTOMATION]`); implementing that prefix is a small server change tracked as TR-2 in PRD 04.
