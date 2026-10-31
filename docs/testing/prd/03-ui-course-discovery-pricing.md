# Product Requirements Document (PRD)

Product Name: TM – Digital Learning Experience Platform  
Feature Module: Course Discovery & Pricing UI Testing  
Product URL: [https://shivamnamdev.com/](https://shivamnamdev.com/)  

Prepared By: Shivam Namdev & GitHub Copilot  
Date: September 19, 2026  

---

## 1. Product Overview

The Course Discovery & Pricing UI is the primary revenue entry point of the platform. It encompasses course card rendering, dual-currency toggles (INR/USD), real-time coupon validation, dynamic pricing calculations, and state-driven Call-to-Action (CTA) buttons ("Buy Now", "Enroll for Free", "Go to Dashboard"). 

This feature ensures frictionless conversion, correct financial representation across regional currencies, automated free bypasses, and secure redirects post-purchase or post-enrollment. Robust UI testing around these components is critical to protect bottom-line revenue and ensure smooth buyer journeys.

---

## 2. Business Objectives

Primary Goals

- Maximize conversion rates by presenting clear, dynamic pricing and instant coupon validation.
- Support global and domestic buyers seamlessly through multi-currency support (INR `₹` / USD `$`).
- Prevent revenue leakage or incorrect pricing displays through rigorous UI state verification.
- Automate free course enrollment bypasses when 100% discount coupons are applied.
- Maintain seamless post-purchase handoffs (WhatsApp inquiries, Razorpay gateway overlays, and direct dashboard routing for already-enrolled students).

Stakeholders

- Product Managers
- Growth & Marketing Teams
- Engineering / Frontend Team
- QA & Test Automation Team

---

## 3. Target Users

Primary Users

- Unauthenticated visitors browsing course cards and catalogs (`/courses`, `/`)
- Prospective students evaluating course pricing, curriculum, and discounts
- Logged-in users who have already purchased courses (seeing "Go to Dashboard" CTA states)

Secondary Users

- Admin operators monitoring coupon usage and transaction funnels
- Support agents handling checkout inquiries via WhatsApp widgets

---

## 4. Core Features & Capabilities

### 4.1. Course Card & Discovery Rendering
Course cards dynamically render summary details including title, instructor, duration, ratings, and pricing badges based on `data/courses.ts`.

Requirement Highlights
- Cards adapt to selected regional currency.
- Quick preview of syllabus and highlights directly from discovery views.

---

### 4.2. Dual Currency Toggle (INR / USD)
Users can toggle between Indian Rupees (INR `₹`) and US Dollars (USD `$`).

Requirement Highlights
- Price formatting automatically updates across all pricing tables and checkout buttons.
- Currency preference is preserved or defaults correctly based on regional context or user selection.

---

### 4.3. Coupon Input & Validation Messaging
A coupon code input box allows users to apply discount codes before initiating checkout.

Requirement Highlights
- Real-time validation against coupon rules defined in `data/coupons.ts`.
- Immediate success/error messaging (e.g., "Invalid coupon code", "Coupon applied: 20% off").
- Dynamic price strikethroughs and updated final totals.

---

### 4.4. 100% Free Enrollment Bypass
When a coupon reduces the course price to zero, the payment gateway is bypassed.

Requirement Highlights
- CTA automatically transforms from "Buy Now" to "Enroll for Free".
- Clicking the CTA instantly provisions access in Supabase (`user_enrollments`) and redirects to the learning portal without opening Razorpay.

---

### 4.5. Dynamic CTA States
CTA buttons dynamically update based on user authentication, purchase history, and coupon state:
- **Buy Now:** Triggers Razorpay payment order creation (`/api/create-order`).
- **Enroll for Free:** Triggers instant enrollment bypass (`/api/enroll-free`).
- **Go to Dashboard:** Displayed if the user has already purchased or enrolled in the course.
- **Disabled Conditions:** Disabled during active API request processing (loading spinners) or invalid coupon states.

---

### 4.6. Post-Purchase & Inquiry Redirects
Smooth handoffs after user interaction:
- Successful payment or free enrollment redirects users to the learning dashboard `/learning`, which lists the new course (owner decision 2026-10-29; the original text said `/learning/[slug]`).
- Floating WhatsApp widget provides instant sales inquiry support.

---

## 5. User Flows

### 5.1. Standard Purchase Flow
1. User lands on `/courses/[slug]` or discovery sections.
2. User selects currency (INR or USD).
3. User enters a valid discount coupon (optional); prices update dynamically with success feedback.
4. User clicks **"Buy Now"**, initializing the Razorpay checkout overlay.
5. Upon successful payment verification (`/api/verify-payment`), user is redirected to `/learning` (owner decision 2026-10-29), where the new course is listed.

### 5.2. Free Coupon Bypass Flow
1. User enters a 100% discount coupon code.
2. System validates coupon, sets price to `0`, and updates CTA to **"Enroll for Free"**.
3. User clicks CTA; system bypasses Razorpay and records enrollment in Supabase.
4. User is redirected to the learning dashboard instantly.

### 5.3. Returning Enrolled Student Flow
1. User visits course sales page while authenticated.
2. System checks Supabase `user_enrollments`.
3. CTA dynamically renders **"Go to Dashboard"**.
4. Clicking CTA routes the user straight to their active course materials.

---

## 6. Functional Requirements

| ID | Feature | Priority | Description |
|---|---|---|---|
| FR1 | Course Card Rendering | Must | Render course details, pricing, and badges correctly from `data/courses.ts`. |
| FR2 | Currency Toggle | Must | Switch pricing between INR and USD instantly across UI components. |
| FR3 | Coupon Validation | Must | Validate coupon codes against `data/coupons.ts` with explicit error/success messages. |
| FR4 | Dynamic Price Updates | Must | Recalculate and display discounted totals and strikethrough original prices. |
| FR5 | Free Coupon Bypass | Must | Convert "Buy Now" to "Enroll for Free" when price reaches zero and bypass payment. |
| FR6 | CTA State Handling | Must | Render correct CTA ("Buy Now", "Enroll for Free", "Go to Dashboard", or Loading Spinner). |
| FR7 | Already Enrolled Check | Must | Detect existing enrollments via Supabase and update CTA accordingly. |
| FR8 | Post-Purchase Redirect | High | Automatically redirect users to `/learning` upon successful fulfillment. *(Updated 2026-10-29: destination is `/learning`, the dashboard, not `/learning/[slug]`.)* |
| FR9 | Error State Resilience | High | Handle invalid coupons, network timeouts, and payment gateway failures gracefully. |

---

## 7. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Currency toggling and coupon validation feedback render within 100ms. |
| Usability | Clear visual hierarchy for prices, discounts, and error alerts on mobile and desktop. |
| Reliability | Robust handling of coupon database lookups and signature verification handoffs. |
| Maintainability | Centralized pricing and coupon logic connected cleanly to `data/` definitions. |

---

## 8. Success Metrics (KPIs)

- Coupon validation success response time
- Checkout initiation conversion rate (% of visitors clicking Buy Now)
- Free coupon bypass completion rate
- Zero unhandled errors during currency switching or coupon application
- Correct CTA rendering accuracy across user enrollment states

---

## 9. Pricing & Licensing

Pricing tiers are defined per course in `data/courses.ts` supporting dual currencies (INR and USD). Coupon discount rules are managed centrally in `data/coupons.ts`.

---

## 10. Risks & Mitigations

- **Currency Mismatch:** Ensure Razorpay order creation matches the user's selected currency frontend state.
- **Coupon Abuse / Expired Codes:** Implement strict validation checks against expiration dates and usage limits in backend/frontend handlers.
- **Race Conditions in Free Bypass:** Ensure idempotency when inserting enrollment records into Supabase.

---

## 11. Future Enhancements

- Automatic currency geolocation detection
- Tiered affiliate coupon tracking
- Bundle course discount packages
- Dynamic countdown timers for promotional coupon pricing

---

## 12. Appendices

References:
- `data/courses.ts`
- `data/coupons.ts`
- `app/courses/[slug]/page.tsx`
- Playwright E2E and UI test specifications (`tests/ui/sales-funnel.spec.ts`)
