# **Product Requirements Document (PRD)**

**Product Name:** TM – Digital Learning Experience Platform  
**Feature:** \[API\] Engagement and operations API: banners, settings, e-mail templates, notifications, enrolments, reports (phase 3 of the admin portal epic)  
**Prepared By:** Shivam Namdev & Claude Code  
**Date:** Nov 5, 2026  
**Status:** Blueprint approved on 2026-11-05 (`docs/architecture/admin-portal-phase3-engagement-api.md`). **Slice 3a built** (banners, settings, e-mail templates). **Slice 3b built** (notifications; needs `docs/testing/sql/step8-notifications.sql`). Slice 3c (operations) is added when built.

---

## 1. Feature Overview
The admin manages banners, site settings and e-mail templates through `/api/admin/v1/**`. Learners and visitors see nothing different yet (phase 5 reads these through `visibleBanners` and the saved settings and templates). Everything is stored in `content_docs` (kinds `banner`, `setting`, `email_template`); slice 3a needs no SQL.

## 2. Business Objectives
* No banner, template or setting can inject HTML or a script into a page or an e-mail.
* A banner reaches exactly the people it was meant for, only inside its window, and the same rule is used by the admin preview and by learners.
* The e-mail caps that protect the Gmail account are settings with sane limits and cannot contradict each other.
* Every change is versioned (`If-Match`), rate limited, audited, and read-only for a staff key.

## 3. Rules under test (Blueprint section 5)
**B1 Banners:** plain text (no `<` or `>`, one line, 280 characters); the link is `https` or a path starting with a single `/` (never `//`, `javascript:`, `http:`); a link needs label and url; `endsAt` after `startsAt`; priority 0 to 100; an audience cohort must exist; a published banner cannot be deleted. `visibleBanners(rows, viewer, placement, now)`: only published, inside the window (start inclusive, end exclusive), right placement and audience; best priority wins alone unless it allows several, then every banner that allows several shows; ties are alphabetical; a countdown never shows negative.
**S1 Settings:** four fixed keys (`announcement-email-cap` 1 to 200 default 50, `daily-email-cap` 1 to 500 default 200, `support-phone`, `support-email`; the last two can be cleared with `null`). Keys are kebab-case because `content_docs.key` only allows lower case. Unknown keys are 404.
**S2 (added):** `announcement-email-cap` may not be higher than `daily-email-cap` (422), checked on every save.
**E1 Templates:** plain text; blank line = paragraph; `**bold**` and `[label](https://…)` only; everything else escaped; placeholders from a fixed list per template (`welcome` and `free-enrolment`: `name`, `course`; `payment-receipt`: `name`, `course`, `amount`, `orderId`); an unknown or unfinished placeholder is refused on save; values are escaped and cannot add formatting or links; the subject is one line and values cannot add line breaks (no header injection). Preview renders with sample values and sends and saves nothing.

## 4. Test coverage (slice 3a)
**Unit (no DB, `tests/unit/admin-api-engagement.spec.ts`, 20 tests):** `AAPI-UNIT-BAN-001` to `010`, `AAPI-UNIT-SET-001` to `003`, `AAPI-UNIT-TPL-001` to `006`, `AAPI-UNIT-PERM-003`.
**API (QA, `tests/api/admin-api-engagement.spec.ts`, 8 tests):** `AAPI-ENG-001` to `008`. The generic access (401, 403) and OpenAPI contract tests (`AAPI-AUTH-001/002`, `AAPI-OAS-002`) cover the new routes automatically. The engagement spec saves the QA settings and templates before it starts and restores them afterwards.
Run all admin API tests: `npm run test:admin-api`.

## 5. Endpoints (slice 3a)
`banners` (GET, POST), `banners/{slug}` (GET, PATCH, DELETE), `banners/{slug}/publish|unpublish|archive|restore` (POST); `settings` (GET), `settings/{key}` (PUT); `email-templates` (GET), `email-templates/{key}` (GET, PUT), `email-templates/{key}/preview` (POST). Permissions: `banners:*`, `settings:*`, `templates:*`; owner and admin keys have all, a staff key reads and previews only.

---

## 6. Slice 3b: notifications
In-app notifications and the one explicit e-mail action. Tables `notifications` and `notification_reads` (step 8 SQL, run on QA first). Learners do not see them until phase 5; `learnerVisible()` is the rule that phase uses.

**Rules under test:** N1 channels by type (transactional, announcement, reminder: inbox and e-mail; progress, marketing, admin-alert: inbox only; the inbox is always on; outside the allowed set is 422). N2 e-mail send: only through `POST /notifications/{id}/send-email`, immediate, once (claimed atomically, a second call is 409), recipients come from the target on the server and are never accepted from the request or returned, refused above `announcement-email-cap` (422), refused when the day's budget (`daily-email-cap`, shared with the contact form through `rate_limit_take`) would pass (422), and refused (503) if the counter is unreachable: this budget fails closed. One message per person, no shared To or Bcc. N3 an inbox item may be scheduled; a notification with the email channel may not (422). N4 an admin sees only a count of readers. N5 `admin-alert` is aimed at `admins` and only it can be.
**Decision recorded:** `notifications:send` is owner only (an admin API key can create and delete notifications but cannot send e-mail). Change it in `lib/adminApi/permissions.ts` if you want keys to send.
A send that reaches nobody (every attempt fails) records nothing and can be retried; the budget it used is not refunded.

**Unit (`tests/unit/admin-api-notifications.spec.ts`, 11 tests):** `AAPI-UNIT-NTF-001` to `011`.
**API (QA, `tests/api/admin-api-notifications.spec.ts`, 6 tests):** `AAPI-NTF-001` to `006` (skipped with a clear message until the step 8 SQL has run). They never send a real e-mail.
**Manual:** `AAPI-NTF-M-001` (a real send to two test inboxes) is in `docs/testing/cases/prd19-engagement-api.csv`.

Endpoints: `notifications` (GET list with `status`, `q`, `cursor`; POST), `notifications/{id}` (GET with `readCount`, DELETE), `notifications/{id}/recipients` (GET count and at most 5 sample), `notifications/{id}/send-email` (POST, owner only).

---

## 7. Slice 3c: enrolments, reports and exports
No SQL. Enrolments live in the existing `user_enrollments`; reports read it, `coupons` and Clerk.

**Rules under test:**
* **O1 Grant:** `POST /enrolments` with `cohortSlug` and exactly one of `userId` or `email` (signed-up users only; unknown id 404, unknown e-mail 400). The cohort must exist (an admin-API cohort or a course of the older static list; otherwise 422). A `planId` must be a plan of that cohort (400); recording it needs the `user_enrollments.plan_id` column (a clear 422 where it is missing, as on production today). Reuses `grantEnrollment` (idempotent, activity log). Already enrolled is 409. Audited as `grant`.
* **O1 Revoke:** `DELETE /enrolments/{id}`. `user_enrollments` has no "source" column, so **everything the admin API did not grant itself (paid, coupon, older manual) is protected**: refused with 409 unless `?force=true` from the **owner session** (an admin key with `force` gets 403). An enrolment counts as admin-granted only when a `grant` audit entry names that exact row id, so a later purchase of the same course never inherits an old grant. Only the enrolment row is removed; progress and submissions stay. Audited as `revoke` with `forced`.
* **O2 CSV:** `GET /exports/enrolments.csv` and `/exports/learners.csv`. Owner or admin key only (a staff key is 403), counted against the write limit, every export audited (`export`, with the row count). Every cell is quoted; a text cell starting with `=`, `+`, `-`, `@`, tab or CR gets a leading `'` so it cannot run as a spreadsheet formula. Fixed columns; no payment ids, tokens or private links are ever selected. `Cache-Control: no-store`, `Content-Disposition: attachment`. At most 20,000 rows (`X-Export-Truncated: true` if cut).
* **O3 Reports:** `GET /reports/{enrolments-per-cohort|signups-per-day|coupon-usage}`: counts only, no name, e-mail or id of a person. `signups-per-day` takes `days` (1 to 90, default 30; zero-filled UTC days, from Clerk, at most 2,500 people read). `truncated` says when data was cut at a safe limit.
**Decision recorded:** protect-all-but-admin-granted for revoke (chosen over adding a `source` column, which would touch the payment routes and need SQL). A `source` column can replace the audit lookup later without changing the endpoint.

**Unit (`tests/unit/admin-api-operations.spec.ts`, 9 tests):** `AAPI-UNIT-ENR-001` to `003`, `AAPI-UNIT-CSV-001` to `003`, `AAPI-UNIT-RPT-001` and `002`, `AAPI-UNIT-PERM-004`.
**API (QA, `tests/api/admin-api-operations.spec.ts`, 7 tests):** `AAPI-ENR-001` to `004`, `AAPI-RPT-001`, `AAPI-CSV-001` and `002`. They use the edu persona and remove every row they make.
Permissions: `enrolments:read|write`, `reports:read`, `exports:run` (owner and admin keys have all; a staff key reads enrolments and reports only).
Endpoints: `enrolments` (GET with `cohortSlug`, `userId`, `q`, `cursor`; POST), `enrolments/{id}` (DELETE), `reports/{name}` (GET), `exports/{file}` (GET).

