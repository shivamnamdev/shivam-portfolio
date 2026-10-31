# **Product Requirements Document (PRD)**

**Product Name:** TM – Digital Learning Experience Platform  
**Product URL:** [https://shivamnamdev.com/](https://shivamnamdev.com/)  
**Feature:** \[API\] Payment APIs Testing (`create-order`, `verify-payment`)  
**Prepared By:** Shivam Namdev & Claude Code  
**Date:** Oct 30, 2026  
**Status:** PRD draft — written from the code; the UI side is in [PRD 04](04-ui-checkout-flow.md)

---

## 1. Feature Overview

Two server routes turn a click on *Buy Now* into an enrolment:

* `POST /api/create-order` (`app/api/create-order/route.ts`) — checks the session, the course, the cohort state and the coupon; computes the price on the server; creates a Razorpay order whose `notes` bind the buyer and the course.
* `POST /api/verify-payment` (`app/api/verify-payment/route.ts`) — checks the HMAC signature, re-reads the order from Razorpay, checks that it belongs to the caller, grants the enrolment once (`lib/enrollments.ts`), writes the activity entry and sends the welcome e-mail.

Both are listed as public in `middleware.ts` (no Clerk redirect) and check the session themselves. They are tested here **without the UI**: requests are sent directly, with a real Clerk session cookie for signed-in cases. Prices, signatures, ownership and idempotency are enforced here, never in the browser (CONSTITUTION §6), so this layer carries the money risk.

Order of work: UI (PRD 04/05) → **API (this PRD)** → database → performance.

## 2. Business Objectives

* A learner can never pay less than the server price, pay for a course for someone else, or get a course without a verified payment.
* A retried or repeated verification never creates a second enrolment or a second e-mail.
* Every refusal returns the right status code and a message the UI can show.

## 3. Target Users

Callers: a visitor (no session), a signed-in learner, a second learner (thief), the test suite with `x-api-key` (non-production only).

## 4. Scope

**In scope:** authentication of the caller, input validation, currency, coupon rules, amount in minor units, order notes and receipt, signature checks, order ownership, idempotency, activity entry, coupon recorded.

**Out of scope:** the UI behaviour (PRD 04), free enrolment (PRD 10), the Razorpay popup and real card payments, the Razorpay webhook (none exists, see §14), database constraints (PRD 14), response time (PRD 15).

## 5. Request / Response Model

| Route | Request body | Success | Refusals |
| --- | --- | --- | --- |
| `POST /api/create-order` | `{courseId, currency?, couponCode?}` | `200 {success:true, order}` | `401` no caller · `400` unknown course / closed cohort / invalid coupon · `403` restricted coupon · `500` keys missing or Razorpay error |
| `POST /api/verify-payment` | `{razorpay_order_id, razorpay_payment_id, razorpay_signature}` | `200 {success:true}` | `401` no session · `400` bad signature / order without details / unknown course · `403` order of another account · `500` unexpected error |

Order shape used by the tests: `order.id` (`order_…`), `amount` (paise or cents), `currency` (`INR`|`USD`), `status` (`created`), `amount_paid` (0), `receipt` (`rcpt_` + digits), `notes {userId, courseId, courseSlug, couponCode}`.

## 6. Functional Requirements

| ID | Requirement |
| --- | --- |
| FR1 | Identity comes from the Clerk session (or the test key outside production), never from the body. |
| FR2 | Unknown course, closed cohort, invalid or restricted coupon are refused with the documented status and message. |
| FR3 | The amount is computed on the server from the course price, currency and coupon; a paid order is never below one unit; client-sent prices are ignored. |
| FR4 | A verification needs a valid HMAC-SHA256 signature of `order_id|payment_id`; anything else is `400`. |
| FR5 | The course and the buyer come from the Razorpay order notes; another account gets `403`; an order without notes is `400`. |
| FR6 | Granting is idempotent: repeats and parallel calls leave one row, one activity entry and one e-mail. |

## 7. Negative Testing Requirements

Wrong, foreign-secret, other-payment and upper-case signatures; missing fields; unknown order; another account's order; forged body fields (`userId`, `courseSlug`, `amount`); unknown currency; GET; unreadable body.

## 8. Test Coverage Matrix

41 manual cases in [the workbook](../workbooks/%5BAPI%5D%20Payment%20APIs%20Testing.xlsx) (ids `PAYA-…`, six sheets) and the same list in [`cases/prd09-payment-api.csv`](../cases/prd09-payment-api.csv). Automation: `tests/api/payment-apis.spec.ts`.

## 9. Non-Functional Requirements

Orders are created in Razorpay TEST mode only (`rzp_test_` key); the suite skips with a visible reason otherwise. Unpaid orders are harmless. No real money, no popup.

## 10. Success Metrics

Zero cases where a refused request creates a row; zero cases where a repeated or parallel verification creates a second row.

## 11. Risks & Mitigations

| Risk | Note |
| --- | --- |
| R-PA-1 | Parallel verifications of one order create several rows and several e-mails (check-then-insert, no unique constraint). Known: SCP-44. |
| R-PA-2 | A correctly signed id for an order that does not exist returns `500` (the Razorpay lookup throws). Expected `4xx`. |
| R-PA-3 | A paid order is floored at one unit, so a 100% coupon or a sub-$1 price still produces a paid order (SCP-51). |
| R-PA-4 | No Razorpay webhook: a learner who pays but whose browser closes before `verify-payment` is charged without an enrolment. |
| R-PA-5 | Welcome e-mail is sent from the request; a mail failure is swallowed (no retry, no record). |

## 12. QA Priority, Weightage and Testability

| Area | Weight |
| --- | --- |
| Signature and ownership (FR4, FR5) | 30% |
| Server-side price and coupon rules (FR2, FR3) | 30% |
| Idempotency and parallel calls (FR6) | 20% |
| Access and input validation (FR1) | 15% |
| Receipt, notes shape | 5% |

Environment: QA Supabase (service role for assertions and cleanup), Razorpay test keys, fixture course `qa-checkout-sandbox`, personas edu (buyer), mavish and bazar (other accounts). The buyer account `edu` is shared with the UI specs that write enrolments: run those files in one worker (see `tests/README.md`).

## 13. Definition of Done

All 41 cases automated or recorded as a `test.fixme` with a reason; known failures keep failing visibly and carry a ticket; cleanup leaves the QA project as it was; CHANGELOG line added.

## 14. References

[PRD 04](04-ui-checkout-flow.md), [PRD 13 §13 known issues](../../PRD_TM_DIGITAL_LEARNING_PLATFORM.md), `lib/pricing.ts`, `lib/enrollments.ts`, `data/coupons.ts`.
