# Phase 6: Hardening and cutover (Blueprint, APPROVED 2026-11-06)

Status: approved by the owner 2026-11-06 ("6 plan looks good"), so the proposals in section 10 stand: 6d (roles) skipped, 14-day soak, `get-clerk-users` deleted if nothing needs it. Phase 6 follows 5d (prices and coupons); 6a to 6c do not touch payments.

## 1. North Star
The portal is the single source of truth in production: every flag is `database`, the data files stop being a runtime source, the three legacy admin routes are gone, and the owner can turn any flag back off in minutes until the fallback is finally removed.

## 2. Integrations and links
Supabase, Clerk, Razorpay, Vercel env vars. Link check: the production SQL (`step7`, `step8` and the earlier steps) is **already applied (owner, 2026-11-06)**. Still to verify before the first flag is turned on in production: the `plan_id` column (from `course-cta-update-3`) and that the import has run (courses, cohorts, curriculum rows exist and are published). The check is a read-only script (`scripts/cutover-check.mjs`, no secrets printed) that counts the rows each flag needs.

## 3. Source of truth and delivery
Source: the published rows in `content_docs`, `coupons`, `notifications`. Delivery: unchanged pages and routes. This phase changes **configuration, tests and dead code**, not the shapes of any payload.

## 4. Slices

### 6a Retire the legacy admin routes
- Delete `app/api/admin/dashboard-data`, `app/api/admin/enroll` and `app/api/get-all-users`; keep `get-clerk-users` only if the admin portal or a test still needs it, otherwise delete it too (decided by a caller search recorded in `findings.md`).
- Remove their entries from `middleware.ts` comments, `app/api-docs/ApiDocsClient.tsx` and the Swagger text.
- Tests: map every spec that calls them (`tests/api/crm.spec.ts`, `enrollment-apis.spec.ts`, `admin-data-api.spec.ts`, `enrollments-api.spec.ts`, `clerk-apis.spec.ts`, `tests/ui/auth/route-protection.spec.ts`, perf budgets and the PRD 08/10/11/15 case sheets) to its replacement under `/api/admin/v1/**`, or retire it with a reason in `docs/testing` (same rule as PRD 08 section 12). A new test asserts the three paths answer 404 for visitor, learner and admin.
- Rollback: revert the commit.

### 6b Admin portal quality gaps
- Phone and keyboard cases for the admin portal that are manual today become Playwright specs (mobile viewport shell, focus order, dialogs closing on Escape, no horizontal scroll).
- The Grant form lists only portal cohorts today; it also lists cohorts that exist only in the files, until the files stop being a source.
- A `lint` and `tsc` clean run on the whole repo, with the result logged in `progress.md`.

### 6c Cutover tooling and runbook
- `scripts/cutover-check.mjs` (read-only): per flag, prints OK or the reason it is not ready (no published courses, no published curriculum for a cohort that has enrolments, no coupons, missing `plan_id`).
- `docs/architecture/cutover-runbook.md`: order **catalog, learning, engagement, coupons**; for each flag: precondition check, set the Vercel env var, redeploy, smoke list (course list, a sales page, a lesson, the bell, a paid test order on the QA project), what to watch in logs (`catalog: ... falling back`), rollback (set the flag to `files`, redeploy).
- A fallback counter: the one-line fallback log gains a stable prefix so a log search shows how often a flag fell back (no new service).
- Run the runbook on QA with all four flags `database` and record the results.

### 6d Roles (decision D5, optional)
Admin API keys already carry owner, admin and staff roles. D5 asked for more roles on the admin **UI** (editor, support, viewer) backed by a `roles` source. **Proposal: not in this phase** (no second admin exists; it needs a table and a screen). Say "include 6d" if you want it now.

### 6e Soak, then remove the fallback (last, separate approval)
After the flags have been `database` in production for an agreed soak (proposal: 14 days, zero fallback log lines):
- `lib/catalog/*` stops importing `data/courses`, `data/coupons`, `data/notifications` and the static curriculum map; the files stay in git history as a backup, not in the build.
- `chooseSource`/`readWithFallback` stay for error handling only if the owner wants a safety net, otherwise a database failure shows the normal error page.
- The bundle test and the price tests keep running; the learner suites run once, in database mode.
This slice is deliberately **not scheduled**: it starts only on the owner's word after the soak.

## 5. Data shapes
No new payloads. New files: `scripts/cutover-check.mjs` (output: lines `flag: OK|NOT READY: reason`, exit code 0 when all requested flags are ready, 1 otherwise), the runbook, and the deleted routes. Docs touched: PRD 08, 10, 11, 15 case sheets, `docs/testing/CHANGELOG.md`, `README.md`, `docs/FEATURES.md`, the Swagger text.

## 6. Security rules
Deleting the legacy routes removes three privileged surfaces that bypass the audit log and the key roles (`get-all-users` lists every Clerk user, `admin/enroll` grants access without an audit row). The deletion test proves they are gone. `cutover-check` reads only counts and never prints keys. Env flags stay server-side.

## 7. Tests that ship with each slice
6a: 404 test for the removed paths, mapped replacement specs. 6b: the new mobile and keyboard specs. 6c: a unit test of the readiness rules (pure function over counts) and one run of the script against QA. 6e: full learner suites in database mode.

## 8. Risks
| Risk | Mitigation |
|---|---|
| A hidden caller of a legacy route | caller search before deleting, 404 test, one revert |
| A flag turned on with partial data | `cutover-check` per flag, the per-request fallback, rollback by env var |
| Payment regression at the coupon flag | 5d first, price tests both ways, QA paid test order in the runbook |
| Removing the fallback too early | separate approval, soak and a log with zero fallbacks first |

## 9. Order of work
6a, 6b, 6c (these three do not need 5d), then the runbook run once 5d is built, then 6e only on your word. Nothing is committed or pushed unless you ask.

## 10. Decisions needed from the owner
1. Approve 6a to 6c as written? 
2. 6d roles: skip (recommended) or include?
3. 6e soak length: 14 days of zero fallback lines (proposed), or other?
4. Delete `get-clerk-users` as well if nothing in the portal needs it?
