
# **Product Requirements Document (PRD)**

**Product Name:** TM – Digital Learning Experience Platform  
**Product URL:** [https://shivamnamdev.com/](https://shivamnamdev.com/)  
**Feature:** \[UI\] Checkout Flow Testing  
**Prepared By:** Shivam Namdev & Claude Code  
**Date:** Oct 27, 2026  
**Status:** PRD ready — reviewed by the owner 2026-10-27; open-cohort fixture built (see §15.3) (see [../README.md](../README.md))

---

## **1\. Feature Overview**

The checkout flow is the most critical commercial journey of the TM – Digital Learning Experience Platform. It starts when a visitor clicks **Buy Now** on a course sales page and ends when the buyer has a verified enrollment, a confirmation modal, and a route into the learning dashboard.

The flow is implemented in one client component, `components/ActiveCohorts.tsx`, and spans three server routes:

* `POST /api/create-order` — prices the order on the server and creates a Razorpay order.
* `POST /api/verify-payment` — verifies the HMAC signature, re-fetches the order from Razorpay, grants the enrollment, logs admin activity and sends the welcome/receipt email.
* `POST /api/enroll-free` — used instead of Razorpay when the final price is zero (covered in PRD 05; only the shared success modal and the CTA switch are tested here).

This PRD validates the **UI behaviour** of the checkout: the CTA state machine, sign-in prompts, order creation, the Razorpay overlay hand-off, the payment success and failure states, the success modal, and the redirect into the platform. API and database correctness are specified in later PRDs, but this PRD asserts the UI-visible contract of those APIs (for example, that the amount the buyer sees is the amount Razorpay is asked to charge).

Checkout is prioritised fourth because it depends on the three PRDs before it:

1. [Authentication & Access Control](01-ui-authentication-access-control.md) — a buyer must be signed in.
2. [Public Pages & Navigation](02-ui-public-pages-navigation.md) — the buyer must reach the sales page.
3. [Course Discovery & Pricing](03-ui-course-discovery-pricing.md) — currency and coupon state must be correct before pay.

> **Testability blocker.** At the time of writing every course in `data/courses.ts` has `enrollmentClosed: true`, so the Buy Now button does not render on any live course page. Section 15.2 defines the open-cohort fixture needed before any checkout UI test can run.

---

## **2\. Business Objectives**

### **Primary Goals**

* Ensure a signed-in buyer can complete a paid purchase end to end without manual help.
* Ensure the amount shown to the buyer equals the amount sent to Razorpay, in both INR and USD, with and without coupons.
* Ensure the Razorpay overlay opens with the correct order, currency, amount, course description and buyer pre-fill.
* Ensure a verified payment results in exactly one enrollment, and that the buyer sees clear confirmation.
* Ensure payment failure, cancellation, network failure and verification failure never grant access and never leave the buyer stuck.
* Ensure signed-out visitors are guided into sign-in, then back to the course, instead of failing silently.
* Ensure closed cohorts and already-enrolled buyers cannot start a second purchase.
* Ensure the post-purchase hand-off (WhatsApp group, dashboard) works.
* Protect revenue: no free access, no wrong price, no duplicate charge for the same course.

### **Business Impact**

Checkout defects affect:

* Direct revenue
* Buyer trust and refund / chargeback volume
* Student onboarding and access to paid content
* Live-class attendance (WhatsApp group invitation)
* Admin enrollment records and activity log
* Welcome and receipt emails
* Support load on the single operator (PRD §13.4)

A checkout defect is a revenue defect. Checkout tests therefore carry the highest regression weight in the UI suite after authentication.

---

## **3\. Target Users**

### **3.1 Unauthenticated Visitor**

A visitor with no Clerk session who clicks Buy Now.

Expected behaviour:

* Sees pricing and the **Buy Now** CTA.
* On click receives a sign-in prompt, not an order.
* No request is sent to `/api/create-order`.

---

### **3.2 Authenticated Buyer (not enrolled)**

A signed-in user with no enrollment in the course.

Expected behaviour:

* Can switch currency, apply coupons and start checkout.
* Razorpay opens pre-filled with their name and email.
* After a verified payment, receives enrollment and access.

---

### **3.3 Enrolled Student**

A signed-in user who already owns the course.

Expected behaviour:

* Sees **You are Enrolled! Go to Dashboard** instead of Buy Now.
* Does not see the coupon box.
* Cannot start a second purchase from the UI.

---

### **3.4 Admin User**

An admin who is also viewing the sales page.

Expected behaviour:

* Sees the same checkout UI as any buyer.
* Offline payments (UPI, bank transfer) are fulfilled through Manual Enrollment in `/admin`, which is outside this PRD.

---

## **4\. Scope**

### **In Scope**

* Buy Now CTA states: default, processing, signed-out, enrolled, closed cohort
* Sign-in prompt on checkout and on coupon apply
* Razorpay script loading and failure handling
* Order creation request (`courseId`, `currency`, `couponCode`) and response handling
* Razorpay overlay options: key, amount, currency, order id, name, description, prefill, theme
* Payment success handler and `/api/verify-payment` call
* Success modal: copy, WhatsApp link, Go to Dashboard
* Payment failure, cancellation and verification-failure messaging
* Currency (INR / USD) and coupon state carried into the order
* Double-click, rapid retry and repeat-purchase behaviour
* Post-purchase state of the sales page and the dashboard
* Mobile and cross-browser rendering of the checkout panel
* UI-visible effects of the server contract (price equality, 401/400/403 messages)

### **Out of Scope**

* Free-enrollment (100% coupon) flow — **PRD 05**, except the CTA switch to *Enroll for Free* and the shared success modal
* Detailed API testing of `create-order`, `verify-payment`, `enroll-free` — **API PRDs**
* Supabase data integrity (`user_enrollments`, `admin_activity_log`) — **Database PRD**
* Razorpay infrastructure and bank/UPI behaviour
* Email deliverability (template and escaping are API-level; here only "an email is sent once" is observed)
* Refund, chargeback and invoice processes
* Performance and load testing — **Performance PRD**
* Pricing display and coupon-message correctness before payment — covered by PRD 03 (only re-checked here where it changes the order)

---

## **5\. Checkout State Model**

The CTA area of the sales page follows a state machine. UI tests must verify every row, both the positive and the negative direction.

| State | Cohort | Signed in | Enrolled | Final price | Rendered CTA |
| ----- | ----- | ----- | ----- | ----- | ----- |
| S1 | Closed | any | No | any | **Enrollment Closed** panel with **View Open Cohorts** → `/courses`; no Buy Now, no coupon box |
| S2 | Closed | Yes | Yes | any | **You are Enrolled\! Go to Dashboard** → `/learning` |
| S3 | Open | No | — | \> 0 | **Buy Now (INR)** / **Buy Now (USD)**; click → alert + Clerk sign-in |
| S4 | Open | Yes | No | \> 0 | **Buy Now (INR)** / **Buy Now (USD)** |
| S5 | Open | Yes | No | \= 0 | **Enroll for Free** (flow in PRD 05) |
| S6 | Open | Yes | Yes | any | **You are Enrolled\! Go to Dashboard**; coupon box hidden |
| S7 | Open | Yes | No | request in flight | **Processing…**, button disabled, spinner |
| S8 | Open | Yes | No | after verified payment | Success modal **Welcome Aboard\!** over the page |

Related client behaviour that must hold:

* The coupon box is hidden when the buyer is enrolled.
* The coupon *Apply* action requires sign-in (alert, then Clerk modal).
* Currency toggle and coupon state are read at click time and sent in the order request.

---

## **6\. Core Features & Capabilities**

### **6.1 Buy Now Entry**

#### **Requirements**

* Buy Now renders only for open, non-enrolled states.
* Button label reflects the selected currency: `Buy Now (INR)` or `Buy Now (USD)`.
* Button label changes to `Enroll for Free` when the final price is zero.
* Signed-out click shows the alert *"Please log in or create an account first to secure your spot\!"* and opens the Clerk sign-in; no network call to `/api/create-order` is made.
* After sign-in the buyer returns to the same course page and can continue.

---

### **6.2 Order Creation**

#### **Requirements**

* On click the UI sets the button to *Processing…* and disables it.
* The UI loads `https://checkout.razorpay.com/v1/checkout.js`.
* The UI sends `POST /api/create-order` with `courseId`, `currency` (`INR`/`USD`) and `couponCode` (or none).
* The request never contains a price; the server computes it.
* The UI uses `order.amount`, `order.currency` and `order.id` from the response, not locally computed values.
* If the script fails to load: alert *"Razorpay SDK failed to load. Are you online?"*, button returns to its default state, no order is created.
* If order creation fails (401, 400, 403, 500): the server `error` is shown in an alert (or the generic gateway message), the button returns to its default state, no overlay opens.

---

### **6.3 Razorpay Overlay Hand-off**

#### **Requirements**

* The overlay opens with:
  * `key` = the public test/live key id
  * `amount` and `currency` equal to the order response
  * `order_id` equal to the created order
  * `name` = *Shivam Academy*
  * `description` = *Enrollment: \<course title\>*
  * `prefill.name` / `prefill.email` = the signed-in user
  * `theme.color` = `#f59e0b`
* Order amount in minor units equals `final price × 100` for the chosen currency and coupon.
* Overlay options never expose the secret key.

---

### **6.4 Payment Success**

#### **Requirements**

* The Razorpay `handler` posts `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature` (only) to `POST /api/verify-payment`.
* The request does not carry a course slug, user id or price.
* On `success: true` the **Welcome Aboard\!** modal is shown.
* The modal contains **Join WhatsApp Group** (opens the course WhatsApp link in a new tab, `rel="noreferrer"`) and **Go to Dashboard** (navigates to `/learning`).
* On `success: false` or a network error the buyer sees *"Error verifying enrollment."* (or the server message) and is **not** shown the success modal.

---

### **6.5 Payment Failure & Cancellation**

#### **Requirements**

* On `payment.failed` the buyer sees *"Payment failed or was cancelled. Please try again."*
* No enrollment is granted and no success modal is shown.
* The buyer can retry without reloading the page (button usable, a new order is created).
* Closing the overlay without paying must leave the page usable (see risk R-CK-5).

---

### **6.6 Success Modal & Post-Purchase State**

#### **Requirements**

* The modal overlays the page and is the single confirmation of success.
* **Go to Dashboard** routes to `/learning`, where the new course is listed under *My Enrolled Courses*.
* Reloading `/courses/[slug]` after purchase shows **You are Enrolled\! Go to Dashboard** (S2/S6).
* The buyer receives one welcome/receipt email (order id, amount, PAID); a repeated verification does not send a second email.

---

### **6.7 Currency & Coupon Carry-Over**

#### **Requirements**

* INR selected → order currency `INR`, amount in paise.
* USD selected → order currency `USD`, amount in cents.
* A valid coupon applied in the UI is sent as `couponCode`; the server order amount equals the UI price (rounding rules: whole rupees, cents for USD).
* A coupon the server rejects (invalid, or restricted to other users) fails the order creation with the server message and does not open Razorpay.
* Changing currency after applying a coupon recalculates the displayed price before checkout; the order uses the currency visible at click time.

---

### **6.8 Duplicate & Repeat Purchase Protection**

#### **Requirements**

* A double-click on Buy Now must create at most one order and one overlay.
* Verifying the same payment twice must not create a second enrollment or a second email.
* An already-enrolled buyer must not be able to start another purchase from the UI.

---

## **7\. User Flows**

### **7.1 Visitor → Buy Now → Sign-in**

1. Visitor opens an open cohort page.
2. Visitor clicks **Buy Now**.
3. Alert prompts login; Clerk sign-in opens.
4. No order request is sent.
5. Visitor signs in and returns to the course page.

**Expected Result:** Visitor is guided into authentication; no order exists.

---

### **7.2 Buyer → Paid Checkout (INR)**

1. Signed-in, non-enrolled buyer opens an open cohort page (default INR).
2. Clicks **Buy Now (INR)**.
3. Button shows *Processing…*.
4. `/api/create-order` returns an order; the Razorpay overlay opens.
5. Buyer pays; Razorpay calls the success handler.
6. UI posts to `/api/verify-payment`; server verifies and enrolls.
7. **Welcome Aboard\!** modal appears.
8. Buyer clicks **Go to Dashboard**; `/learning` lists the course.

**Expected Result:** One enrollment, one confirmation, access granted.

---

### **7.3 Buyer → Paid Checkout (USD)**

1. Buyer switches to **International**.
2. Clicks **Buy Now (USD)**.
3. Order is created with `currency: "USD"`; overlay shows the USD amount.
4. Flow continues as 7.2.

**Expected Result:** The charged currency and amount match what was displayed.

---

### **7.4 Buyer → Paid Checkout with Coupon**

1. Buyer applies a valid coupon (for example `BIRTHDAY20`, 20%).
2. UI shows the discounted price.
3. Clicks **Buy Now**.
4. The order amount equals the discounted price (for example ₹1,999 → ₹1,599).
5. Flow continues as 7.2; receipt amount matches.

**Expected Result:** The discount is honoured by the server, not only displayed.

---

### **7.5 Buyer → Payment Failure → Retry**

1. Buyer clicks **Buy Now**; overlay opens.
2. Payment fails or is cancelled.
3. UI shows *"Payment failed or was cancelled. Please try again."*
4. No enrollment, no modal.
5. Buyer clicks **Buy Now** again; a new order is created.

**Expected Result:** Failure is recoverable and grants nothing.

---

### **7.6 Buyer → Gateway Unavailable**

1. Razorpay script is blocked or the network is offline.
2. Buyer clicks **Buy Now**.
3. UI shows *"Razorpay SDK failed to load. Are you online?"*
4. Button returns to its default state; no order is created.

**Expected Result:** The buyer is informed and can retry later.

---

### **7.7 Buyer → Verification Failure**

1. Payment succeeds at Razorpay but `/api/verify-payment` returns an error (invalid signature, order mismatch, 500).
2. UI shows the error message; success modal is **not** shown.
3. Page remains usable.

**Expected Result:** Access is never shown as granted unless the server confirmed it.

---

### **7.8 Enrolled Student → Sales Page**

1. Enrolled student opens the course page.
2. UI shows **You are Enrolled\! Go to Dashboard**.
3. No Buy Now, no coupon box.
4. Click routes to `/learning`.

**Expected Result:** A second purchase cannot be started from the UI.

---

### **7.9 Closed Cohort**

1. Visitor or buyer opens a closed cohort page.
2. UI shows **Enrollment Closed** and **View Open Cohorts**.
3. No Buy Now is present.

**Expected Result:** Closed cohorts cannot be purchased from the UI (the API enforces the same rule).

---

### **7.10 Post-Purchase Hand-off**

1. Success modal is visible.
2. Buyer clicks **Join WhatsApp Group**; the course WhatsApp link opens in a new tab.
3. Buyer returns and clicks **Go to Dashboard**.

**Expected Result:** Both exits work and the buyer is never stuck on the modal.

---

## **8\. Functional Requirements**

| ID | Feature | Priority | Requirement |
| ----- | ----- | ----- | ----- |
| FR1 | Buy Now rendering | Must | Buy Now renders only for open, non-enrolled states with the correct currency label. |
| FR2 | Sign-in gate | Must | Signed-out click prompts login and sends no order request. |
| FR3 | Order creation | Must | UI sends `courseId`, `currency`, `couponCode` and uses the server order for the overlay. |
| FR4 | Processing state | Must | Button shows *Processing…* and is disabled while a request is in flight. |
| FR5 | Razorpay overlay | Must | Overlay opens with correct key, order id, amount, currency, description and prefill. |
| FR6 | Amount integrity | Must | Displayed price = order amount (minor units) for every currency × coupon combination. |
| FR7 | Verification call | Must | Success handler posts only the three Razorpay fields to `/api/verify-payment`. |
| FR8 | Success confirmation | Must | Success modal is shown only after `verify-payment` returns `success: true`. |
| FR9 | Payment failure | Must | Failure/cancel shows a message, grants nothing and allows retry. |
| FR10 | Verification failure | Must | A failed verification never shows the success modal. |
| FR11 | Script load failure | Must | SDK load failure is reported and recoverable. |
| FR12 | Closed cohort | Must | Closed cohorts show *Enrollment Closed* and no Buy Now. |
| FR13 | Already enrolled | Must | Enrolled buyers see *Go to Dashboard*, no Buy Now, no coupon box. |
| FR14 | Double-click safety | Must | Rapid repeated clicks create at most one order/overlay. |
| FR15 | Idempotent fulfilment | Must | Repeated verification does not duplicate enrollment or email. |
| FR16 | Post-purchase hand-off | High | WhatsApp link and Go to Dashboard work from the modal. |
| FR17 | Coupon carry-over | High | Applied coupon is sent in the order; server rejection surfaces its message. |
| FR18 | Currency carry-over | High | Selected currency is the order currency. |
| FR19 | Post-purchase state | High | After purchase the sales page and dashboard reflect enrollment. |
| FR20 | Error resilience | High | 401/400/403/500 from `create-order` produce a message, not a frozen button. |
| FR21 | Receipt email | Medium | Exactly one welcome/receipt email per verified purchase. |
| FR22 | Mobile & cross-browser | Medium | Checkout panel and modal are usable on mobile viewports and in Chromium, Firefox, WebKit. |

---

## **9\. UI Acceptance Criteria**

### **AC1 — Buy Now Visible**

**Given** an open cohort and a non-enrolled user  
**When** the course page loads  
**Then** **Buy Now (INR)** is visible and enabled  
**And** switching to *International* changes it to **Buy Now (USD)**.

---

### **AC2 — Signed-Out Click**

**Given** an unauthenticated visitor on an open cohort page  
**When** they click **Buy Now**  
**Then** the login alert appears and the Clerk sign-in opens  
**And** no request is sent to `/api/create-order`.

---

### **AC3 — Processing State**

**Given** a signed-in buyer  
**When** they click **Buy Now**  
**Then** the button shows *Processing…* and is disabled until the order response arrives.

---

### **AC4 — Overlay Content**

**Given** an order was created  
**When** the Razorpay overlay opens  
**Then** its amount, currency, order id, description and pre-filled name/email match the order and the signed-in user.

---

### **AC5 — Amount Integrity**

**Given** any combination of currency and valid coupon  
**When** the buyer clicks **Buy Now**  
**Then** the order amount in minor units equals the displayed final price × 100.

---

### **AC6 — Successful Payment**

**Given** a valid payment signature  
**When** the success handler runs  
**Then** `/api/verify-payment` is called with the three Razorpay fields only  
**And** the **Welcome Aboard\!** modal appears.

---

### **AC7 — Success Modal Actions**

**Given** the success modal is displayed  
**When** the buyer clicks **Go to Dashboard**  
**Then** they land on `/learning` with the course listed  
**And** **Join WhatsApp Group** opens the course link in a new tab.

---

### **AC8 — Payment Failure**

**Given** the overlay is open  
**When** payment fails or is cancelled  
**Then** *"Payment failed or was cancelled. Please try again."* is shown  
**And** no modal appears and no enrollment exists  
**And** the buyer can start a new attempt.

---

### **AC9 — Verification Failure**

**Given** payment succeeded at the gateway  
**When** `/api/verify-payment` returns an error  
**Then** the error is shown and the success modal is not displayed.

---

### **AC10 — Gateway Script Failure**

**Given** the Razorpay script cannot be loaded  
**When** the buyer clicks **Buy Now**  
**Then** *"Razorpay SDK failed to load. Are you online?"* is shown  
**And** no order is created and the button is usable again.

---

### **AC11 — Order Rejected**

**Given** the server rejects the order (invalid coupon, restricted coupon, closed cohort, unauthorised)  
**When** the buyer clicks **Buy Now**  
**Then** the server message is shown and the overlay does not open.

---

### **AC12 — Enrolled Student**

**Given** an enrolled student  
**When** they open the course page  
**Then** **You are Enrolled\! Go to Dashboard** is shown  
**And** Buy Now and the coupon box are absent.

---

### **AC13 — Closed Cohort**

**Given** a closed cohort  
**When** any user opens the page  
**Then** **Enrollment Closed** is shown and no Buy Now exists.

---

### **AC14 — Double Click**

**Given** a signed-in buyer  
**When** they click **Buy Now** twice quickly  
**Then** at most one order is created and one overlay is opened.

---

### **AC15 — Idempotent Verification**

**Given** a payment already verified  
**When** the verification is repeated  
**Then** there is still exactly one enrollment and one email.

---

## **10\. Test Coverage Matrix**

Layers: **M** = mocked gateway (full stack, Razorpay script stubbed, real `create-order`/`verify-payment`), **R** = real Razorpay test-mode overlay, **N** = network/route mocked (no backend), **U** = UI only.  
Tiers: **PR** = pull-request smoke, **REG** = regression on merge to `main`, **NGT** = nightly.

| ID | Scenario | State | Layer | Tier |
| ----- | ----- | ----- | ----- | ----- |
| CK-01 | Buy Now (INR) visible on open cohort | S4 | U | PR |
| CK-02 | Currency toggle changes label to Buy Now (USD) | S4 | U | PR |
| CK-03 | Closed cohort shows Enrollment Closed, no Buy Now | S1 | U | PR |
| CK-04 | Signed-out click → alert + Clerk sign-in, no order request | S3 | N | PR |
| CK-05 | Enrolled user sees Go to Dashboard, no Buy Now/coupon | S6 | U | REG |
| CK-06 | Click shows Processing…, button disabled | S7 | N | REG |
| CK-07 | Order request body has `courseId`, `currency`, `couponCode`, no price | S4 | N | REG |
| CK-08 | Overlay options: key, order id, name, description, theme | S4 | M | REG |
| CK-09 | Overlay prefill = signed-in user name/email | S4 | M | REG |
| CK-10 | INR order amount (paise) = displayed price × 100 | S4 | M | REG |
| CK-11 | USD order amount (cents) = displayed price × 100 | S4 | M | REG |
| CK-12 | Percentage coupon: order amount = discounted price | S4 | M | REG |
| CK-13 | Fixed coupon (per-currency) amount integrity | S4 | M | REG |
| CK-14 | Restricted coupon for another user → server message, no overlay | S4 | M | REG |
| CK-15 | Full paid happy path INR → modal → /learning lists course | S8 | M | PR |
| CK-16 | Full paid happy path USD | S8 | M | REG |
| CK-17 | Verify request carries only the 3 Razorpay fields | S8 | N | REG |
| CK-18 | Modal: WhatsApp link href, target, rel | S8 | M | REG |
| CK-19 | Modal: Go to Dashboard routes to /learning | S8 | M | REG |
| CK-20 | `payment.failed` → failure message, no modal, retry works | S4 | N | REG |
| CK-21 | Overlay dismissed → page usable, button re-enabled | S4 | N | REG |
| CK-22 | `verify-payment` 400/500 → error shown, no modal | S4 | N | REG |
| CK-23 | Tampered signature (real `verify-payment`) → no enrollment | S4 | M | REG |
| CK-24 | Razorpay script blocked → SDK message, recoverable | S4 | N | REG |
| CK-25 | `create-order` 401/400/500 → message, button recovers | S4 | N | REG |
| CK-26 | Double-click creates one order | S7 | N | REG |
| CK-27 | Repeat verification → one enrollment, one email | S8 | M | REG |
| CK-28 | After purchase reload → Go to Dashboard (S2/S6) | S6 | M | REG |
| CK-29 | Order bound to buyer/course (order notes) | S4 | M | REG |
| CK-30 | Price equality UI = server across all courses × currencies | S4 | M | REG |
| CK-31 | 100% coupon switches CTA to Enroll for Free, no Razorpay | S5 | N | REG |
| CK-32 | Mobile viewport: checkout panel and modal usable | S4/S8 | M | NGT |
| CK-33 | Firefox and WebKit run of CK-15 | S8 | M | NGT |
| CK-34 | Real Razorpay test-mode overlay, test card, success | S8 | R | NGT |
| CK-35 | Real Razorpay test-mode failure card | S4 | R | NGT |
| CK-36 | Keyboard operation and focus trap of modal | S8 | U | NGT |

---

## **11\. Non-Functional Requirements**

| Category | Requirement |
| ----- | ----- |
| Security | Price, user identity and course binding are decided on the server; the UI request contains none of them. Secrets never appear in client code or network traffic. |
| Reliability | Every failure path (script, order, gateway, verification) ends in a recoverable page state with a visible message. |
| Consistency | UI price, order amount and receipt amount must agree. |
| Idempotency | Retries, double-clicks and repeated verification must not duplicate enrollment, activity log rows or emails. |
| Performance | Order creation response and overlay open within an acceptable user-perceived time (target ≤ 3 s on the dev/staging stack). Detailed targets belong to the Performance PRD. |
| Usability | Processing state, error messages and the success modal must be understandable on mobile and desktop. |
| Accessibility | Modal buttons are keyboard operable and have discernible names; blocking `alert()` dialogs are a known limitation (R-CK-6). |
| Test safety | Tests run only with Razorpay **test** keys; they never use live keys or real cards. |

---

## **12\. Negative Testing Requirements**

Checkout tests must emphasise failure paths because a defect here either loses revenue or grants free access.

The following negative scenarios must be validated:

* Visitor clicks Buy Now (no session)
* Razorpay script blocked / offline
* `create-order` returns 401, 400 (unknown course, closed cohort, invalid coupon), 403 (restricted coupon), 500, and times out
* Razorpay `payment.failed`
* Overlay dismissed without paying
* `verify-payment` returns 401, 400 (invalid signature, missing course details), 403 (order of another user), 500
* Payment signature tampered (wrong HMAC)
* Order notes missing course or user
* Double-click and rapid repeat clicks
* Verifying the same order twice
* Enrolled user attempting a second purchase via the UI
* Closed cohort purchase attempted directly through the API (UI hidden)
* Currency switched after coupon applied
* Browser refresh or back navigation while *Processing…* or while the modal is open
* Coupon applied while signed out
* Network drops between payment success and verification (buyer paid but no enrollment — see R-CK-3)

**Expected principle:** a buyer must never see a success state that the server did not confirm, and must never be charged without a clear path to recovery.

---

## **13\. Success Metrics (KPIs)**

### **Revenue Metrics**

* Checkout initiation rate (Buy Now clicks / sales-page views)
* Checkout completion rate (verified payments / Buy Now clicks)
* Payment failure rate and cancellation rate
* Average order value by currency
* Amount mismatch incidents (target 0)

### **Reliability Metrics**

* Verification success rate
* "Paid but not enrolled" incidents (target 0)
* Duplicate enrollment / duplicate email incidents (target 0)
* Unhandled errors during checkout (target 0)

### **Quality Metrics**

* Checkout scenarios automated vs defined (CK-01…CK-36)
* Checkout regression defect count per release
* Flaky-test rate of checkout specs (target \< 2%)
* Time to run the checkout PR smoke subset (target \< 2 min)

---

## **14\. Risks & Mitigations**

### **Risk R-CK-1 — Amount Mismatch**

**Risk:** The UI shows one price but the server charges another (rounding, currency, coupon rules).

**Mitigation:**

* Assert displayed price × 100 equals the order amount for every course × currency × coupon.
* Derive expected values from `data/courses.ts` and `lib/pricing.ts`, not hard-coded numbers.

---

### **Risk R-CK-2 — No Open Cohort to Test**

**Risk:** All cohorts are closed, so the checkout UI cannot be reached and regressions go undetected.

**Mitigation:**

* Add an environment-gated QA checkout course (section 15.2).
* Fail the checkout suite loudly (not skip silently) when the fixture is missing in CI.

---

### **Risk R-CK-3 — Paid But Not Enrolled**

**Risk:** Payment succeeds at Razorpay but `verify-payment` fails or the browser closes before it runs; the buyer is charged with no access. There is no Razorpay webhook fallback.

**Mitigation:**

* Test the failure message and the retry/support path (UI).
* Raise a Product/Engineering item: add a Razorpay `payment.captured` webhook as a reconciliation path (API/DB PRDs).

---

### **Risk R-CK-4 — Duplicate Orders and Enrollments**

**Risk:** Double-clicks or retries create duplicate orders; non-atomic `isEnrolled` then `insert` may race.

**Mitigation:**

* Test double-click and repeated verification (CK-26, CK-27).
* Verify the unique constraint on `(user_id, course_slug)` is applied (docs/SUPABASE\_HARDENING.md).

---

### **Risk R-CK-5 — Button Re-enabled While Overlay Is Open**

**Risk:** `handlePayment` clears *Processing…* in `finally` immediately after `paymentObject.open()`, so the button is clickable again while the overlay is visible. A second click can create a second order. Closing the overlay has no handler.

**Mitigation:**

* Cover with CK-21 and CK-26; treat a failing result as a product defect.
* Recommend an `ondismiss` handler and keeping the button disabled until the overlay closes.

---

### **Risk R-CK-6 — Blocking `alert()` Dialogs**

**Risk:** All errors and the login prompt use `window.alert`, which blocks automation, is poor UX on mobile and is not accessible.

**Mitigation:**

* Tests must register `page.on('dialog')` handlers and assert the dialog text.
* Recommend replacing alerts with inline toasts and stable `data-testid` hooks.

---

### **Risk R-CK-7 — Success Copy Mismatch**

**Risk:** The shared success modal says *"Your payment is verified"* even for free enrollments, and the redirect target was unclear between the pricing PRD (`/learning/[slug]`) and the code (`/learning`). **Resolved 2026-10-29 (owner): `/learning` is correct**; PRD 03 §4.6 was updated.

**Mitigation:**

* Destination is settled (`/learning`). Still open: the copy for free enrollments (see PRD 05, R-FE-2).

---

### **Risk R-CK-8 — Test Pollution and Real Side Effects**

**Risk:** Tests create Razorpay orders, Supabase enrollment rows, admin activity log entries and real emails (BCC to the admin inbox) in whichever project the environment points to.

**Mitigation:**

* Use Razorpay **test** keys only (currently `rzp_test_`).
* Use a dedicated test user and delete its enrollments after each test.
* Suppress outbound email in test mode (section 15.2, TR-2).
* Prefer a separate Supabase project for automation.

---

### **Risk R-CK-9 — Coupon Governance**

**Risk:** `EXISTINGSTUDENT_BATCH03` is public and takes ₹1,999 / $50 off; there are no expiry dates or usage limits (PRD §13.1 S4). Real Clerk user ids are committed in `data/coupons.ts`.

**Mitigation:**

* Include the coupon × course matrix in CK-12, CK-13, CK-30 so any course priced at or below a coupon value is detected as free.
* Recommend expiry/usage fields and moving user ids out of source.

---

### **Risk R-CK-10 — Third-Party Dependency**

**Risk:** Razorpay checkout is an external script and iframe; real-gateway tests are slow and flaky.

**Mitigation:**

* Default to the mocked-gateway layer (M); keep real-gateway tests (R) to two nightly cases.
* Alert when Razorpay test-mode is unavailable instead of failing the PR gate.

---

## **15\. QA Priority & Execution Order**

Checkout should be the **fourth UI feature tested**, after authentication, public pages and course discovery & pricing.

### **Phase 1 — Entry & Guard Rails**

1. CK-03 closed cohort.
2. CK-01 / CK-02 Buy Now rendering and currency label.
3. CK-04 signed-out click.
4. CK-05 enrolled state.

### **Phase 2 — Order Creation**

1. CK-06 processing state.
2. CK-07 request contract.
3. CK-10 … CK-14 amount integrity and coupon carry-over.
4. CK-25 `create-order` failures.

### **Phase 3 — Payment Happy Path**

1. CK-08 / CK-09 overlay content.
2. CK-15 / CK-16 full paid flow.
3. CK-17 … CK-19 verification call and modal actions.
4. CK-28 post-purchase state.

### **Phase 4 — Negative & Resilience**

1. CK-20 … CK-24 failure, dismissal, verification failure, tampered signature, script failure.
2. CK-26 / CK-27 idempotency.
3. CK-29 / CK-30 binding and price equality across catalog.

### **Phase 5 — Cross-Cutting**

1. CK-31 free-coupon CTA switch.
2. CK-32 / CK-33 mobile and cross-browser.
3. CK-34 / CK-35 real gateway (nightly).
4. CK-36 accessibility.

### **15.1 Testing Weightage**

Effort is weighted by revenue impact × likelihood of regression. Use this to allocate test cases, review time and CI budget.

| Area | Weight | Why it carries this weight |
| ----- | ----- | ----- |
| Paid happy path end to end (INR + USD) | 20% | Direct revenue; touches all three layers. |
| Amount integrity (currency × coupon × course) | 15% | A mismatch under- or over-charges every buyer; known historic bug (`$9.99` parsed as 999). |
| Failure & cancellation paths | 15% | Largest number of distinct paths; money has moved in some of them. |
| Free-coupon switch and no-gateway guarantee | 12% | Revenue leakage; public 100% / large-fixed coupons exist. |
| Idempotency, double-click, repeat verification | 10% | Duplicate charges, rows and emails; non-atomic enrollment insert. |
| CTA state machine (closed, enrolled, processing, signed-out) | 10% | Prevents repeat or impossible purchases and silent failures. |
| Success modal & post-purchase hand-off | 8% | Onboarding and WhatsApp group are the only post-payment guidance. |
| Mobile, cross-browser, accessibility | 5% | Large share of buyers are on mobile; Razorpay behaves differently on Safari. |
| Real-gateway sandbox smoke | 5% | Confirms the stub still matches the real overlay. |
| **Total** | **100%** | |

**Tier allocation:** PR smoke ≈ CK-01, 03, 04, 15 (under 2 minutes); regression = all REG items; nightly = NGT items.

### **15.2 Test Environment, Data & Testability Requirements**

| ID | Requirement | Why | Owner / Status |
| ----- | ----- | ----- | ----- |
| TR-1 | **Open-cohort fixture:** an environment-gated QA course (for example `qa-checkout-sandbox`, ₹10 / $1, hidden from `/courses`, never in production) reachable by slug. | All real cohorts are closed. | **Built** 2026-10-27: gated `qa-checkout-sandbox` course and `QA100` coupon (`NEXT_PUBLIC_QA_FIXTURES=1`); real catalog unchanged. See [../TEST_DATA.md](../TEST_DATA.md) |
| TR-2 | **Email handling in test mode:** emails go to the owner's inbox, filtered by a subject label. Tests that can trigger email use an identifiable subject prefix (for example `[QA-AUTOMATION]`). | `verify-payment` sends receipts and BCCs the admin inbox. | **Decided** (D4); prefix to implement |
| TR-3 | **Stable test hooks:** `data-testid` on Buy Now, coupon input/apply, price, success modal and its two actions. | Text-based locators break on copy changes. | Proposed |
| TR-4 | **Test users:** personas U1, S1, A1 (see [../TEST_DATA.md](../TEST_DATA.md)); credentials in secrets; enrollments set up and cleaned up through the service role per test. | Isolation and repeatability. | **Decided** (D2); address of S1 to confirm (Q1) |
| TR-5 | **Gateway stub:** a Playwright helper that replaces `checkout.razorpay.com/v1/checkout.js` with a fake `window.Razorpay` recording options and calling the handler / `payment.failed`; it signs payments with `RAZORPAY_KEY_SECRET`. | Deterministic, fast, runs against real `create-order` and `verify-payment`. | Proposed |
| TR-6 | **Razorpay test keys only** in CI and local `.env.local` (present: `rzp_test_`). Add a guard test that fails if a `rzp_live_` key is detected. | Prevents real charges. | Proposed |
| TR-7 | **Separate Supabase project** for automation. | Tests write enrollment and activity rows. | **Decided** (D3): dedicated QA project exists; connection details pending (see [../TEST_DATA.md](../TEST_DATA.md)) |
| TR-8 | **Clerk sign-in helper** for a test user (existing `tests/auth.setup.ts` or Clerk testing tokens; verify compatibility with Clerk v4 before adopting). | All checkout states except S1/S3 need a session. | Open: how the test accounts sign in (password or Google) — Q4 |

### **15.3 Execution Readiness**

The real courses are all closed and stay that way (owner decision, 2026-10-27). The scenarios marked *blocked* below run only against the QA fixture course (`NEXT_PUBLIC_QA_FIXTURES=1`, section 15.2 TR-1), which now exists. Without the flag only these can run:

| Can run now (closed cohorts) | Blocked until an open cohort exists |
| ----- | ----- |
| CK-03 closed cohort shows *Enrollment Closed*, no Buy Now | CK-01, CK-02, CK-04, CK-06 … CK-27, CK-29 … CK-36 |
| CK-05 enrolled student on a closed cohort sees *You are Enrolled\! Go to Dashboard* (state S2) | |
| API-level: `create-order` / `enroll-free` reject closed cohorts (already in `tests/api/crm.spec.ts`) | |

Fixture-dependent tests skip with an explicit reason when the flag is off, and CI runs them with the flag on, so nothing is silently dropped. Still missing for the signed-in scenarios: the sign-in helper and the enrolled-student account (open question Q8).

---

## **16\. Definition of Done**

This feature is considered complete when:

* The open-cohort fixture (TR-1) exists and the checkout suite runs against it in CI.
* All Must requirements (FR1–FR15) have automated tests that pass in Chromium.
* Amount integrity is verified for every course × currency and for every coupon type.
* The mocked-gateway paid flow passes for INR and USD.
* Every negative scenario in section 12 has a test or a logged, accepted gap.
* Idempotency (double-click, repeat verification) is verified.
* Real-gateway test-mode cases (CK-34, CK-35) pass nightly or are explicitly deferred.
* Checkout PR smoke subset runs in under two minutes.
* Test data is cleaned up after each run and no live key is used.
* Risks R-CK-1 … R-CK-10 are mitigated or have an owner and a decision.
* No critical or high-severity checkout defects remain open.

---

## **17\. Future Enhancements**

* Razorpay webhook (`payment.captured`) as a reconciliation path for "paid but not enrolled".
* `ondismiss` handling and inline error toasts instead of `alert()`.
* Order-status polling after the overlay closes.
* Saved order recovery ("Resume payment").
* UPI/wallet/netbanking-specific test coverage.
* Coupon expiry, usage limits and an admin coupon screen.
* Automatic currency by geolocation.
* Invoice / GST receipt PDF.
* Refund workflow tests.
* Visual regression snapshots of the checkout panel and modal.
* Load test of order creation (Performance PRD).

---

## **18\. Glossary**

**Checkout:** The journey from clicking Buy Now to a verified enrollment.

**Razorpay Order:** A server-created payment intent with an amount, currency, receipt and notes.

**Razorpay Checkout / Overlay:** The hosted payment UI opened by `checkout.js`.

**HMAC Signature:** `razorpay_signature`, the SHA-256 HMAC of `order_id|payment_id` using the secret key; proves the payment callback is genuine.

**Order Notes:** Key/value pairs stored on the order (`userId`, `courseId`, `courseSlug`, `couponCode`) that bind payment to buyer and course.

**Minor Units:** Paise (INR) or cents (USD); Razorpay amounts are `price × 100`.

**Mocked Gateway:** A test technique that replaces the Razorpay script with a stub while the app's own API routes remain real.

**Idempotency:** Repeating an operation has the same effect as doing it once.

**Open Cohort:** A course with `enrollmentClosed: false`.

**CTA:** Call-to-action button.

---

## **19\. References**

* [components/ActiveCohorts.tsx](../../../components/ActiveCohorts.tsx) — checkout UI
* [app/courses/\[slug\]/page.tsx](../../../app/courses/%5Bslug%5D/page.tsx) — sales page
* [app/api/create-order/route.ts](../../../app/api/create-order/route.ts)
* [app/api/verify-payment/route.ts](../../../app/api/verify-payment/route.ts)
* [app/api/enroll-free/route.ts](../../../app/api/enroll-free/route.ts)
* [lib/pricing.ts](../../../lib/pricing.ts), [lib/enrollments.ts](../../../lib/enrollments.ts)
* [data/courses.ts](../../../data/courses.ts), [data/coupons.ts](../../../data/coupons.ts)
* [docs/PRD\_TM\_DIGITAL\_LEARNING\_PLATFORM.md](../../PRD_TM_DIGITAL_LEARNING_PLATFORM.md) §5.4, §6.1, §13 (S3, S4, S5, B2, B5)
* [docs/SUPABASE\_HARDENING.md](../../SUPABASE_HARDENING.md)
* Related PRDs: [01](01-ui-authentication-access-control.md), [02](02-ui-public-pages-navigation.md), [03](03-ui-course-discovery-pricing.md)
* Existing automation: [tests/ui/sales-funnel.spec.ts](../../../tests/ui/sales-funnel.spec.ts), [tests/api/crm.spec.ts](../../../tests/api/crm.spec.ts), [tests/unit/pricing.spec.ts](../../../tests/unit/pricing.spec.ts)
