# Agent Skills Playbook

Instructions for AI coding agents (Claude Code, Codex, Copilot, etc.) working in this repository.

The `agents/` git submodule is a third-party skill catalog (~2,700 skills). Only the skills listed below are relevant to this codebase. Each one lives at `agents/skills/<skill-id>/SKILL.md`.

> If `agents/skills/` is empty, initialise the submodule: `git submodule update --init agents`.

---

## 1. Mandatory workflow

For **every** task in this repo:

1. **Classify the task** using the routing table in §2 (by area *or* by the files you are about to touch).
2. **Read the matching skill(s)** before writing code: open `agents/skills/<skill-id>/SKILL.md`. If it points to a `references/` file ("Read the detailed guide…"), read the relevant sections of that too. Use at most 2–3 skills per task, and pick the most specific.
3. **Reconcile with this repo's versions** (§3) before applying any pattern. Repo reality beats skill advice: the code, `AGENTS.md`, and `node_modules/next/dist/docs/` win on conflicts.
4. **Apply the guidance** to the change, including the skill's validation/checklist steps.
5. **Report it**: in the final summary, name the skills consulted and anything deliberately not followed (and why).

Also check [PRD_TM_DIGITAL_LEARNING_PLATFORM.md §13](PRD_TM_DIGITAL_LEARNING_PLATFORM.md#13-known-issues-risks--mitigations) for known issues in the area you are touching, so fixes don't regress them and new work doesn't repeat them.

---

## 2. Routing table

| Task area | Typical files | Primary skills | Supporting skills |
|---|---|---|---|
| **Authentication, middleware, roles, Clerk webhook** | `middleware.ts`, `app/api/webhooks/clerk/`, any `ADMIN_EMAIL` check | `clerk-auth` | `auth-implementation-patterns` |
| **Enrollment / admin authorization, server-side enforcement** | `app/admin/`, `app/learning/[slug]/`, `app/live/[slug]/`, `app/share/` | `auth-implementation-patterns`, `supabase` | `api-security-best-practices` |
| **Supabase queries, tables, RLS, constraints, migrations** | `lib/supabaseClient.ts`, any `supabase.from(...)` | `supabase`, `supabase-postgres-best-practices` | `postgres-best-practices`, `postgresql`, `nextjs-supabase-auth` (RLS sections only) |
| **Payments, coupons, pricing, free enrollment** | `app/api/create-order/`, `verify-payment/`, `enroll-free/`, `components/ActiveCohorts.tsx`, `data/coupons.ts` | `payment-integration` | `api-security-best-practices`, `test-driven-development` |
| **API routes (new or changed)** | `app/api/**/route.ts`, `app/track-time/` | `api-endpoint-builder`, `api-security-best-practices` | `api-design-principles` |
| **Security review / hardening** | anything handling PII, payments, admin data, user HTML | `api-security-best-practices`, `security-audit` | `vulnerability-scanner`, `frontend-security-coder`, `frontend-mobile-security-xss-scan`, `secrets-management` |
| **Next.js pages, routing, server vs client components** | `app/**/page.tsx`, `app/layout.tsx`, `next.config.mjs` | `nextjs-app-router-patterns`, `nextjs-best-practices` | `react-nextjs-development` |
| **React components, state, performance** | `components/`, `app/learning/[slug]/page.tsx` | `react-best-practices`, `react-patterns` | `react-ui-patterns`, `react-component-performance`, `senior-frontend`, `frontend-api-integration-patterns` |
| **TypeScript typing / re-enabling type checks** | `tsconfig.json`, `data/*.ts` | `typescript-expert` | — |
| **Refactoring large files / tech debt** | `app/learning/[slug]/page.tsx` (~2k lines), unused components | `code-refactoring-tech-debt`, `repo-native-refactor` | `orchestrate-batch-refactor` |
| **Bug fixing** | any | `bug-fix-workflow` (local, `.claude/skills/bug-fix-workflow/SKILL.md`: branch, Jira bug, RCA, fix, PR, Jira comment), `systematic-debugging` | `debugging-strategies` |
| **Playwright tests (UI + API)** | `tests/`, `playwright.config.ts` | `e2e-testing`, `e2e-testing-patterns` | `playwright-skill`, `api-contract-testing`, `test-driven-development` |
| **CI / GitHub Actions** | `.github/workflows/` | `github-actions-advanced` | `github-actions-debugger` |
| **Code review before merge** | any diff | `code-review-and-quality` | `five-axis-code-review` |
| **Deployment, env vars, performance on Vercel** | `next.config.mjs`, env config | `vercel-deployment` | `vercel-optimize` |
| **AI tutor (replace mock with real LLM)** | `app/api/ai-tutor/` | `llm-app-patterns`, `llm-app-security` | `llm-application-dev-ai-assistant`, `llm-application-dev-prompt-optimize`, `vercel-ai-sdk-expert` |
| **API docs / Swagger** | `app/api-docs/page.tsx` | `openapi-spec-generation` | `api-design-principles` |
| **Sales pages, conversion, copy** | `app/courses/`, `components/HeroVSL.tsx`, `PainPoints`, `Differentiators`, `FAQ` | `page-cro`, `copywriting` | `signup-flow-cro`, `form-cro` (contact/mentorship forms) |
| **SEO, Open Graph, share previews** | `app/layout.tsx` metadata, `app/share/[videoId]/` | `nextjs-seo-indexing`, `seo-aeo-meta-description-generator` | `seo-technical`, `seo-schema`, `youtube-seo-optimizer` |
| **Transactional / marketing email** | `app/api/send-email/`, email HTML in webhook & verify-payment | `email-sequence` | `frontend-mobile-security-xss-scan` (escape user input) |
| **UI design (dark theme, Tailwind, Framer Motion)** | `app/globals.css`, `tailwind.config.ts`, components | `frontend-ui-dark-ts`, `tailwind-design-system` | `design-taste-frontend`, `frontend-design` |
| **PRDs, specs, product docs** | `docs/` | `product-manager`, `doc-coauthoring` | `to-prd` |

---

## 3. Version reconciliation (read before applying a skill)

| Topic | This repo | Skill assumption | What to do |
|---|---|---|---|
| Clerk | `@clerk/nextjs` **v4**, `authMiddleware` | `clerk-auth` documents `clerkMiddleware` / `createRouteMatcher` (v5+) | Use v4 APIs unless the task is the Clerk upgrade itself; treat the skill as the migration target |
| Auth provider | **Clerk** (not Supabase Auth) | `nextjs-supabase-auth` assumes Supabase Auth | Use only its RLS / server-client guidance, never its login flow |
| Supabase client | Anon key in browser and server; no Clerk JWT passed | Skills assume authenticated Supabase sessions | Privileged writes belong in server routes; see PRD §13 S2 |
| Payments | **Razorpay** (Orders API + Checkout.js, HMAC signature) | `payment-integration` is Stripe/PayPal-centric | Apply the principles (server pricing, signature verification, order↔entitlement binding, idempotency); use Razorpay APIs |
| Next.js | `next@^14.2`, App Router, `params` passed synchronously | Some skills target Next 15+ (async `params`, new caching defaults) | Follow `AGENTS.md`: check `node_modules/next/dist/docs/` for the installed version |
| Tailwind | **v3** (`tailwind.config.ts`) | `tailwind-patterns` is v4 (CSS-first) | Do not use `tailwind-patterns` |
| Testing | Playwright TS, `tests/` with `ui/` + `api/` split, `x-api-key` for API tests | Generic Playwright setups | Keep the existing folder structure and auth strategy in `tests/README.md` |

---

## 4. Do not use

- **Offensive-security skills** (`hunt-nextjs`, `hunt-auth-bypass`, `api-security`, `broken-authentication`, and anything tagged `risk: offensive`): use them only if the owner explicitly asks for an authorised security test of this site.
- **`tailwind-patterns`**: Tailwind v4 only.
- Anything outside §2: the rest of the catalog is unrelated to this stack (mobile, Azure, .NET, etc.). If a task truly needs a new skill, search `agents/skills_index.json` by id/description, then add it to §2 so future sessions pick it up.

## 5. Known gaps (no dedicated skill exists)

Razorpay specifics · Pyodide / in-browser Python · Monaco editor · Git simulator · LMS/course-platform domain logic. For these, rely on the repo code, the PRD, and the general React/security/testing skills above.

---

*Maintenance:* when a skill is added, removed, or found unhelpful, update this file in the same change. Skill IDs were verified to exist at submodule commit `7abeb1bd1`.
