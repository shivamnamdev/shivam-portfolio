# Testing Documentation Hub

Single home for every testing PRD, plan and history entry for the TM – Digital Learning Experience Platform. Process rules come from [CONSTITUTION.md](../../CONSTITUTION.md) and [BLAST.md](../../BLAST.md); this folder is where the *test* side of that process is recorded.

> **Rule:** a feature is not "done" until its testing PRD exists here, the registry below is updated, and [CHANGELOG.md](CHANGELOG.md) has a dated line.

## Folder layout

```text
docs/testing/
  README.md        # this index: precedence, feature registry, workflow
  CHANGELOG.md     # dated history of every doc/plan/spec change (append only)
  TEMPLATE.md      # copy this to start a new PRD
  prd/             # one testing PRD per feature, numbered in execution order
  workbooks/       # manual test-case workbooks (.xlsx) generated from the PRDs, same layout as the owner's PRD 01-03 files
  cases/           # the same cases as CSV (used by scripts/case-coverage.mjs)
    01-ui-authentication-access-control.md
    02-ui-public-pages-navigation.md
    03-ui-course-discovery-pricing.md
    04-ui-checkout-flow.md
    05-ui-free-enrollment-flow.md
    06-ui-student-dashboard-course-access.md
    07-ui-learning-experience.md
    08-ui-admin-portal.md
```

Related locations (not moved, linked here so the trail is complete):

| What | Where |
| --- | --- |
| BLAST project memory (plan, findings, progress) | [docs/blast/](../blast/) |
| Product-wide PRD, known issues (§13) | [docs/PRD_TM_DIGITAL_LEARNING_PLATFORM.md](../PRD_TM_DIGITAL_LEARNING_PLATFORM.md) |
| Playwright specs and how to run them | [tests/](../../tests/), [tests/README.md](../../tests/README.md) |
| CI workflow | [.github/workflows/playwright.yml](../../.github/workflows/playwright.yml) |

**Run history:** [runs/README.md](runs/README.md) has one status page per full automation run (latest: [2026-10-31](runs/2026-10-31.md)).

## Test precedence (execution order)

Follow the real product journey: **user lands → signs in → buys / joins → learns → administers → data persists → performs under load.**

1. **UI** — highest impact first
2. **API**
3. **Database**
4. **Performance**

## Feature registry

Status values: `Planned` (no PRD) · `PRD draft` (written, not reviewed) · `PRD ready` (reviewed) · `Tests partial` · `Tests done`.

### Phase 1 — UI

| # | Feature | PRD | Status | Automation today | Gaps |
| --- | --- | --- | --- | --- | --- |
| 01 | Authentication & Access Control | [01](prd/01-ui-authentication-access-control.md) | PRD ready · **Tests done** (203 of 204 manual cases automated; 155 passed in the last full run) | `tests/ui/auth/route-protection.spec.ts`, `sign-in-out-session.spec.ts`, `access-control.spec.ts` (all roles, sessions, enrolment, admin, SCP-29), plus `smoke.spec.ts` | `AUTH-PROT-004` blocked (no public link to a protected route exists). |
| 02 | Public Pages & Navigation | [02](prd/02-ui-public-pages-navigation.md) | PRD ready · **Tests done** (160 of 161; one open: PUB-A11Y-010) | `tests/ui/public/landing-navigation.spec.ts`, `catalog-reliability.spec.ts`, `mobile-accessibility.spec.ts`, plus `smoke.spec.ts` | Still to do: CTA State & Context, Course Detail & Conversion, Redirect & Access Handoff (share links), Logged-in Navigation, both end-to-end sheets, `PUB-REL-009/010`; `PUB-A11Y-010` belongs to the Learning Lab PRD. |
| 03 | Course Discovery & Pricing | [03](prd/03-ui-course-discovery-pricing.md) | PRD ready · 140 manual cases not yet executed · Tests partial | `tests/ui/sales-funnel.spec.ts` (per-course INR/USD toggle, closed state), `tests/unit/pricing.spec.ts` | Coupon UI (needs sign-in), CTA states for enrolled users, open-cohort data. |
| 04 | Checkout Flow | [04](prd/04-ui-checkout-flow.md) | **PRD ready** · **114 manual cases written** ([workbook](workbooks/%5BUI%5D%20Checkout%20Flow%20Testing.xlsx), 10 sheets, ids `CHK-…`) · automation: mocked-gateway cases already covered under PRD 03 ids | `tests/*/qa-fixture.spec.ts` (fixture, coupon, ₹10 / $1 orders) | Open: ~61 cases still to automate (CTA states for visitors, API error codes, idempotent verification, email, mobile/cross-browser). Real Razorpay test-mode run works (see below). |
| 05 | Free Enrollment Flow | [05](prd/05-ui-free-enrollment-flow.md) | **PRD draft** (awaiting owner review) · **71 manual cases written** ([workbook](workbooks/%5BUI%5D%20Free%20Enrollment%20Flow%20Testing.xlsx), 8 sheets, ids `FRE-…`) · 36 scenarios FE-01…36, about 20 already covered by PRD 03 automation | `tests/ui/discovery/checkout-flow.spec.ts`, `checkout-real-db.spec.ts` | New scenarios still to write: visitor gate, forged/closed/non-zero API requests, modal copy and links, stale tab, activity log, cross-browser. Known failures: duplicate rows under concurrency, redirect, modal copy. |
| 06 | Student Dashboard & Course Access | [06](prd/06-ui-student-dashboard-course-access.md) | **PRD ready** (reviewed 2026-10-30) · **82 manual cases written** ([workbook](workbooks/%5BUI%5D%20Student%20Dashboard%20%26%20Course%20Access%20Testing.xlsx), 9 sheets, ids `DSH-…`) · 42 scenarios SD-01…42, about 10 already covered by PRD 01 access automation | `tests/ui/auth/access-control.spec.ts` (empty dashboard, Course A/B, lobby denied/admin, enrolment changes) | New: card actions, several courses, streak/XP/leaderboard, resources, failures, mobile. Needs a fixture live link and stats snapshot (TR-2, TR-3). |
| 07 | Learning Experience (Learning Lab) | [07](prd/07-ui-learning-experience.md) | **PRD draft** (awaiting owner review) · 60 scenarios LX-01…60 · **107 manual cases written** ([workbook](workbooks/%5BUI%5D%20Learning%20Experience%20Testing.xlsx), 10 sheets, ids `LRN-…`) | none yet (PRD 01 only opens the page) | Needs mocks for YouTube/GitHub/AI, progress snapshot/restore and exam state helpers (TR-2…TR-6). Expected failures: SCP-32/33/34, likes table. |
| 08 | Admin Portal | [08](prd/08-ui-admin-portal.md) | **PRD draft** (awaiting owner review) · 45 scenarios AD-01…45 · **83 manual cases written** ([workbook](workbooks/%5BUI%5D%20Admin%20Portal%20Testing.xlsx), 8 sheets, ids `ADM-…`) | `tests/ui/auth/access-control.spec.ts` (admin gate: AD-01…03 covered) | New: KPIs, tabs and tables, code viewer, manual enrollment, admin-API refusals, failures. Expected failure: data readable with the anonymous key (R-AD-1, SCP-39). |

### Phase 2 — API

| # | Feature | PRD | Status | Automation |
| --- | --- | --- | --- | --- |
| 09 | Payment APIs (`create-order`, `verify-payment`) | [09](prd/09-api-payment.md) | PRD draft · 41 cases (`PAYA-…`) · **Tests done** (39 automated, 2 open) | `tests/api/payment-apis.spec.ts` |
| 10 | Enrollment APIs (`enroll-free`, `admin/enroll`) | [10](prd/10-api-enrollment.md) | PRD draft · 28 cases (`ENRA-…`) · **Tests done** | `tests/api/enrollment-apis.spec.ts` |
| 11 | Clerk webhook and user-lookup APIs | [11](prd/11-api-clerk.md) | PRD draft · 26 cases (`CLKA-…`) · **Tests done** (1 manual) | `tests/api/clerk-apis.spec.ts`, `webhook.spec.ts` |
| 12 | Email API (`send-email`) | [12](prd/12-api-email.md) | PRD draft · 13 cases (`EMLA-…`) · **Tests done** (3 manual) | `tests/api/email-api.spec.ts` |
| 13 | AI tutor, certificate, track-time and XP APIs | [13](prd/13-api-learning-support.md) | PRD draft · 19 cases (`AIA-…`) · **Tests done** | `tests/api/learning-apis.spec.ts` |

### Phase 3 — Database

| # | Feature | PRD | Status | Automation |
| --- | --- | --- | --- | --- |
| 14 | Database integrity (schema, constraints, access with the public key, data quality) | [14](prd/14-db-integrity.md) | PRD draft · 44 cases (`DBI-…`: 28 automated, 16 manual policy inventory) · **Tests done**; manual SQL inventory for the owner | `tests/db/db-integrity.spec.ts` |

### Phase 4 — Performance

| # | Feature | PRD | Status | Automation |
| --- | --- | --- | --- | --- |
| 15 | Performance budgets, latency, concurrency | [15](prd/15-perf-budgets.md) | PRD draft · 35 cases (`PRF-…`) · **Baseline measured on the dev server and on a production build**; sustained load (k6) open | `tests/perf/perf-budgets.spec.ts`, `perf-production.spec.ts` |

## Weightage rules (applied to every PRD)

Each PRD from 04 onward carries a **Testing Weightage** table (§15.1) and a **Test Environment, Data & Testability** table (§15.2). Weight = revenue/security impact × likelihood of regression. Raise the weight of anything that is (a) money, (b) access control, (c) listed in PRD §13 known issues, or (d) has broken before. PRDs 01–03 pre-date this rule; add the tables the next time they are revised.

## Workflow for a new feature (BLAST mapping)

| BLAST step | Do this here |
| --- | --- |
| **B — Blueprint** | Copy [TEMPLATE.md](TEMPLATE.md) to `prd/NN-<layer>-<feature>.md`. Answer the five discovery questions from code and [docs/blast/task_plan.md](../blast/task_plan.md); define input/output shapes. |
| **L — Link** | List the external services in PRD §15.2 and verify credentials exist (test-mode only). |
| **A — Architect** | Write scenario IDs in the Coverage Matrix. Logic changes update the PRD first, then the spec. |
| **S — Stylize** | Show the user the PRD / run output and get feedback before marking `PRD ready`. |
| **T — Trigger** | Tag specs (`@smoke`, `@regression`), wire CI, update the registry and [CHANGELOG.md](CHANGELOG.md). |

Update on every change: the registry row, [CHANGELOG.md](CHANGELOG.md), and the dated entries in [docs/blast/](../blast/).

## Decisions

| # | Decision | Status (2026-10-27) | Outcome |
| --- | --- | --- | --- |
| D1 | Open cohort for tests (PRD 04 TR-1) | **Done** | Real courses unchanged. QA-only fixture course `qa-checkout-sandbox` and free coupon `QA100`, gated by `NEXT_PUBLIC_QA_FIXTURES=1` ([TEST_DATA.md](TEST_DATA.md)). |
| D2 | Dedicated test users | **Decided** | Personas V1, V2, U1, S1, A1, C1, C2, SL1, SL2 mapped to accounts in [TEST_DATA.md](TEST_DATA.md). |
| D3 | Separate Supabase project | **Decided and in use** | Dedicated QA project exists. Variables needed are listed in [TEST_DATA.md](TEST_DATA.md); values go in `.env.qa` / GitHub Secrets, not in chat. |
| D4 | Email handling in tests | **Decided** | Emails go to the owner's inbox; the owner filters by a subject label. Tests use an identifiable subject prefix. |

## Open questions

All earlier questions (Q1 to Q10) are answered; see [CHANGELOG.md](CHANGELOG.md). Current open items:

| # | Question | Blocks |
| --- | --- | --- |
| Q11 | ~~PRD 02 order~~ **Done for the no-login sheets** (95 of 161). Next: share-link handoff, logged-in navigation, CTA state and conversion sheets (they need signed-in personas and the QA fixture course). | — |
| Q12 | PRD 03 and the checkout scenarios (CK-xx, about 47 overlapping cases) run against the QA fixture course. Confirm that the fixture course is the representative paid and free course (C1, C2). | PRD 03 / 04 specs |
| Q13 | CI: add the QA `SUPABASE_SERVICE_ROLE_KEY` as a GitHub secret and set `E2E_SEED_PERSONAS=1` (commented out in `playwright.yml`) so the seeded specs run on pushes to `main`? Until then they skip with a visible reason. | CI coverage |

## Document issues found while importing

Recorded in [CHANGELOG.md](CHANGELOG.md) (2026-10-27). Two PRDs have notes the authors should confirm:

* PRD 02 originally listed the product URL as `app.vwo.com` (a different product); changed to `shivamnamdev.com`.
* ~~PRD 03 §4.6 says purchases redirect to `/learning/[slug]`~~ **Resolved 2026-10-29 (owner): `/learning` is correct**; PRD 03 §4.6, its cases and the tests were updated.
