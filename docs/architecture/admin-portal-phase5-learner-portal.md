# Phase 5: The learner portal reads the database (Blueprint, APPROVED 2026-11-06)

Status: approved by the owner 2026-11-06 ("commit the blueprint, begin with 5a"). Owner decisions already given (2026-11-06): **one server flag per slice** (default `files`); **non-payment slices first, the payments slice after `course-cta-update-3` is on `main`**; **the four old coupons are not imported** (you recreate the ones you still need in the portal before turning the coupon flag on); **the bell starts empty** (the hand-written items in `data/notifications.ts` are dropped at the switch). Branch `admin-portal/p5-learner-portal` (to be created from `admin-portal/p4-admin-ui`, stacked as before).

## 1. North Star
A learner sees exactly what the owner published in the admin portal (courses, prices, curriculum, banners, notifications, support details), and pays with coupons created there; **while a flag is `files` nothing changes for anyone**. Private links and coupon rules never reach the browser before the server has checked who is asking (closes SCP-45 and SCP-53).

## 2. Integrations and links
Supabase (service role, server side only) and Clerk; the admin API tables already exist and are filled by phases 1 to 4 (`content_docs`, `coupons`, `notifications`, `notification_reads`, `rate_limit_take`). Link check before each slice: one read of the table the slice needs on the QA project (the admin API tests already do this). **Production readiness (checked before any flag is turned on there, not before building):** `step7` and `step8` SQL applied, the import (courses, cohorts, curriculum) run, and `course-cta-update-3`'s `plan_id` column present. The import itself still waits for `course-cta-update-3` to merge.

## 3. Source of truth and delivery
Source: the published rows (`content_docs` kind `course`, `cohort`, `curriculum`, `banner`, `setting`, `email_template`; `coupons`; `notifications`). Delivery: the existing pages and routes, changed to read through a **server-only catalog module** (`lib/catalog/*`), never straight from the browser. Same URLs, same look, same API contracts (existing tests keep their expectations).

## 4. Flags (decision: one per slice)
| Flag (server env, never `NEXT_PUBLIC_`) | Controls | Values |
|---|---|---|
| `PORTAL_CATALOG` | course list, course sales page, home page cohort block, support phone and e-mail | `files` (default) or `database` |
| `PORTAL_LEARNING` | lesson pages, share page, certificate eligibility, live and WhatsApp links | `files` or `database` |
| `PORTAL_ENGAGEMENT` | banners, the notification bell, e-mail templates in the receipt, free-enrolment and welcome mails | `files` or `database` |
| `PORTAL_COUPONS` | coupon check, prices from cohort pricing, plans, one-time reservation (slice 5d, after `course-cta-update-3`) | `files` or `database` |
A flag set to `database` that **cannot read its rows** (error, or nothing published yet) falls back to the files for that request, logs one line without secrets, and never shows an error page. The read helper is one pure function with unit tests (`chooseSource`), so the rule is the same everywhere. Turning a flag off is the rollback.

## 5. Slices (each its own commit and PR, tests with it, shown to you before commit)

### 5a Catalog (courses, cohorts, support details)
- `lib/catalog/` (server only): `getCatalog()` returns today's `activeCourses` shape built from published courses and cohorts (price strings formatted from the numbers, `statusText`, `demoOffer`, `enrollmentClosed`, `listed`, pitch parts), **without** `liveLink` and `whatsappLink`. `getSupport()` returns the phone and e-mail settings (falling back to today's hard-coded number).
- **Refinement made while building (2026-11-06):** orders are still priced from the data files until 5d, so the price and the open or closed flag on the page follow `PORTAL_COUPONS`: a cohort that is in the files shows the file's price, and a cohort that exists only in the portal shows as closed until 5d (otherwise the page could show a price the server would refuse). The portal's own numbers are used once `PORTAL_COUPONS` is `database`.
- Pages `app/courses/page.tsx`, `app/courses/[slug]/page.tsx`, `app/page.tsx` (server components already) call it and pass props to `ActiveCohorts` and `HeroVSL` (client components that stop importing `data/courses`). The static list stays as the fallback module.
- Caching: `unstable_cache` with tag `catalog`; the admin routes that publish, unpublish, archive, edit pricing or settings call `revalidateTag('catalog')`; a 60-second time fallback covers a missed tag. The WhatsApp widget reads the support phone.
- Draft and unpublished cohorts never appear; `listed: false` hides a cohort from the list but its direct URL still works (today's behaviour).

### 5b Learning content and private links (SCP-45)
- The learning page (1,977 lines, client) receives the **published curriculum** as a prop from a small server wrapper instead of importing `courseCurriculumMap`; the same conversion (`toLegacy`) already used by the admin import keeps the shape identical. `app/share/[videoId]`, `lib/certificateEligibility.ts` and the admin progress totals use the same catalog reader.
- **Links after the access check:** `liveLink` and `whatsappLink` leave the page bundles. New `GET /api/learning/links/{slug}` returns them only to a signed-in learner enrolled in that cohort (or the admin); `/live/{slug}` and the learning page fetch it after load; the payment success reply keeps returning the WhatsApp link to the buyer.
- **Refinements made while building (2026-11-06):** the lesson page, live lobby and dashboard fetch from three small routes (`/api/learning/content/{slug}`, `/links/{slug}`, `/my-courses`) instead of receiving props from a server wrapper: the page body is not touched except its data source. The routes use the existing `hasCourseAccess` (enrolled or admin). Sales-page props carry no link in either source. A cohort's lessons and links stay available to its enrolled learners after the cohort is archived (only the published curriculum counts, not the cohort's status).
- **Refinement made for 5c (2026-11-06, owner decision):** mails use a template only when one is saved: today's paid-enrolment mail and sign-up mail stay unchanged until a `payment-receipt` or `welcome` template is saved, and a free enrolment sends a mail only if a `free-enrolment` template is saved (today it sends none). Banners are fetched by the browser from `/api/banners` (so the public pages stay cacheable), not rendered by the server per viewer.
- Assignment fields marked protected (`isExam`, `serverGraded`, `expectedOutcomeUrl`) stay server-side exactly as today.

### 5c Banners, notifications, templates
- **Banners:** a server component `<Banners placement>` runs the existing pure `visibleBanners` for the viewer (visitor, learner with cohort and plan ids) and renders the plain-text bar with the countdown, dismiss kept per banner in `localStorage`; cache tag `banners`, revalidated by the banner admin routes. The unused hard-coded `UrgencyBanner` is deleted.
- **Bell:** `GET /api/learning/notifications` (live items for this learner, never admin alerts, `learnerVisible`), `POST /api/learning/notifications/read` (writes `notification_reads` for the signed-in user only); the `Navbar` reads these instead of `data/notifications.ts`; unread count from the server. **Starts empty** (owner decision).
- **E-mail templates:** `verify-payment`, `enroll-free` and the Clerk welcome mail render the saved or built-in template (`renderTemplate`, escaped); a missing or broken template falls back to today's built-in text.

### 5d Prices and coupons (waits for `course-cta-update-3` on `main`)
- Prices come from the cohort's numbers (single INR and USD, or plans) through `lib/pricing.ts`, which stays deterministic and unit-tested; the amount shown equals the amount charged (checked by the existing price tests, flag on and off).
- `resolveCoupon` becomes `await`-based over the `coupons` table using the existing pure rules (state, expiry, selected students, scope, minimum price); one-time codes are **reserved** at order creation and redeemed on verified payment or free enrolment (`couponRedemption.ts`); a failed or abandoned order releases the reservation. Messages and status codes of the three routes stay as the tests expect.
- Cutover note: at the switch the four old codes stop working unless recreated (owner decision); `QA100` stays environment-driven.

## 6. Data shapes (nothing new in the database; no SQL)
Inputs: the published documents already defined in PRD 17 and PRD 19. Outputs added by this phase: `GET /api/learning/links/{slug}` -> `{ success, liveLink: string|"", whatsappLink: string|"" }` (403 unless enrolled or admin, 401 for a visitor); `GET /api/learning/notifications` -> `{ success, items: [{ id, type, title, body, link|null, publishAt, read }], unread }`; `POST /api/learning/notifications/read` body `{ ids?: string[] }` (omit to mark all) -> `{ success, unread }`. Documented in PRD 10 or a new PRD section, with the unit tests named below.

## 7. Security rules
Server-only modules (`import 'server-only'` is not a new package: it is built into Next); no `NEXT_PUBLIC_` flag; learner routes read the signed-in id from the session, never from the request; the notification routes can read only the caller's reads; banner and notification text is plain and escaped on render; **a bundle test fails the build of the page tests if a private link, a coupon code or a flag name appears in the client JavaScript** (the plan's exit criterion); cached catalog data holds no private field.

## 8. Tests that ship with each slice
Unit (`tests/unit/`): `chooseSource` (every flag value, error, empty), catalog mapping (price strings, hidden fields, `listed`, closed cohorts), link access rule, notification visibility and read rules, template fallback, coupon resolution (5d). API: the new learner routes (visitor 401, not enrolled 403, enrolled 200, cannot read another learner's reads). UI: sales page, learning page, live page, bell and banner, **run with every flag on `files` and again on `database`** (the existing learner suites must pass unchanged both ways). Bundle test per slice. Performance: the existing budgets (PRD 15) with the flags on.

## 9. Risks and mitigations
| Risk | Mitigation |
|---|---|
| The 1,977-line learning page is a client component | A thin server wrapper passes props; the page body is not rewritten, only its data source and the two private-link spots |
| Stale content after publish | Tag revalidation plus a 60 s fallback, tested |
| A flag on with empty or broken data | Per-request fallback to the files, one log line, tested |
| Two sources drift while both exist | A unit test compares the files and the imported database content for the shape the pages use; the fallback is removed only in phase 6 after a soak |
| Payment regressions | Slice 5d last, after `course-cta-update-3`, flag per slice, price tests run both ways |

## 10. Rollback
Per slice: set its flag back to `files`. No schema change to undo. Code rollback: revert the slice's commit (slices are independent except 5d needing 5a for plan prices).

## 11. Order of work and what you will see
5a, then 5b, then 5c (each shown to you running with the flag on before commit), then 5d once `course-cta-update-3` is merged. After 5c the flags `PORTAL_CATALOG`, `PORTAL_LEARNING` and `PORTAL_ENGAGEMENT` can be turned on in QA and, once the production readiness list in section 2 is true, in production one at a time. Nothing is committed or pushed unless you ask.
