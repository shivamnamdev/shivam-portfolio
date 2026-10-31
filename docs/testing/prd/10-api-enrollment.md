# **Product Requirements Document (PRD)**

**Product Name:** TM – Digital Learning Experience Platform  
**Feature:** \[API\] Enrollment APIs Testing (`enroll-free`, `admin/enroll`)  
**Prepared By:** Shivam Namdev & Claude Code  
**Date:** Oct 30, 2026  
**Status:** PRD draft — written from the code; UI side in [PRD 05](05-ui-free-enrollment-flow.md) and [PRD 08](08-ui-admin-portal.md)

---

## 1. Feature Overview

Two server routes grant a course without a payment:

* `POST /api/enroll-free` (`app/api/enroll-free/route.ts`) — public route; checks the session, the course, the cohort and the coupon; grants only when the server-computed price is 0.
* `POST /api/admin/enroll` (`app/api/admin/enroll/route.ts`) — admin-only (`requireAdmin()`); validates the Clerk user and the course, grants, logs `Backdoor access granted to <course>`.

Both write through `grantEnrollment()` in `lib/enrollments.ts`: check, then insert, then an activity entry. All three are tested here without the UI.

## 2. Business Objectives

* A course is never granted without a 100% coupon the learner may use, or an admin action.
* A repeated or parallel call never creates a second row.
* Refusals carry the right status and message.

## 3. Target Users

A visitor, a learner on the QA100 list, a learner not on it, the admin.

## 4. Scope

**In scope:** callers, validation, coupon rules, price-zero rule, idempotent grant, activity entry, response shapes, forged body fields, parallel calls. **Out of scope:** UI (PRD 05, 08), paid orders (PRD 09), database constraints (PRD 14), speed (PRD 15).

## 5. Request / Response Model

| Route | Body | Success | Refusals |
| --- | --- | --- | --- |
| `POST /api/enroll-free` | `{courseId, currency?, couponCode}` | `200 {success:true, message}` ("Enrolled for free successfully!" or "You are already enrolled in this course.") | `401` · `400` unknown course / closed / "Payment required." / invalid coupon · `403` restricted coupon · `500` |
| `POST /api/admin/enroll` | `{userId, courseSlug}` | `200 {success:true, enrollment{user_id, course_slug, user_email, enrolled_at}}` | `401` · `403` · `400` bad id / unknown course · `404` unknown Clerk user · `409` already enrolled · `500` |

## 6. Functional Requirements

| ID | Requirement |
| --- | --- |
| FR1 | `enroll-free` identifies the caller from the session. |
| FR2 | The enrolled course is derived from `courseId` on the server, never from a client slug. |
| FR3 | Free means the server-computed price after the coupon is 0; otherwise "Payment required." |
| FR4 | A restricted coupon is refused (403) for an account that is not on its list. |
| FR5 | `admin/enroll` is refused for everyone but the admin (401 / 403). |
| FR6 | The user id is trimmed and must be non-empty text; an unknown course is refused before the user lookup. |
| FR7 | A repeat is reported (200 message for free, 409 for admin) and adds nothing. |
| FR8 | Parallel calls leave one row. |

## 7. Negative Testing Requirements

Visitor, learner on an admin route, missing / blank / numeric / null / object ids, unknown course, closed cohort, forged `courseSlug`, coupons that do not make it free, a coupon the account may not use, GET.

## 8. Test Coverage Matrix

28 cases in [the workbook](../workbooks/%5BAPI%5D%20Enrollment%20APIs%20Testing.xlsx) (ids `ENRA-…`) and [`cases/prd10-enrollment-api.csv`](../cases/prd10-enrollment-api.csv). Automation: `tests/api/enrollment-apis.spec.ts`.

## 9. Risks

| Risk | Note |
| --- | --- |
| R-EA-1 | `grantEnrollment()` is check-then-insert with no unique constraint: parallel calls create several rows (SCP-44). Both routes fail the parallel cases. |
| R-EA-2 | A public coupon larger than the price makes a course free for anyone (`EXISTINGSTUDENT_BATCH03` on the fixture). Business rule to confirm; related SCP-53. |
| R-EA-3 | `enroll-free` is a public route with no rate limit: a signed-in account can call it in a loop. |
| R-EA-4 | The activity entry is written after the row and its failure is swallowed. |

## 10. Weightage and Testability

| Area | Weight |
| --- | --- |
| Who may grant (FR1, FR4, FR5) | 35% |
| Price-zero and coupon rules (FR3) | 25% |
| Idempotency and parallel calls (FR7, FR8) | 25% |
| Validation and shapes (FR2, FR6) | 15% |

Environment: QA Supabase (service role for assertions and cleanup), fixture course, edu (learner, shared account) and admin sessions.

## 11. Definition of Done

All 28 cases automated or a `test.fixme` with a reason; known failures keep failing visibly with a ticket; QA data restored; CHANGELOG line added.

## 12. References

[PRD 05](05-ui-free-enrollment-flow.md), [PRD 08](08-ui-admin-portal.md), `lib/enrollments.ts`, `lib/serverAuth.ts`, `lib/pricing.ts`.
