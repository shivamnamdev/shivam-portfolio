# **Product Requirements Document (PRD)**

**Product Name:** TM – Digital Learning Experience Platform  
**Feature:** \[API\] Clerk Webhook and User Lookup APIs Testing  
**Prepared By:** Shivam Namdev & Claude Code  
**Date:** Oct 30, 2026  
**Status:** PRD draft — written from the code; the admin screens that call these routes are in [PRD 08](08-ui-admin-portal.md)

---

## 1. Feature Overview

* `POST /api/webhooks/clerk` (`app/api/webhooks/clerk/route.ts`) — ignored by the Clerk middleware; verifies the svix signature with `CLERK_WEBHOOK_SECRET`; on `user.created` logs a `signup` row in `admin_activity_log` and sends a welcome e-mail to the student and a notice to the owner.
* `GET /api/get-all-users` — admin-only CRM directory from Clerk, paged (100 per page, at most 5000).
* `POST /api/get-clerk-users` — admin-only lookup `{userIds[]}` → `{id: {name, email, image}}`.

The two user routes are not public in `middleware.ts` and also call `requireAdmin()`.

## 2. Business Objectives

* Only a message signed by Clerk can create a signup record or send e-mail.
* A retried delivery never produces a second record or a second e-mail.
* Only the admin can list users or look up their e-mail addresses.

## 3. Scope

**In scope:** signature, timestamp, tampering, event handling, retry behaviour, response shapes, admin-only access, input handling. **Out of scope:** the Clerk sign-in itself (PRD 01), the admin screens (PRD 08), e-mail content and delivery (PRD 12), database design (PRD 14).

## 4. Request / Response Model

| Route | Request | Success | Refusals |
| --- | --- | --- | --- |
| `POST /api/webhooks/clerk` | svix headers + Clerk event JSON | `200 {success:true}` | `400` no headers / bad signature / old timestamp · `500` secret missing or handler error |
| `GET /api/get-all-users` | none | `200 {success:true, users:[{id,name,email,joinedAt,image}]}` | `401` · `403` · `500 {success:false}` |
| `POST /api/get-clerk-users` | `{userIds:[…]}` | `200 {success:true, users:{id:{name,email,image}}}` | `401` · `403` · `500` |

## 5. Functional Requirements

| ID | Requirement |
| --- | --- |
| FR1 | A webhook without svix headers, with a wrong secret, a changed body or a timestamp older than five minutes is `400`. |
| FR2 | A valid `user.created` writes one `signup` activity row and answers `200`. |
| FR3 | Other event types answer `200` and change nothing. |
| FR4 | Redelivery of the same message id does not repeat the side effects. |
| FR5 | A malformed but signed event is handled without a `5xx` (Clerk retries `5xx`). |
| FR6 | `get-all-users` is admin-only, returns exactly the five fields, newest first, uncached. |
| FR7 | `get-clerk-users` is admin-only, returns only the requested known ids with exactly `name`, `email`, `image`, and tolerates bad input. |

## 6. Test Coverage Matrix

26 cases in [the workbook](../workbooks/%5BAPI%5D%20Clerk%20Webhook%20and%20User%20Lookup%20APIs%20Testing.xlsx) (ids `CLKA-…`) and [`cases/prd11-clerk-api.csv`](../cases/prd11-clerk-api.csv). Automation: `tests/api/clerk-apis.spec.ts`. The webhook is signed in the test with `svix`; only events that cannot send e-mail are used.

## 7. Risks

| Risk | Note |
| --- | --- |
| R-CK-1 | No delivery de-duplication: the same svix message processed twice logs the signup twice and would send two welcome e-mails. |
| R-CK-2 | `user.created` without `email_addresses` throws (`email_addresses[0]`), so the route returns `500` and Clerk retries. |
| R-CK-3 | The signup log insert and the e-mail send are best-effort; a failure is only written to the console. |
| R-CK-4 | `get-all-users` loads up to 5000 users in the browser of the admin on every page load (see PRD 15). |

## 8. Weightage and Testability

Signature and tampering 35% · admin-only access 30% · retry and malformed events 20% · response shape 15%. Needs `CLERK_WEBHOOK_SECRET` (the suite skips with a reason without it), the QA Supabase service role for assertions and cleanup, and admin and learner sessions. A real signup with e-mails (WHK-011) is a manual case.

## 9. Definition of Done

All cases automated or recorded as manual/`test.fixme` with a reason; known failures keep failing visibly with a ticket; test rows removed; CHANGELOG line added.
