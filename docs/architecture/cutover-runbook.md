# Cutover runbook: turning the learner portal's flags to `database`

Applies to `PORTAL_CATALOG`, `PORTAL_LEARNING`, `PORTAL_ENGAGEMENT`, `PORTAL_COUPONS` (blueprints: [phase 5](admin-portal-phase5-learner-portal.md), [phase 6](admin-portal-phase6-cutover.md)). Do it on QA first, then production, **one flag at a time, in this order**. Every flag is a server environment variable in Vercel (never `NEXT_PUBLIC_`); a change takes effect after a redeploy. **Rollback for any step: set that flag back to `files` and redeploy.** Nothing in the database changes, so nothing needs undoing.

## 0. Once, before the first flag
1. Production SQL applied: `step4` to `step8` in `docs/testing/sql/` (the owner ran them on 2026-11-06). For plans: the `plan_id` column of `docs/SUPABASE_PLAN_COLUMN.md`.
2. `course-cta-update-3` merged to `main` (slice 5d is built on it) and the phase 4 and 5 branches merged.
3. The import has run and what you want live is **published** in the portal: courses, cohorts (prices, open or closed, private links), curriculum, settings (support phone), banners and e-mail templates if you want them.
4. Recreate the coupons you still need in the portal (**the four old file codes stop working** when `PORTAL_COUPONS` is `database`; `QA100` stays environment-driven and exists only where the QA fixture variables are set).
5. Run the check against the project the site uses (it reads counts only and prints no secret; it uses `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the environment or `.env.local`):
   `node scripts/cutover-check.mjs` (all flags) or `node scripts/cutover-check.mjs PORTAL_CATALOG` (one). Exit code 0 means every asked flag is ready, 1 means a line says why not. Fix what it names first.

## 1. For each flag, in order: catalog, learning, engagement, coupons
| Step | Check before | Smoke after the redeploy | Watch |
|---|---|---|---|
| `PORTAL_CATALOG=database` | `cutover-check PORTAL_CATALOG` is OK | `/courses` lists the published cohorts with the prices you set; open a sales page (plans or the cohort box); the support phone on the WhatsApp button is the one in Settings; a cohort set to *not listed* is off the list but its URL works | log lines starting `catalog:` (a line means that request fell back to the data files) |
| `PORTAL_LEARNING=database` | `cutover-check PORTAL_LEARNING` is OK | as an enrolled learner open a lesson page, the dashboard card and the live lobby; as a learner not enrolled the links route answers 403; view-source of a lesson page has no meeting or chat link | `learning:` lines |
| `PORTAL_ENGAGEMENT=database` | `cutover-check PORTAL_ENGAGEMENT` is OK | a published banner shows on its page with the countdown; the bell shows a notification you sent to yourself and marks it read; a saved e-mail template renders (owner manual case `AAPI-NTF-M-001`) | `engagement:` lines |
| `PORTAL_COUPONS=database` | `PORTAL_CATALOG` already `database`; `cutover-check PORTAL_COUPONS` is OK | the price on the page equals the price the checkout asks for; a portal coupon applies in the box; a free-coupon enrolment works; **a paid test order on QA** with Razorpay test keys completes and enrols; a one-time code is `redeemed` afterwards in the Coupons screen | `commerce:` lines (a `database prices` line means a request was priced from the files; a `coupon read failed` line means buyers saw 503) |

If a watched line appears repeatedly, stop and look before the next flag. A request that falls back is never an error page for the learner: it is answered from the data files, exactly as before the switch.

## 2. Run on QA (result log)
Run the full learner suites once with all four flags `database` and once with all `files` (`docs/testing/CHANGELOG.md` has the dated result of each run). The flags are set on the server process and on the test process: for example `PORT=3100 PORTAL_CATALOG=database PORTAL_LEARNING=database PORTAL_ENGAGEMENT=database PORTAL_COUPONS=database E2E_SEED_PERSONAS=1 npx playwright test ...` (see `tests/README.md` for the fixture variables).

## 3. After the soak (slice 6e, only on the owner's word)
Count fallback lines in the production logs (the prefixes above) over the soak period (14 days proposed). With zero, the owner may ask for slice 6e, which stops reading `data/courses.ts`, `data/coupons.ts`, `data/notifications.ts` and the static curriculum at run time. That slice has its own approval; **until then the files stay the safety net**, and the old file coupon codes stay in the client bundle (SCP-53 closes with 6e).
