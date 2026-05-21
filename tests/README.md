# 🧪 Playwright Automation Architecture

Welcome to the QA and Test Automation architecture for Shivam Academy. 

This document outlines how we use **Playwright** to perform automated End-to-End (E2E) UI testing and API Integration testing. Our goal is to ensure the Sales Funnel, Learning Management System (LMS), and Payment Gateways never break during deployments.

---

## 📂 Directory Structure

We strictly follow the Separation of Concerns principle for our test suite:

```text
tests/
  ├── api/                 # Machine-to-machine backend validation
  │   └── crm.spec.ts      # Tests Razorpay order creation and coupon logic
  ├── ui/                  # Browser-based End-to-End user journeys
  │   └── sales-funnel.spec.ts # Tests pricing toggles and checkout UI
  ├── config/              # Test configuration and credentials
  │   └── credentials.ts
  ├── auth.setup.ts        # Clerk login helper (kept for authenticated UI flows)
  ├── example.spec.ts      # Playwright starter smoke tests
  └── README.md            # This documentation file
```

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