# Dependency upgrade plan (SCP-87)

Status: **done 2026-11-13. All six stages are merged (PRs #86 to #91); outcome in section 8.** Written 2026-11-03, refreshed 2026-11-09 (section 7).
Rule: per CONSTITUTION §7, no package is installed until the owner approves each stage and is told what changes.

## 1. Goal and current state

Remove the production advisories reported by `npm audit --omit=dev` (25 packages on 2026-11-09: 2 critical, 15 high, 5 moderate, 3 low; it was 24 on 2026-11-03). Keep every behaviour unchanged: sign-in, enrolment, payments, exam grading, admin, share pages.

| Package | Now | Target | Why |
|---|---|---|---|
| `next` | ^14.2.35 | 16.4.4 (via 15) | critical advisory; also pulls the high `postcss` one |
| `@clerk/nextjs` | ^4.29.9 | 7.9.23 | high advisories in `@clerk/backend`, `clerk-react`, `clerk-sdk-node`, `shared`, `js-cookie`, `cookie`, `deepmerge` |
| `swagger-ui-react` | ^3.23.3 | 5.34.1 | critical `dompurify`, moderate `@braintree/sanitize-url`, `swagger-client`, `apidom` |
| `nodemailer` | ^8.0.6 | 10.3.1 | high advisory (direct) |
| 8 transitive packages (`brace-expansion`, `follow-redirects`, `immutable`, `js-yaml`, `nanoid`, `source-map-js`, `minimatch`, `fflate`, `monaco-editor`) | various | in-range fixes | `npm audit fix` without `--force` |

Facts checked on 2026-11-03 (`npm view`, read-only): Next 16 and Clerk 7 both still accept **React 18**, so React stays on 18 (no React 19 migration). Both need Node >= 20.9: the Vercel project Node version must be checked first.

## 2. Blueprint

- **North Star**: zero critical and zero high advisories in `npm audit --omit=dev`, with the full Playwright suite green and no change visible to learners.
- **Integrations touched**: Clerk (middleware, session, webhook), Razorpay routes (they sit behind Clerk's public-route list), Supabase routes (use `auth()`), Vercel (Node version, build).
- **Source of truth**: `package.json` / `package-lock.json`; behaviour is defined by the existing tests in `tests/`.
- **Delivery**: one PR per stage, each merged and run on production before the next starts.
- **Do not**: use `--force`, `--legacy-peer-deps` (it broke the lock file once), or upgrade two majors in one PR.

## 3. Stages (each is its own branch, PR and rollback)

| # | Stage | Change | Footprint in this repo | Risk |
|---|---|---|---|---|
| 0 | Prep | Confirm Vercel Node >= 20.9. Take a green baseline run (`npm test`) and record it. Read `node_modules/next/dist/docs/` and Clerk's upgrade guides for the target versions (AGENTS.md rule). | none | none |
| 1 | In-range fixes | **Revised 2026-11-09:** not `npm audit fix` (its dry run adds 52, removes 233 and changes 55 packages and moves `swagger-ui-react` 3.23.3 to 3.52.5). Use `npm update` on the 8 named transitive packages only (dry run: adds 4, removes 1, changes 8). Lock file only. | `package-lock.json` | low |
| 2 | `swagger-ui-react` 3 -> 5 | Only `app/api-docs/ApiDocsClient.tsx` imports it. Check the spec renders; the page is public so keep it behind the same route. If v5 needs a React/CSS change, adapt that one file. | 1 file | low |
| 3 | `nodemailer` 8 -> 10 | Used by `app/api/send-email`, verify-payment and the Clerk webhook e-mail. Read its changelog for removed options; run `tests/api/email-api.spec.ts` (never sends mail unless `E2E_SEND_REAL_EMAIL=1`). | 3 routes | low |
| 4 | Next 14 -> 15 | Async request APIs: `params` becomes a Promise in `app/learning/[slug]`, `courses/[slug]`, `live/[slug]`, `share/[videoId]`; `cookies()`/`headers()` become async; fetch/route caching defaults change. `experimental.serverComponentsExternalPackages` is renamed `serverExternalPackages` and `outputFileTracingIncludes` moved out of `experimental`: re-verify exam grading traces Pyodide on a preview. Run Next's codemod only after approval. | 4 pages + config + any `cookies`/`headers` use | **medium** |
| 5 | Next 15 -> 16 | Re-read the 16 guide: renamed/removed APIs, `middleware` file naming, bundler default, Node/TypeScript minimums. Confirm the headers in `next.config.mjs` and CSP still apply. | config, middleware | **medium** |
| 6 | Clerk 4 -> 7 (via 5 and 6 if the guides require it) | `authMiddleware` is removed: rewrite `middleware.ts` with `clerkMiddleware` + `createRouteMatcher` and keep the same public list (`/`, `/courses(.*)`, `/share(.*)`, the five public APIs) and the ignored webhook route. `auth()`/`currentUser()` and `clerkClient` become async in newer versions: 26 files import `@clerk/*` (about 8 `currentUser`, 7 `auth`, 3 `clerkClient`, 1 `getAuth`, `useUser`, `SignedIn`/`SignedOut`, `SignInButton`, `UserButton`, `ClerkProvider`, webhook `WebhookEvent`). `lib/serverAuth.ts` is the single choke point: change it first. Check how the test sign-in helper (`tests/support/clerk.ts`, ticket strategy) behaves on the new `Clerk` client. | middleware + ~26 files | **high** |

Order is by risk, lowest first, so a problem in stage 6 never blocks the fixes from stages 1 to 3. Stages 1 to 3 can ship this week; stages 4 to 6 each need a preview soak.

## 4. Verification for every stage

1. `npm ci` in a clean checkout, `npx tsc --noEmit`, `npm run build`.
2. Full Playwright suite (`--workers=1`, chromium), then the Firefox/WebKit smoke when stage 4 or later.
3. `npm audit --omit=dev`: the targeted advisories are gone, no new ones.
4. Vercel preview: sign-in, a Razorpay test checkout, free enrolment, the lab, the exam grade (cold start and memory), `/api-docs`, admin dashboard. The preview needs the Preview env vars (service-role key etc.) first.
5. After merge, production smoke by the owner; watch Vercel logs for one day.
6. Update `docs/testing/CHANGELOG.md`, the PRD 16 table, `docs/blast/progress.md`.

## 5. Rollback

Each stage is one revert of its PR (package.json + lock + code). Do not run stage N+1 until N has been on production for a day with no new errors. Keep the Clerk webhook signing secret and all env values unchanged across stages.

## 6. Known risks and open questions

- Clerk 7 behaviour on sessions: users may be signed out once when the session format changes. Plan the deploy outside peak hours; owner to confirm.
- Dev-instance sign-in in the Playwright helpers depends on Clerk's frontend API: re-test `signInAs` after stage 6.
- The CSP (report-only) lists Clerk origins; new Clerk versions may use other hosts: watch the console after stage 6.
- Whether Next 15.x latest already clears the critical advisory (so stage 5 could wait) is **not yet checked**; check with `npm view next@15 version` and the advisory ranges before stage 4.
- Estimated effort: stages 1 to 3 about 1 day; stage 4 about 1 day; stage 5 half a day; stage 6 2 to 3 days including regression. These are estimates, not measured.

## 7. Refresh of 2026-11-09 (read-only checks, nothing installed)

Checked with `npm audit --omit=dev --json`, `npm view` and `npm ... --dry-run`:

- **Today's audit:** 25 packages (2 critical: `next`, `dompurify`; 15 high; 5 moderate; 3 low). Fixes that npm offers are all major: `next` 16.4.5, `@clerk/nextjs` 7.9.25, `nodemailer` 10.4.0, `swagger-ui-react` 5.34.1. Eight transitive packages have an in-range fix.
- **Next 15 does not clear the critical `next` advisory.** The advisory range runs up to 16.3.0-preview, so only Next 16 does. This answers the open question in section 6: stage 4 (Next 15) is a stepping stone, stage 5 (Next 16) is what removes the advisory.
- **React stays on 18.** Peer ranges of the targets: `next` 16.4.5 accepts `^18.2.0` or 19, `@clerk/nextjs` 7.9.25 accepts `^18.0.0` or 19, `swagger-ui-react` 5.34.1 accepts `>=16.8 <20`, `nodemailer` 10.4.0 needs only Node 20. No React 19 migration is needed.
- **Node:** the targets need Node >= 20.9 (Clerk 7, Next 16) and >= 20.0 (nodemailer). The repo has no `.nvmrc` and no `engines` field, so the Node version Vercel uses is unknown: the owner checks it in the Vercel project settings (stage 0).
- **Stage 1 corrected:** the `npm audit fix` in the original stage 1 is bigger than it looked (see the table). The narrower `npm update` of the eight packages changes 13 package entries and leaves the swagger tree alone. The nested `dompurify` it installs (3.4.15) is still inside the vulnerable range (<= 3.4.16), so the critical `dompurify` advisory is cleared only by stage 2 (`swagger-ui-react` 5).
- **npm warning to decide on:** this npm prints that 11 packages have install scripts not covered by `allowScripts` (`@scarf/scarf`, `core-js`, `es5-ext`, `fsevents`, `tree-sitter` and others). Installs still work; the owner decides whether to approve or deny each with `npm approve-scripts` before stage 1 (a supply-chain point, so default to deny except `fsevents`).
- **Baseline for stage 0:** the 2026-11-08 run (docs/testing/runs/2026-11-08.md, Jira SCP-97): 970 passed, 20 flaky, 23 failed, 97 skipped. The 23 failures are known (8 ticketed defects, the dashboard title mismatch, 3 test or doc drift). Any stage must not add to that list.

**Effect on order and effort:** stages 1 and 2 clear every critical or high advisory except `next`, `@clerk/*`, `postcss`, `js-cookie` and `nodemailer`; stage 3 clears `nodemailer`; stages 4 to 6 are needed for `next`, `postcss` and Clerk. Estimates in section 6 are unchanged and unmeasured.

**Asked of the owner before any install:** approve stage 1 (changes `package-lock.json` only; installs 4 packages, removes 1, updates 8), say which of the 11 install scripts to allow, and confirm the Vercel Node version.

## 8. Outcome (2026-11-13)

| Stage | Change | PR | Full Chromium run (QA) |
|---|---|---|---|
| 1 | in-range fixes of 8 transitive packages | #86 | no separate full run; merged on the owner's instruction without waiting for CI. The stage 4 run is the first full run after it |
| 2 | `swagger-ui-react` 3 to 5.34.1, `dompurify` override 3.4.17 | #87 | no separate full run (same); `/api-docs` is covered by `SCP-29` in the later runs |
| 3 | `nodemailer` 8 to 10.4.0 | #88 | no separate full run (same); covered by the later full runs |
| 4 | `next` 14 to 15.5.29, async request APIs (codemod, `use(params)` on the player page by hand) | #89 | [2026-11-10](../testing/runs/2026-11-10.md): 976 passed, 25 failed (23 known, 2 new and fixed: `PRV-UI-005`, `LRN-PY-008`) |
| 6 | `@clerk/nextjs` 4 to 7.9.25, `clerkMiddleware`, async `auth()` and `clerkClient()`, `<Show>` | #90 | [2026-11-12](../testing/runs/2026-11-12.md): 951 passed, 41 failed before the follow-ups (a real bug: the API matcher `/api(.*)` also caught the page `/api-docs`; two Clerk 7 markup changes broke test helpers), re-runs of the affected specs pass |
| 5 | `next` 15 to 16.4.6, `revalidateTag(tag, { expire: 0 })` | #91 | [2026-11-13](../testing/runs/2026-11-13.md): 984 passed, 26 failed (23 known; `LRN-EXM-011` test relied on a webpack chunk name, fixed; 2 load flakes) |

Stage 6 went before stage 5: Next 16 removed the synchronous `headers()` that Clerk 4 calls, so Clerk 7 had to land first (the plan section 3 order was stage 5 then 6).

**Audit:** 25 packages (2 critical, 15 high) on 2026-11-09 to **6 (4 moderate, 2 low), none critical or high**, on 2026-11-13. Left: the `swagger-ui-react` tree (`swagger-client`, `@swagger-api/apidom-reference`, `deepmerge`, itself at 5.34.1) and `minimatch` and `baseline-browser-mapping`, which have no non-breaking fix offered. They are in the admin-only API docs page and build tooling.

**Known failures that remained constant** (not caused by the upgrades): 8 ticketed defects (SCP-36, 57, 58, 61, 62, 63), 12 dashboard cases that look for the title "Python Live Session (Batch 2)" (owner decision needed), and 3 drift cases (`DBI-SCH-002`, `PRF-API-004`, `PRF-LOD-003`).

**CI (found along the way, PR #92):** `ubuntu-latest` became 26.04, which Playwright 1.59.1 cannot install browsers on, and `lts/*` became Node 26, where the browser download hangs on extraction (earlier main runs were cancelled after 60 minutes). The workflow now pins `ubuntu-24.04` and Node 24.

**Open follow-ups:** rename `middleware.ts` to `proxy.ts` (Next 16 deprecation); React 18 support ends in Next 17 (React 19 migration); Clerk deprecates `createRouteMatcher` (move auth checks into each route); `outputFileTracingRoot` warning from the stray `~/package-lock.json`; Vercel preview checks of sign-in, Razorpay test checkout, exam grade cold start and memory, admin pages, `/api-docs`.
