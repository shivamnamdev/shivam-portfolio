# **Product Requirements Document (PRD)**

**Product Name:** TM – Digital Learning Experience Platform  
**Product URL:** [https://shivamnamdev.com/](https://shivamnamdev.com/)  
**Feature:** \[UI\] Free Enrollment Flow Testing  
**Prepared By:** Shivam Namdev & Claude Code  
**Date:** Oct 29, 2026  
**Status:** PRD draft — written from the code and the owner's topic list; waiting for owner review (see [../README.md](../README.md))

---

## **1\. Feature Overview**

The free enrollment flow lets a signed-in learner join a course **without paying** when the final price is zero. The only way to reach a zero price today is a coupon that discounts the full price (a 100% coupon, or a fixed coupon larger than the price). The flow replaces the Razorpay step with a direct call to the platform and ends with the same success modal as a paid purchase.

It is implemented in `components/ActiveCohorts.tsx` and one server route:

* `POST /api/enroll-free` — re-checks the course, the coupon and the price on the server; grants the enrollment through `lib/enrollments.ts`; logs an admin activity entry.

This PRD validates the **UI behaviour** of the free path: the CTA switch from *Buy Now* to *Enroll for Free*, the guarantee that no payment step appears, the loading and error states, the success modal, the redirect, and what the sales page and the dashboard show afterwards. The UI-visible contract of `/api/enroll-free` is asserted here. Deep API and database checks belong to the API and Database PRDs.

Free enrollment is prioritised fifth because it reuses everything before it:

1. [Authentication & Access Control](01-ui-authentication-access-control.md) — the learner must be signed in.
2. [Public Pages & Navigation](02-ui-public-pages-navigation.md) — the learner must reach the sales page.
3. [Course Discovery & Pricing](03-ui-course-discovery-pricing.md) — the coupon and the zero price must be right.
4. [Checkout Flow](04-ui-checkout-flow.md) — the success modal, redirect and enrolled state are shared.

> **Overlap with PRD 03 and PRD 04.** PRD 03 already holds 11 free-enrollment cases (`CDP-FREE-001` … `011`). This PRD does not duplicate them. It adds the end-to-end journeys, the negative and security scenarios, the state model and the risks that those cases do not cover, and references `CDP-FREE-xx` where a case already exists (section 10).

> **Testability.** Real cohorts are closed. Every scenario here runs against the QA fixture course `qa-checkout-sandbox` with the QA-only coupon `QA100` ([../TEST_DATA.md](../TEST_DATA.md)). The public coupon `EXISTINGSTUDENT_BATCH03` also makes the fixture free (₹1,999 off a ₹10 course).

---

## **2\. Business Objectives**

### Primary Goals

* Let eligible learners (existing students, invited users, promotions) enroll for free with no friction and no payment prompt.
* Never charge a learner who should be free, and never enroll a learner for free who should pay.
* Guarantee exactly one enrollment per learner and course, however many times the button is clicked.
* Give the same onboarding as a paid purchase: confirmation, WhatsApp group, route to the course.
* Keep coupon rules (restricted users, price floor of zero) deterministic and server-enforced.

### Success Indicators

* A free enrollment completes in one click after the coupon is applied.
* Zero Razorpay calls on the free path.
* Zero duplicate `user_enrollments` rows.
* The success modal copy and redirect match the product (no "payment verified" text without a payment).

---

## **3\. Target Users**

| User | Needs from this flow |
| ----- | ----- |
| Existing student with a loyalty / batch coupon | Enroll in the next batch for free. |
| Invited user with a restricted coupon | Coupon works for them and for nobody else. |
| Visitor (signed out) | Prompted to sign in; nothing is enrolled. |
| Already-enrolled student | Sees *Go to Dashboard*, not *Enroll for Free*. |
| Admin / support | Free enrollments are logged with the coupon used. |
| QA / automation | Repeatable free enrollment on the fixture course with clean-up. |

Personas (see [../TEST_DATA.md](../TEST_DATA.md)): U1 (no enrolments, may use `QA100`), S1 (enrolled in another course), V1 (visitor), A1 (admin, read-only).

---

## **4\. Scope**

### **In Scope**

* Coupon that makes the price zero, in INR and in USD
* CTA switch *Buy Now* ⇄ *Enroll for Free* when the coupon is applied, replaced or removed
* No Razorpay script, order or overlay on the free path
* Request contract of `POST /api/enroll-free` (`courseId`, `currency`, `couponCode`)
* Loading / disabled state, double-click and rapid-click behaviour
* Success modal (copy, WhatsApp link, *Go to Dashboard*) and its redirect
* Error responses: unauthorized, closed cohort, invalid or restricted coupon, price not zero, server failure
* Sales page after enrollment (enrolled CTA, hidden coupon box) and the dashboard listing
* Repeat enrollment in the same course (idempotent response)
* Sign-in gate for visitors, mobile viewport, keyboard use

### **Out of Scope**

* Paid checkout and Razorpay — PRD 04
* Coupon discovery, price display and messages before the zero price — PRD 03
* Admin manual enrollment (`/api/admin/enroll`) — Admin PRD
* Detailed API contract tests and database constraints — API and Database PRDs
* Email content (the free path sends no receipt email today; see risk R-FE-8)
* Performance and load — Performance PRD

---

## **5\. Free Enrollment State Model**

| State | Signed in | Enrolled | Coupon applied | Final price | Rendered CTA |
| ----- | ----- | ----- | ----- | ----- | ----- |
| F1 | No | — | none | \> 0 | **Buy Now**; coupon *Apply* prompts sign-in |
| F2 | Yes | No | none | \> 0 | **Buy Now (INR/USD)** |
| F3 | Yes | No | valid, price \> 0 | \> 0 | **Buy Now**, discounted price |
| F4 | Yes | No | valid, price \= 0 | 0 | **Enroll for Free**, price shown as ₹0 / $0 |
| F5 | Yes | No | F4 request in flight | 0 | **Processing…**, disabled, spinner |
| F6 | Yes | No | F4 request succeeded | 0 | Success modal **Welcome Aboard\!** |
| F7 | Yes | Yes | any | any | **You are Enrolled\! Go to Dashboard**; coupon box hidden |
| F8 | Yes | No | F4 request failed | 0 | Error alert; CTA enabled again; no modal |

Transitions that must hold: F3 → F4 when the coupon grows to 100%; F4 → F2/F3 when the coupon is replaced by an invalid or smaller one; F4 → F6 on success; F6 → F7 after the page is opened again (and ideally without a reload, see R-FE-3).

---

## **6\. Core Features & Capabilities**

### **6.1 Zero-Price Detection**

The CTA label is decided on the client from `applyCoupon(...)`; the same function runs on the server. Rules under test: percentage coupon of 100 gives 0; a fixed coupon larger than the price gives 0, never negative; the label changes in both currencies.

### **6.2 Enroll for Free Action**

On click: signed-out visitors get an alert and the Clerk sign-in; signed-in learners send `POST /api/enroll-free` with `courseId`, `currency` and `couponCode` only (no price, no user id, no slug). The button shows *Processing…* and is disabled until the response arrives.

### **6.3 No Payment Step**

The Razorpay script is not loaded, no order is created, no overlay opens. This is a revenue-leakage guard as much as a UX rule.

### **6.4 Server Re-Validation**

The server ignores the client's price: it resolves the coupon for the signed-in user, recomputes the price and answers *Payment required.* if it is above zero. Closed cohorts and unknown courses are rejected.

### **6.5 Success Modal and Hand-off**

On `success: true` the shared modal appears with the WhatsApp group link and *Go to Dashboard*. The button routes to `/learning` (the dashboard; owner decision 2026-10-29), but the modal says "Your payment is verified", which is wrong for a free enrollment (R-FE-2).

### **6.6 Post-Enrollment State**

The next visit to the sales page shows state F7; the dashboard `/learning` lists the course; `/learning/[slug]` opens for that learner.

### **6.7 Idempotency**

A second request for the same learner and course answers *You are already enrolled in this course.* and creates no second row. Today concurrent requests can still create several rows (R-FE-1).

---

## **7\. User Flows**

### Flow F-A — Free enrollment with a 100% coupon (happy path)

1. Signed-in learner opens the open-cohort sales page.
2. Applies the free coupon; message *Coupon applied successfully\!*; price ₹0; CTA *Enroll for Free*.
3. Clicks the CTA; *Processing…*; request `/api/enroll-free`.
4. Success modal; learner chooses *Go to Dashboard* (or the WhatsApp link).
5. Dashboard lists the course; the sales page now shows *You are Enrolled\!*.

### Flow F-B — Fixed coupon larger than the price

Same as F-A with `EXISTINGSTUDENT_BATCH03` on the fixture course (₹10 or $1): price floors at ₹0 / $0, never negative.

### Flow F-C — Visitor tries the free path

Visitor applies a coupon → alert *Please log in first…* + Clerk sign-in; no coupon is applied; nothing is enrolled.

### Flow F-D — Restricted coupon, wrong learner

A learner who is not on the coupon's list applies it → *This coupon is restricted to specific accounts.*; price unchanged; CTA stays *Buy Now*.

### Flow F-E — Repeat enrollment

Learner already enrolled opens the page → state F7. If a stale tab still shows *Enroll for Free*, clicking it answers *already enrolled* and creates no second row.

### Flow F-F — Failure

`/api/enroll-free` returns an error or the network drops → alert with the message, no modal, no redirect, CTA enabled again, no enrollment.

### Flow F-G — Coupon removed after the free price

Learner replaces the free coupon with an invalid one → price returns to the full price, CTA returns to *Buy Now*, and no free request can be sent.

---

## **8\. Functional Requirements**

| ID | Feature | Priority | Requirement |
| ----- | ----- | ----- | ----- |
| FR1 | Zero-price CTA | Must | When the final price is zero the CTA reads *Enroll for Free* in INR and USD; otherwise *Buy Now*. |
| FR2 | No negative price | Must | A discount larger than the price shows ₹0 / $0, never a negative amount. |
| FR3 | No payment step | Must | The free path never loads Razorpay, creates an order or opens an overlay. |
| FR4 | Request contract | Must | The request body has `courseId`, `currency`, `couponCode` and nothing else. |
| FR5 | Sign-in gate | Must | A visitor cannot enroll; the Clerk sign-in is shown and no request is sent. |
| FR6 | Server re-validation | Must | The server recomputes the price; a non-zero price, closed cohort, unknown course or invalid coupon is refused with a message. |
| FR7 | Restricted coupons | Must | A restricted coupon works only for listed accounts, in the UI and on the server. |
| FR8 | Processing state | Must | CTA shows *Processing…* and is disabled while the request runs. |
| FR9 | Double-click safety | Must | Rapid clicks send one request and create one enrollment. |
| FR10 | Idempotent enrollment | Must | Repeat and concurrent requests leave exactly one row and answer *already enrolled* afterwards. |
| FR11 | Success confirmation | Must | The success modal appears only after `success: true`; failures never show it. |
| FR12 | Redirect | Must | *Go to Dashboard* lands on `/learning`, which lists the new course. |
| FR13 | Error handling | Must | Any failure shows a message, re-enables the CTA and grants nothing. |
| FR14 | Post-enrollment state | High | The sales page shows *You are Enrolled\!*, hides the coupon box and the dashboard lists the course. |
| FR15 | Copy accuracy | High | Modal text does not claim a payment on the free path. |
| FR16 | Coupon change | High | Replacing or removing the free coupon returns the page to a paid state. |
| FR17 | Admin visibility | Medium | A free enrollment is logged with the coupon used. |
| FR18 | Mobile and keyboard | Medium | The panel and modal are usable on a phone and from the keyboard. |

---

## **9\. UI Acceptance Criteria**

### **AC1 — Free CTA**

**Given** a signed-in learner on an open course with a valid zero-price coupon  
**When** the coupon is applied  
**Then** the price shows ₹0 (or $0) and the button reads **Enroll for Free**; no *Buy Now* button is present.

### **AC2 — No payment step**

**Given** state F4  
**When** the learner clicks *Enroll for Free*  
**Then** `/api/enroll-free` is called once, `/api/create-order` is never called and the Razorpay script is not loaded.

### **AC3 — Loading state**

**When** the request is in flight  
**Then** the button reads **Processing…**, is disabled and shows a spinner.

### **AC4 — Success**

**When** the server answers `success: true`  
**Then** the **Welcome Aboard\!** modal appears with a working WhatsApp link and **Go to Dashboard**; the copy does not say "payment" on a free enrollment.

### **AC5 — Redirect and access**

**When** the learner clicks *Go to Dashboard*  
**Then** they reach `/learning`, which lists the course, and the course page `/learning/[slug]` opens for them.

### **AC6 — Failure**

**Given** the server fails or the network drops  
**Then** an error is shown, no modal appears, the URL does not change, the CTA is enabled again and no row exists.

### **AC7 — Visitor**

**Given** a visitor  
**When** they apply a coupon or click the CTA  
**Then** an alert asks them to sign in, Clerk sign-in opens, and nothing is applied or sent.

### **AC8 — Restricted coupon**

**Given** a learner not on the coupon's list  
**Then** the UI shows the restriction message and the server answers 403 if the request is forced.

### **AC9 — Already enrolled**

**Given** an enrolled learner  
**Then** *You are Enrolled\! Go to Dashboard* is shown, the coupon box is hidden, and a forced second request answers *already enrolled* with no new row.

### **AC10 — Idempotency**

**When** the CTA is double-clicked or the API is called several times in parallel  
**Then** exactly one `user_enrollments` row exists for the learner and course.

### **AC11 — Coupon removal**

**When** the free coupon is replaced by an invalid one  
**Then** the price and CTA return to the paid state and no free request is possible.

### **AC12 — Mobile and keyboard**

**Then** on a 390 px viewport the coupon, CTA and modal are fully visible, and the CTA and modal buttons work with Tab and Enter.

---

## **10\. Test Coverage Matrix**

Layers: **N** = network mocked (UI only), **A** = real app API with the QA Supabase project, **U** = UI only, **P** = pure logic.  
Tiers: **PR** = pull-request smoke, **REG** = regression, **NGT** = nightly.  
Existing coverage: ✓ = already automated under a PRD 03 case id (`CDP-…`); the case ids are listed so nothing is written twice.

| ID | Scenario | State | Layer | Tier | Existing |
| ----- | ----- | ----- | ----- | ----- | ----- |
| FE-01 | Percentage 100% coupon shows ₹0 and *Enroll for Free* | F4 | U | PR | ✓ CDP-FREE-001/002 |
| FE-02 | Same in USD ($0) | F4 | U | REG | ✓ CDP-PRICE-009 |
| FE-03 | Fixed coupon above the price floors at ₹0, not negative | F4 | U | REG | ✓ CDP-PRICE-010 |
| FE-04 | No *Buy Now* shown in state F4 | F4 | U | REG | ✓ CDP-CTA-002 |
| FE-05 | Click sends one `/api/enroll-free`, no order, no Razorpay script | F4 | N | PR | ✓ CDP-FREE-003/004/007 |
| FE-06 | Request body is exactly `courseId`, `currency`, `couponCode` | F4 | N | REG | partial |
| FE-07 | USD request carries `currency: USD` | F4 | N | REG | new |
| FE-08 | *Processing…*, disabled, spinner during the request | F5 | N | REG | ✓ CDP-FREE-008 |
| FE-09 | Success modal only after `success: true` | F6 | N | PR | ✓ CDP-FREE-003 |
| FE-10 | Modal WhatsApp link: href, target, rel | F6 | N | REG | new |
| FE-11 | Modal copy does not claim a payment | F6 | N | REG | new (expected to fail, R-FE-2) |
| FE-12 | *Go to Dashboard* reaches `/learning`, which lists the course | F6 | N | REG | ✓ CDP-FREE-006 |
| FE-13 | Destination page loads for the learner | F6 | A | REG | ✓ CDP-RED-007 |
| FE-14 | Real enrollment row created with `coupon_used` | F6 | A | PR | ✓ CDP-FREE-005 |
| FE-15 | After enrollment the sales page shows *You are Enrolled\!*, coupon box gone | F7 | A | REG | ✓ CDP-FREE-011 |
| FE-16 | Dashboard lists the new course; course page opens | F7 | A | REG | new |
| FE-17 | State F7 survives reload | F7 | A | REG | ✓ CDP-ENR-005 |
| FE-18 | Server error shows message, no modal, CTA recovers | F8 | N | REG | ✓ CDP-FREE-009 |
| FE-19 | Network failure shows message, retry succeeds | F8 | N | REG | new |
| FE-20 | Visitor: coupon apply and CTA prompt sign-in, nothing sent | F1 | N | PR | new |
| FE-21 | Restricted coupon, wrong learner: message, price unchanged | F3 | U | REG | ✓ CDP-COUP-006 |
| FE-22 | Restricted coupon forced to the API: 403, no row | — | A | REG | new |
| FE-23 | Free coupon replaced by invalid: CTA back to *Buy Now* | F8→F2 | U | REG | ✓ CDP-CTA-006 |
| FE-24 | Free coupon on a closed cohort: API refuses, no row | — | A | REG | new |
| FE-25 | Forced request with a non-zero price: *Payment required.* | — | A | REG | new |
| FE-26 | Unknown course id refused | — | A | REG | new |
| FE-27 | Unauthenticated API call: 401 | — | A | PR | new |
| FE-28 | Double-click: one request, one row | F5 | A | PR | ✓ CDP-FREE-010 |
| FE-29 | Repeat request answers *already enrolled* | F7 | A | REG | ✓ CDP-FREE-010 |
| FE-30 | Six parallel requests leave one row | — | A | REG | ✓ CDP-RACE-003 (fails, R-FE-1) |
| FE-31 | Stale tab: *Enroll for Free* after enrolment answers *already enrolled* | F7 | A | REG | new |
| FE-32 | Client price tampering ignored (server recomputes) | — | A | REG | new |
| FE-33 | Activity log entry written with the coupon | F6 | A | REG | new |
| FE-34 | Mobile journey (390 px) end to end | F4–F7 | N | NGT | partial CDP-E2E-010 |
| FE-35 | Keyboard: CTA and modal buttons | F4/F6 | U | NGT | partial CDP-CTA-012 |
| FE-36 | Firefox and WebKit run of FE-05 | F4 | N | NGT | new |

New scenarios to write: FE-06 (strengthen), 07, 10, 11, 16, 19, 20, 22, 24 … 27, 31 … 33, 36. The rest reuse the `CDP-…` automation and only need the case id added to the title.

---

## **11\. Non-Functional Requirements**

| Category | Requirement |
| ----- | ----- |
| Security | Price, identity and course binding come from the server; the request carries no price, user id or slug. Restricted-coupon checks are enforced server-side. |
| Reliability | Every failure path ends with a visible message and a usable page. |
| Idempotency | Retries, double-clicks and concurrent calls never create more than one enrollment. |
| Consistency | UI price (₹0 / $0), CTA label and server answer agree. |
| Usability | The free path is one click after the coupon; modal copy is accurate. |
| Accessibility | CTA and modal buttons are keyboard operable and named. |
| Performance | Response within about 3 s on the QA stack; detailed targets in the Performance PRD. |

---

## **12\. Negative Testing Requirements**

| Case | Expected |
| ----- | ----- |
| Visitor applies coupon / clicks CTA | Sign-in prompt, no request, no enrollment |
| Coupon for other accounts | Restriction message / 403, no enrollment |
| Invalid or empty coupon | Paid state, no free request |
| Forged request with price above zero | 400 *Payment required.* |
| Closed cohort / unknown course id | 400, no row |
| Missing or invalid session on the API | 401 |
| Server 500 / network abort | Message, CTA recovers, no row |
| Double-click / parallel requests | One row |
| Repeat request | *Already enrolled*, no second row |
| Client tampering (price, slug, user id in the body) | Ignored by the server |
| Coupon removed after free price | Back to *Buy Now* |

---

## **13\. Success Metrics (KPIs)**

| KPI | Target |
| ----- | ----- |
| Free-enrollment completion (coupon applied → modal) | ≥ 98% in the automated run |
| Duplicate enrollment rows after parallel requests | 0 |
| Razorpay calls on the free path | 0 |
| Wrong-account coupon acceptances | 0 |
| Failed free-enrollment tests blocking release | 0 critical / high |
| Free-path PR smoke time | under 90 seconds |

---

## **14\. Risks & Mitigations**

| ID | Risk (known from the code and test runs) | Impact | Mitigation / status |
| ----- | ----- | ----- | ----- |
| R-FE-1 | `grantEnrollment` checks then inserts and `user_enrollments` has no unique (user, course): 6 parallel requests created 4 to 6 rows. | Duplicate rows, wrong counts and reports | Add a unique constraint and treat "already exists" as success. Test `CDP-RACE-003` fails today (Jira defect pending owner confirmation). |
| R-FE-2 | Success modal says "Your payment is verified" for a free enrollment. | Confusing and inaccurate copy | Use free-specific copy. Test FE-11. |
| R-FE-3 | After success the page behind the modal is not marked enrolled until it is reopened. | Stale CTA, possible second click | Set the enrolled state on success. Mitigated by FE-31. |
| R-FE-4 | ~~Redirect to `/learning` instead of `/learning/[slug]`~~ **Closed 2026-10-29: `/learning` is the intended destination** (PRD 03 §4.6 updated). | none | Tests FE-12, `CDP-RED-001/002/003` assert `/learning`. |
| R-FE-5 | All coupons live in `data/coupons.ts`, imported by the client: every code and the restricted user-id lists are in the browser bundle. | Coupon leakage, user-id exposure | Move coupon resolution to the server. Not yet ticketed. |
| R-FE-6 | Public coupons with large discounts (`EXISTINGSTUDENT_BATCH03` with empty `allowedUsers`; `BATCH002` is 100% for four ids) and no expiry or usage limit. | Revenue leakage | Add expiry and limits; owner decision on the public coupon. |
| R-FE-7 | `QA100` must never be public: it exists only when the QA flag is on **and** user ids are listed (fail closed). | Free access to a real course | Guard test in `tests/unit/qa-fixture.spec.ts`; flag never set in production. |
| R-FE-8 | The free path writes the enrollment and activity log but sends no welcome email and no WhatsApp reminder. | Learner may miss the group link | Decide whether a welcome email is wanted. |
| R-FE-9 | The `alert()` dialogs block the page and are hard to test. | Flaky UI tests | Accept dialog handlers; replace with toasts (future). |
| R-FE-10 | Client-side enrolment check (PRD §13 S2): a forged request could skip the UI entirely. | Server must be the gate | FE-22 … FE-27 test the server directly. |

---

## **15\. QA Priority & Execution Order**

Free enrollment is the **fifth UI feature tested**, after authentication, public pages, discovery & pricing and checkout.

### **Phase 1 — Entry and guard rails**

1. FE-20 visitor, FE-21 restricted coupon, FE-23 coupon removal.
2. FE-01 … FE-04 zero price and CTA.

### **Phase 2 — Request and server rules**

1. FE-05, FE-06, FE-07 request contract and no payment step.
2. FE-24 … FE-27, FE-32 forced and tampered requests.

### **Phase 3 — Happy path and hand-off**

1. FE-08, FE-09 loading and success.
2. FE-10 … FE-13 modal, copy, redirect, destination.
3. FE-14 … FE-17, FE-33 enrolled state, dashboard, log.

### **Phase 4 — Resilience and idempotency**

1. FE-18, FE-19 failures and recovery.
2. FE-28 … FE-31 double-click, repeat, parallel, stale tab.

### **Phase 5 — Cross-cutting**

1. FE-34 mobile, FE-35 keyboard, FE-36 cross-browser.

### **15.1 Testing Weightage**

| Area | Weight | Why it carries this weight |
| ----- | ----- | ----- |
| Idempotency, double-click, parallel requests | 20% | Known defect (R-FE-1); duplicates corrupt counts and reports. |
| Server rules and tampering (price, closed cohort, restricted coupon, auth) | 20% | Revenue leakage and access control; the UI cannot be trusted. |
| Happy path end to end (coupon → enrollment → access) | 15% | The reason the flow exists. |
| Zero-price CTA and no-payment guarantee | 12% | Wrong label or a stray Razorpay call is a visible business error. |
| Success modal, copy and redirect | 10% | One known defect (R-FE-2). |
| Failure and recovery | 8% | Must never show a false success. |
| Post-enrollment state (enrolled CTA, dashboard) | 7% | Confirms the flow really gave access. |
| Mobile, keyboard, cross-browser | 5% | Many learners are on phones. |
| Admin log visibility | 3% | Support needs to see free enrollments. |
| **Total** | **100%** | |

**Tier allocation:** PR smoke ≈ FE-01, 05, 09, 14, 20, 27, 28 (under 90 seconds); regression = all REG items; nightly = NGT items.

### **15.2 Test Environment, Data & Testability Requirements**

| ID | Requirement | Why | Status |
| ----- | ----- | ----- | ----- |
| TR-1 | QA fixture course `qa-checkout-sandbox` (`NEXT_PUBLIC_QA_FIXTURES=1`). | Real courses are closed. | **Built** |
| TR-2 | Free coupon `QA100`, restricted to the persona ids in `NEXT_PUBLIC_QA_FREE_COUPON_USERS`. | Safe free path without touching real coupons. | **Built** (fails closed) |
| TR-3 | Persona U1 (edu) is the only account that gets enrolled; every row is removed after each test; DB-writing tests run in one worker. | Isolation and repeatability. | **Done** (`checkout-real-db.spec.ts`) |
| TR-4 | Mocked API responses for failure paths (500, abort, slow). | Deterministic errors. | **Done** (`tests/support/checkout.ts`) |
| TR-5 | QA Supabase project with the service-role key in `.env.local` / GitHub secret. | Row assertions and clean-up. | Done locally; CI secret pending (Q13) |
| TR-6 | `data-testid` on the CTA, coupon input and modal actions. | Stable locators. | Proposed |
| TR-7 | Unique constraint on `user_enrollments (user_id, course_slug)` in the QA project so FE-30 can pass once the code is fixed. | R-FE-1 | Proposed (needs owner approval; production needs the same change) |

### **15.3 Execution Readiness**

Most scenarios can run now. Existing automation is in `tests/ui/discovery/checkout-flow.spec.ts` and `checkout-real-db.spec.ts`. Scenarios marked *new* in section 10 still need specs. Expected failures stay visible in Allure: FE-11 and FE-30 until R-FE-2 and R-FE-1 are fixed.

---

## **16\. Definition of Done**

* All Must requirements (FR1 … FR13) have automated tests that pass in Chromium, or a logged and accepted failure with a Jira ticket.
* Every scenario in section 10 is automated or marked blocked with a reason.
* The free path is proven to make zero Razorpay calls.
* Idempotency (double-click, repeat, parallel) is verified; R-FE-1 is fixed or ticketed.
* Every row the tests create is removed; persona enrolments are restored.
* Risks R-FE-1 … R-FE-10 are mitigated or have an owner and a decision.
* No critical or high-severity free-enrollment defect remains open.

---

## **17\. Future Enhancements**

* Free-specific success copy and a welcome email for free enrollments.
* Coupon resolution on the server, with expiry date, usage limit and per-user limit.
* Admin screen for creating and revoking coupons.
* Toasts instead of `alert()`.
* Optimistic enrolled state without reload.
* Analytics event for free enrollments (conversion by coupon).
* Visual regression snapshots of the free-state panel and modal.

---

## **18\. Glossary**

**Free enrollment:** Joining a course with a final price of zero, without Razorpay.

**100% coupon:** A percentage coupon with value 100.

**Price floor:** The rule that a price never drops below zero.

**Restricted coupon:** A coupon with a non-empty `allowedUsers` list.

**Idempotent:** Repeating the operation has the same effect as doing it once.

**Fixture course:** The QA-only open course `qa-checkout-sandbox`.

**Persona:** A named test account (see [../TEST_DATA.md](../TEST_DATA.md)).

**CTA:** Call-to-action button.

---

## **19\. References**

* [components/ActiveCohorts.tsx](../../../components/ActiveCohorts.tsx) — CTA, coupon, success modal
* [app/api/enroll-free/route.ts](../../../app/api/enroll-free/route.ts)
* [lib/pricing.ts](../../../lib/pricing.ts), [lib/enrollments.ts](../../../lib/enrollments.ts)
* [data/coupons.ts](../../../data/coupons.ts), [data/courses.ts](../../../data/courses.ts)
* [docs/PRD\_TM\_DIGITAL\_LEARNING\_PLATFORM.md](../../PRD_TM_DIGITAL_LEARNING_PLATFORM.md) §13
* [docs/DATABASE.md](../../DATABASE.md)
* Related PRDs: [01](01-ui-authentication-access-control.md), [02](02-ui-public-pages-navigation.md), [03](03-ui-course-discovery-pricing.md), [04](04-ui-checkout-flow.md)
* Existing automation: [tests/ui/discovery/checkout-flow.spec.ts](../../../tests/ui/discovery/checkout-flow.spec.ts), [tests/ui/discovery/checkout-real-db.spec.ts](../../../tests/ui/discovery/checkout-real-db.spec.ts), [tests/unit/discovery-pricing-rules.spec.ts](../../../tests/unit/discovery-pricing-rules.spec.ts)
* Jira: SCP-42 (free-enrollment success copy and stale enrolled state), SCP-43 (catalog cards)
