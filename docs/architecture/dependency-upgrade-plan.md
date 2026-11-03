# Dependency upgrade plan (SCP-87)

Status: **proposed, not approved. Nothing has been installed or changed.** Date: 2026-11-03.
Rule: per CONSTITUTION §7, no package is installed until the owner approves each stage and is told what changes.

## 1. Goal and current state

Remove the production advisories reported by `npm audit --omit=dev` (24 packages: 2 critical, 15 high). Keep every behaviour unchanged: sign-in, enrolment, payments, exam grading, admin, share pages.

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
| 1 | In-range fixes | `npm audit fix` (no `--force`): lock-file only for the 8 transitive packages. | `package-lock.json` | low |
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
