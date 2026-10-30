# 🧪 Playwright Automation Architecture

Welcome to the QA and Test Automation architecture for Shivam Academy. 

This document outlines how we use **Playwright** to perform automated End-to-End (E2E) UI testing and API Integration testing. Our goal is to ensure the Sales Funnel, Learning Management System (LMS), and Payment Gateways never break during deployments.

---

## 📂 Directory Structure

We strictly follow the Separation of Concerns principle for our test suite:

```text
tests/
  ├── api/                 # Machine-to-machine backend validation
  │   ├── crm.spec.ts      # Razorpay order creation, coupon logic, protected endpoints
  │   └── webhook.spec.ts  # Clerk webhook signature rejection
  ├── ui/                  # Browser-based End-to-End user journeys
  │   ├── sales-funnel.spec.ts # Tests pricing toggles and checkout UI
  │   └── smoke.spec.ts    # Public pages, route protection, share-page Open Graph
  ├── unit/pricing.spec.ts # Pure lib/pricing logic
  ├── config/              # Test configuration and credentials
  │   └── credentials.ts
  ├── auth.setup.ts        # Clerk login helper (kept for authenticated UI flows)
  ├── example.spec.ts      # Playwright starter smoke tests
  └── README.md            # This documentation file
```

---

> Test plans, PRDs and the feature registry live in [docs/testing/](../docs/testing/README.md). Write specs from those PRDs and update the registry when specs are added.

---

## ⚡ PR Smoke Suite

Tests in describe blocks tagged `@smoke` run on every pull request (Chromium only, read-only: no payments, emails or DB writes).

```bash
npm run test:smoke   # @smoke on Chromium (what PR CI runs)
npm run test:all     # everything, all browsers (what pushes to main run)
```

QA fixture runs (open course `qa-checkout-sandbox`, free coupon `QA100`) use their own server so they never reuse a dev server on 3000: `PORT=3100 NEXT_PUBLIC_QA_FIXTURES=1 NEXT_PUBLIC_QA_FREE_COUPON_USERS="<clerk ids>" npx playwright test`. Details in [docs/testing/TEST_DATA.md](../docs/testing/TEST_DATA.md).

Add `@smoke` to a describe title when a test guards a critical flow and runs in seconds. `.env.local` is loaded automatically for local runs.

## 🔐 Signed-in tests, seeded personas and the Allure report

Signed-in specs (`tests/ui/auth/`) sign personas in **without Google**: `tests/support/clerk.ts` asks the Clerk Backend API for a one-time sign-in token and redeems it in the browser (works for Google-only accounts; it refuses any key that is not `sk_test_`). Accounts and their roles are in [docs/testing/TEST_DATA.md](../docs/testing/TEST_DATA.md).

Enrollment-dependent specs need the QA persona state. With `E2E_SEED_PERSONAS=1` (plus `SUPABASE_SERVICE_ROLE_KEY` of the **QA** project) `tests/support/global-setup.ts` snapshots the personas' `user_enrollments` rows, applies the canonical state once, and `global-teardown.ts` restores the snapshot (a snapshot left by a crashed run is restored first; file `.tmp/e2e-enrollment-snapshot.json`). Without the flag those specs skip with an explicit reason.

```bash
# everything signed-in + seeded, own server and build dir (does not touch a dev server on 3000)
PORT=3100 E2E_SEED_PERSONAS=1 npx playwright test --project=chromium
# with the QA fixture course/coupon as well
PORT=3100 E2E_SEED_PERSONAS=1 NEXT_PUBLIC_QA_FIXTURES=1 NEXT_PUBLIC_QA_FREE_COUPON_USERS="<clerk ids>" npx playwright test --project=chromium
# failure report (Allure 3, Node only, no Java)
npm run report:allure && npm run report:allure:open
# which manual cases are automated (rewrites docs/testing/COVERAGE.md)
node scripts/case-coverage.mjs
```

Test titles carry the manual case ids in brackets (`[AUTH-PUB-001]`), which is how Allure, the coverage script and the workbooks line up. Failures never gate the automation work: they are collected in the Allure report.

---

## 🔐 Authentication Strategy

Modern applications use enterprise-grade security (like Clerk) which actively blocks automated bots. To test our application effectively, we use a hybrid authentication strategy.

### 1. UI Testing: The "Global Setup" Pattern
We do **not** log in before every single test. That is slow and flaky. 
Instead, we use Playwright's Project Dependencies.
* **How it works:** `auth.setup.ts` is available as a reusable login helper for authenticated UI journeys.
* **Current status:** The active UI specs in this folder are public-route tests and do not require Clerk login state.
* **When needed:** If you add authenticated UI specs, wire `auth.setup.ts` as a Playwright setup project and reuse the generated storage state.

### 2. API Testing: The "Admin API Key" Pattern
For pure API tests (where no browser is opened), relying on cookies can be unstable due to missing CSRF headers.
* **How it works:** We updated our backend routes (like `/api/create-order`) to accept a custom `x-api-key` header. 
* **The Logic:** The backend accepts either a valid Clerk session or a valid `x-api-key` that matches `ADMIN_API_KEY`.

---

## 🎯 Test Design Principles

### UI Testing: Resilience over Speed
In `sales-funnel.spec.ts`, we test the dynamic rendering of our Next.js application.
* **Network Idle:** We use `await page.waitForLoadState('networkidle')` to ensure the React Virtual DOM has fully painted the pricing data before we interact with it.
* **Locate by Role:** We use `page.getByRole('button', { name: '🇮🇳 India' })` instead of CSS selectors. This mimics how a real human (or a screen reader) interacts with the page, making our tests resistant to minor CSS class changes.

### API Testing: Negative Testing (Business Logic)
In `crm.spec.ts`, we aren't just checking if the server is awake; we are testing the **Business Logic**.
* **The Scenario:** We intentionally send an invalid coupon (`FAKE_COUPON_123`) to the payment route.
* **The Assertion:** We assert that the server returns a `400 Bad Request` and the exact error message `"Invalid coupon code"`. 
* **Why it matters:** Proving that the system *rejects* bad data is just as important as proving it accepts good data. This guarantees that nobody can hack the checkout process to get a free course.

---

## 🚀 CI/CD Integration (GitHub Actions)

This test suite is integrated directly into our deployment pipeline.

1. When a developer pushes code to GitHub, the `.github/workflows/playwright.yml` action triggers.
2. It provisions an Ubuntu server and installs Node.js and Playwright browsers.
3. **Environment Injection:** It securely pulls `ADMIN_API_KEY`, Razorpay keys, Clerk keys, and Supabase keys from **GitHub Secrets** and injects them into the test environment.
4. Playwright boots a Next.js dev server using `webServer.command` from `playwright.config.ts`.
5. It runs the entire test suite. If any test fails (e.g., an API route crashes), the deployment to Vercel is blocked, protecting the live production site.

---
*Maintained by the QA Engineering Team @ Shivam Academy*
## Real Razorpay test mode (opt-in)

`tests/ui/discovery/checkout-real-gateway.spec.ts` uses the real Razorpay overlay with `rzp_test_` keys and the demo bank page. It is skipped unless `E2E_REAL_GATEWAY=1` (a successful payment sends a receipt email). Steps and the command are in [docs/testing/TEST_DATA.md](../docs/testing/TEST_DATA.md).

### Specs that share the `edu` account

`tests/ui/dashboard/dashboard-edu-writes.spec.ts`, `tests/ui/dashboard/dashboard-stats-journeys.spec.ts`, `tests/ui/learning/learning-exam.spec.ts`, `tests/ui/discovery/checkout-real-db.spec.ts` and `tests/ui/discovery/checkout-real-flows.spec.ts` and `tests/ui/admin/admin-enroll-writes.spec.ts` all add and remove enrolments for `shivamnamdev.edu@gmail.com`. Playwright runs files in parallel, so run these together in one worker (`--workers=1` for these six files) or they can see each other's temporary enrolments.
