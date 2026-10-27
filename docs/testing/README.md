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
    01-ui-authentication-access-control.md
    02-ui-public-pages-navigation.md
    03-ui-course-discovery-pricing.md
    04-ui-checkout-flow.md
```

Related locations (not moved, linked here so the trail is complete):

| What | Where |
| --- | --- |
| BLAST project memory (plan, findings, progress) | [docs/blast/](../blast/) |
| Product-wide PRD, known issues (§13) | [docs/PRD_TM_DIGITAL_LEARNING_PLATFORM.md](../PRD_TM_DIGITAL_LEARNING_PLATFORM.md) |
| Playwright specs and how to run them | [tests/](../../tests/), [tests/README.md](../../tests/README.md) |
| CI workflow | [.github/workflows/playwright.yml](../../.github/workflows/playwright.yml) |

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
| 02 | Public Pages & Navigation | [02](prd/02-ui-public-pages-navigation.md) | PRD ready · **Tests partial** (95 of 161 cases; 71 tests: 68 pass, 3 fail on real findings) | `tests/ui/public/landing-navigation.spec.ts`, `catalog-reliability.spec.ts`, `mobile-accessibility.spec.ts`, plus `smoke.spec.ts` | Still to do: CTA State & Context, Course Detail & Conversion, Redirect & Access Handoff (share links), Logged-in Navigation, both end-to-end sheets, `PUB-REL-009/010`; `PUB-A11Y-010` belongs to the Learning Lab PRD. |
| 03 | Course Discovery & Pricing | [03](prd/03-ui-course-discovery-pricing.md) | PRD ready · 140 manual cases not yet executed · Tests partial | `tests/ui/sales-funnel.spec.ts` (per-course INR/USD toggle, closed state), `tests/unit/pricing.spec.ts` | Coupon UI (needs sign-in), CTA states for enrolled users, open-cohort data. |
| 04 | Checkout Flow | [04](prd/04-ui-checkout-flow.md) | **PRD ready** · Tests: fixture guards only | `tests/*/qa-fixture.spec.ts` (fixture, coupon, ₹10 / $1 orders) | Checkout scenarios CK-xx wait for the sign-in helper and the enrolled-student account (Q8). Fixture course is built. |
| 05 | Free Enrollment Flow | — | Planned | none | 100% coupon, *Enroll for Free*, no Razorpay, access granted. |
| 06 | Student Dashboard & Course Access | — | Planned | none | My Enrolled Courses, Browse Catalog, Join Live, Recordings, empty state. |
| 07 | Learning Lab | — | Planned | none | Player, tabs, Practice (Pyodide), Git lab, AI tutor, exams. |
| 08 | Admin Portal | — | Planned | none | KPI/CRM, manual enrollment, validation, view code. |

### Phase 2 — API

| # | Feature | PRD | Status | Automation today |
| --- | --- | --- | --- | --- |
| 09 | Payment APIs (`create-order`, `verify-payment`) | — | Planned | `tests/api/crm.spec.ts` (auth, unknown course, closed cohort, invalid coupon) |
| 10 | Enrollment APIs (`enroll-free`, `admin/enroll`) | — | Planned | anonymous rejection only |
| 11 | Clerk / webhook / user-lookup APIs | — | Planned | `tests/api/webhook.spec.ts`, anonymous rejection of user-directory routes |
| 12 | Email APIs (`send-email`) | — | Planned | invalid email, honeypot |
| 13 | AI tutor and certificate APIs | — | Planned | none |

### Phase 3 — Database

| # | Feature | PRD | Status |
| --- | --- | --- | --- |
| 14 | Data integrity in Supabase (`user_enrollments`, admin activity log, progress, CRM lookup) | — | Planned |

### Phase 4 — Performance

| # | Feature | PRD | Status |
| --- | --- | --- | --- |
| 15 | Checkout, auth, learning lab, admin CRM, backend latency | — | Planned |

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
* PRD 03 §4.6 says purchases redirect to `/learning/[slug]`; the code routes the success modal to `/learning` (see PRD 04 R-CK-7).
