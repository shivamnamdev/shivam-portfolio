# **Product Requirements Document (PRD)**

**Product Name:** TM – Digital Learning Experience Platform  
**Feature:** \[PERF\] Performance Testing  
**Prepared By:** Shivam Namdev & Claude Code  
**Date:** Oct 30, 2026  
**Status:** PRD draft — baseline measured on the dev server; sign-off needs a production build

---

## 1. Feature Overview

Performance is tested last because it depends on everything before it. This PRD sets **budgets** (a number a page or call must stay under), measures a **baseline**, and checks a small amount of **concurrency**. It is not a full load test: sustained load needs a staging environment and a tool such as k6, and is recorded as an open case.

Where it runs: the dev server (`next dev` compiles on demand, ships unminified bundles). All time budgets are multiplied by `PERF_SCALE` (use about `0.4` against a production build). A production build must not be created in the working copy while the owner's dev server runs on port 3000 (both use `.next`), so the sign-off run is a follow-up in CI.

## 2. Business Objectives

* The sales page, checkout and dashboard feel instant; a slow page loses a buyer.
* A burst of visitors or a script cannot slow the site for paying learners.
* The admin portal stays usable as the user count grows.

## 3. Scope

**In scope:** page timing (TTFB, load, largest contentful paint, request count, JavaScript size), interaction latency, API latency and size, small concurrency bursts, payload size. **Out of scope:** Razorpay and Clerk speed, browser rendering on weak devices, CDN configuration, real load testing.

## 4. Budgets and Baseline (dev server, 2026-10-30)

| Case | Budget | Baseline |
| --- | --- | --- |
| Home, catalog, contact: load / LCP | 6 s / 4 s | about 0.3 s / 0.1 s warm, 13 requests, 2.7 MB JavaScript (dev bundles) |
| Course page | 7 s / 4.5 s, JS < 6 MB | load 0.3 s, LCP 1.7 s, 3.3 MB JS |
| Dashboard first card | 6 s | 3.9 s (one earlier run 8.0 s: it waits for four requests in a row, SCP-77) |
| Learning page lessons | 15 s | 3.5 s |
| Admin first row | 12 s | 4.2 s |
| Currency toggle, admin tab | 250 ms, 400 ms | 11 ms, 11 ms |
| `ai-tutor` p95 | 3 s | 2.5 s (the mock waits 1.2 s) |
| `get-all-users` p95, size per user | 5 s, 600 B | 0.9 s, 297 B (4 users) |
| `xp/sync` p95 | 3 s | 1.4 s |
| `generate-certificate` p95, size | 3 s, 100 KB | 0.9 s, 1.6 KB |
| `create-order` p95 | 5 s | 1.1 s |
| 30 parallel catalog requests p95 | 8 s | 0.4 s, no 5xx |
| 20 parallel `xp/sync` p95 | 10 s | 1.6 s, consistent result |
| 50 parallel refused `send-email` p95 | 5 s | 0.5 s, all 400 |

### 4.1 Production build, measured 2026-10-31 (`next build` + `next start -p 3101`, `PERF_SCALE=0.4`)

| Case | Budget | Measured |
| --- | --- | --- |
| Home / catalog / contact: load, LCP | 2.4 s / 1.6 s | 0.04 s / 0.1 s, 20 requests, 180 KB JavaScript (dev: 2.7 MB) |
| Course page: LCP, JavaScript | 1.8 s, 800 KB | 1.4 s, 252 KB |
| TTFB public pages | 600 ms | 12 to 18 ms |
| CLS | 0.1 | 0.003 |
| Largest image | 300 KB | 300 B |
| Slow phone (CPU 4x, slow 4G): LCP home / course | 4 s | 0.24 s / 0.71 s |
| Slow phone: learning page ready | 20 s | 5.8 s |
| Sign-in to account button | 8 s | 4.3 s |
| Dashboard first course card | 2.4 s | **3.9 s (over budget, SCP-77: four requests in a row)** |
| Learning page / admin first row | 6 s / 4.8 s | 2.2 s / 1.9 s |
| `get-all-users`, `xp/sync`, `create-order` p95 | 2 s, 1.2 s, 2 s | 1.5 s, 0.7 s, 0.2 s |
| Static chunk cache header | immutable, 1 year | met; HTML is gzip |
| Public pages cacheable | not private / no-store | **not met: every page is dynamic and `no-store` (SCP-80)** |
| API with personal data | no-store | **header missing (SCP-81)** |

Result: speed on one machine is good on a production build; the two real gaps are the dashboard request order (SCP-77) and the fact that every page is rendered per visit and cannot be cached (SCP-80). The k6 script `tests/perf/k6/browse-checkout.js` is ready for a staging run (k6 is not installed here, case `PRF-PRD-013`).

How to repeat: `NEXT_DIST_DIR=.next-prod NEXT_PUBLIC_QA_FIXTURES=1 npx next build`, `NEXT_DIST_DIR=.next-prod npx next start -p 3101`, then `PERF_PRODUCTION=1 PERF_SCALE=0.4 PORT=3101 E2E_SEED_PERSONAS=1 NEXT_PUBLIC_QA_FIXTURES=1 npx playwright test tests/perf`. The separate build folder keeps a dev server on port 3000 untouched.

## 5. Functional Requirements

| ID | Requirement |
| --- | --- |
| FR1 | Public pages load inside their budget with fewer than 120 requests. |
| FR2 | The pages a learner or the admin lives in show their first content inside their budget. |
| FR3 | The sales-page JavaScript stays inside its limit. |
| FR4 | Clicks that only change the screen paint within 250 to 400 ms. |
| FR5 | Every API answers inside its budget; the user directory stays small per user. |
| FR6 | A burst of visitors, a burst of parallel calls from one learner and a burst of refusals get no 5xx and stay inside the budget. |
| FR7 | Payloads stay small. |

## 6. Test Coverage Matrix

35 cases in [the workbook](../workbooks/%5BPERF%5D%20Performance%20Testing.xlsx) (ids `PRF-…`) and [`cases/prd15-performance.csv`](../cases/prd15-performance.csv). Automation: `tests/perf/perf-budgets.spec.ts` (18 tests, dev server) and `tests/perf/perf-production.spec.ts` (15 tests, production build; skip unless `PERF_PRODUCTION=1`). Open: 1000+ users, sustained load, k6 run.

## 7. Risks

| Risk | Note |
| --- | --- |
| R-PF-1 | The dashboard waits for four sequential requests before it shows a course card (SCP-77). |
| R-PF-2 | `get-all-users` pages through every Clerk user (up to 5000) on each admin load and the browser then searches the list for every table row (quadratic work in the render). |
| R-PF-3 | The admin page downloads the whole of `user_enrollments`, `assignment_progress`, `video_progress` and `user_stats` (no paging) and filters in the browser. |
| R-PF-4 | The learning page is one 2000-line client component with Monaco, Pyodide and the YouTube player: first load is heavy on a phone (SCP-33/34). |
| R-PF-5 | `ai-tutor` waits 1.2 s on purpose; a real model will be slower and needs a timeout. |
| R-PF-6 | No sustained-load figures exist; the Supabase and Vercel plan limits are unknown. |

## 8. Weightage and Testability

Checkout and dashboard 35% · API 25% · concurrency 20% · other pages 15% · size 5%. Run: `PERF_SCALE=0.4 npx playwright test tests/perf` against a production build. Numbers are written as `perf` annotations on each test and appear in the HTML and Allure reports.

## 9. Definition of Done

Budgets met on a production build (all but SCP-77, SCP-80, SCP-81 today), baseline recorded, open cases (1000+ users, sustained load, k6) assigned to the CI/staging follow-up, CHANGELOG line added.
