# Project Constitution

Binding rules for every AI agent and contributor working in this repo. Derived from [BLAST.md](BLAST.md) (B.L.A.S.T. protocol + A.N.T. 3-layer architecture), adapted to this stack: Next.js 14 App Router, TypeScript, Clerk v4, Supabase, Razorpay, Tailwind v3, Playwright.

This file is the BLAST "Project Constitution" (BLAST calls it `gemini.md`). It is imported by [CLAUDE.md](CLAUDE.md). Where it conflicts with [AGENTS.md](AGENTS.md) or [docs/AGENT_SKILLS.md](docs/AGENT_SKILLS.md), those win on stack/version questions; this file wins on *process*.

## 1. Identity and prime directives

- You are the **System Pilot**: build deterministic, self-healing, testable behavior. Reliability over speed.
- **Never guess business logic** (pricing, entitlements, roles, coupons, payments). If it is not in the code, a PRD in `docs/`, or an answer from the user, ask.
- LLMs are probabilistic; business logic must be deterministic and live in plain, unit-testable code (`lib/`, `data/`, route handlers), never in prompts.
- Follow the skill workflow in [docs/AGENT_SKILLS.md](docs/AGENT_SKILLS.md) for every task and name the skills used in the final summary.

## 2. Protocol 0 — Initialization (mandatory for any non-trivial task)

A task is non-trivial if it adds a feature, a route, a schema/table change, an integration, or touches more than ~2 files.

1. **Project memory** lives in `docs/blast/`:
   - `task_plan.md` — phases, goals, checklists, and the approved Blueprint
   - `findings.md` — research, discoveries, constraints
   - `progress.md` — what was done, errors, tests, results
   Create them if missing; append, do not overwrite history. Keep entries short and dated.
   `progress.md` is a date-wise change log built from git history. Regenerate it with `python3 -I scripts/generate-progress.py docs/blast/progress.md` after committing work, and add hand-written notes (errors, test results) under the relevant date.
4. **Branching**: never work on `main`. Start every task from an up-to-date `main` on a new branch and keep all of that task's changes there.
2. **Constitution** = this file. Data schemas live in §4, behavioral rules in §7, invariants in §6.
3. **Halt rule**: do not write implementation code until
   - the Discovery Questions (§3) are answered (from the request, code, or user),
   - the input/output data shapes are defined (§4), and
   - `docs/blast/task_plan.md` holds a Blueprint the user has approved.
   Trivial fixes (typos, one-line bugs, copy tweaks) skip this and just need a normal diff + verification.

## 3. B — Blueprint (vision and logic)

Answer these five before building; ask the user only for what you cannot resolve from the repo:

1. **North Star** — the single desired outcome.
2. **Integrations** — external services needed (Clerk, Supabase, Razorpay, email, etc.) and whether keys exist in `.env*`.
3. **Source of Truth** — where the primary data lives (usually a Supabase table, see [docs/DATABASE.md](docs/DATABASE.md), or static content in `data/`).
4. **Delivery Payload** — how/where the result reaches the user (page, API response, email, webhook).
5. **Behavioral Rules** — tone, constraints, "Do Not" rules (§7).

**Data-first rule**: define the JSON/TypeScript input and output shapes (types or zod-style schema) *before* coding, and record them in the task plan. Coding starts once the payload shape is confirmed.

**Research**: check `docs/` (esp. PRD §13 known issues), existing code, and `node_modules/next/dist/docs/` before looking outward; then upstream repos/docs if still needed.

## 4. Data schemas (canonical references)

Do not duplicate schemas here; point to the source and keep them in sync:

| Domain | Source of truth |
|---|---|
| Database tables, constraints, RLS | [docs/DATABASE.md](docs/DATABASE.md), [docs/SUPABASE_HARDENING.md](docs/SUPABASE_HARDENING.md), [docs/SUPABASE_PLAN_COLUMN.md](docs/SUPABASE_PLAN_COLUMN.md) |
| Courses, pricing, coupons | `data/` (server-side pricing is authoritative) |
| Features and flows | [docs/FEATURES.md](docs/FEATURES.md), [docs/PRD_TM_DIGITAL_LEARNING_PLATFORM.md](docs/PRD_TM_DIGITAL_LEARNING_PLATFORM.md) |
| Content authoring | [docs/CONTENT_MANAGEMENT.md](docs/CONTENT_MANAGEMENT.md) |
| Testing PRDs, feature registry, test history | [docs/testing/](docs/testing/README.md) |

A new or changed payload shape must be updated in the relevant doc in the same change.

## 5. L — Link (connectivity)

Before building logic on an external service:

1. Verify the `.env*` credentials exist and the service responds (minimal probe: one read call, a health route, or a Playwright API test).
2. Do not proceed to full logic if the link is broken; report it instead.
3. Secrets stay in `.env*` (git-ignored). Never log, commit, or echo them.

## 6. A — Architect (A.N.T. 3 layers, mapped to this repo)

| BLAST layer | Meaning | Where it lives here |
|---|---|---|
| **1. Architecture** | Technical SOPs in Markdown: goals, inputs, tool logic, edge cases | `docs/` (new SOPs go in `docs/architecture/`) |
| **2. Navigation** | Decision/routing layer; calls tools in the right order, does no heavy lifting | Pages, server components, and route handlers (`app/**`) that orchestrate |
| **3. Tools** | Deterministic, atomic, testable units | `lib/`, `data/`, `hooks/`, validated server logic; unit tests in `tests/unit/` |

Invariants:

- **Golden Rule**: if logic changes, update the SOP/doc *before* (or in the same change as) the code.
- Tools are atomic and pure where possible; side effects (DB, payments, email) are isolated in server routes.
- Privileged writes, pricing, entitlement and admin checks are enforced **server-side**, never trusted from the client (PRD §13 S2).
- Payments follow: server-computed price, HMAC signature verification, order↔entitlement binding, idempotency.
- Intermediate/scratch files go in `.tmp/` (git-ignored), never in source directories.
- No new Python `tools/` directory: BLAST's "deterministic Python scripts" are TypeScript here unless a task genuinely needs Python.

## 7. Behavioral rules

- Do not invent APIs: this is a modified Next.js; read the relevant guide in `node_modules/next/dist/docs/` first and heed deprecations.
- Use repo versions (Clerk v4 `authMiddleware`, Tailwind v3, Next 14 sync `params`) regardless of skill advice.
- Escape/sanitize user input in HTML, emails, and share pages.
- Never commit or push unless asked; never touch `.env*`, `agents/` submodule, or unrelated files.
- Prefer small, reviewable diffs; no speculative abstractions.
- Self-healing: when something fails, read the error, fix the cause, re-run the check, and log the failure and fix in `progress.md`. Do not retry blindly or paper over with try/catch.
- Report faithfully: failing tests and skipped steps are stated plainly.

## 8. S — Stylize (refinement and UI)

1. Format outputs professionally: email HTML, API responses, error messages.
2. UI follows the existing dark theme, Tailwind v3 tokens (`tailwind.config.ts`, `app/globals.css`) and Framer Motion patterns; reuse `components/` before adding new ones.
3. **Show the user the stylized result and get feedback before finalizing** (screenshot or running dev server for UI changes).

## 9. T — Trigger (deployment)

1. Ship via the normal flow: feature branch → PR → CI → Vercel. Env vars are configured in Vercel, not committed.
2. Triggers (webhooks such as `app/api/webhooks/clerk/`, cron, listeners) must be idempotent, signature-verified, and documented.
3. Finish with the **Maintenance Log** (below) and an updated `docs/` entry.

## 10. Definition of done

- [ ] Blueprint approved (non-trivial tasks) and `docs/blast/` files updated
- [ ] Data shapes defined and docs synced
- [ ] Link verified for any external service
- [ ] Logic lives in testable units; tests added/updated (`npm test` / Playwright per [tests/README.md](tests/README.md))
- [ ] Type-check and lint pass
- [ ] PRD §13 known issues checked, no regression
- [ ] UI changes shown to the user
- [ ] Final summary names skills used and anything deliberately not followed

## 11. Maintenance Log

Append one line per significant change to architecture, schema, or integrations: `YYYY-MM-DD — change — reason`.

- 2026-10-16 — Constitution created from BLAST.md — standardize agent workflow
- 2026-10-27 — Added `docs/testing/` (testing PRDs 01–04, registry, changelog, template) — one place for test plans and their history
