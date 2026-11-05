# **Product Requirements Document (PRD)**

**Product Name:** TM – Digital Learning Experience Platform  
**Feature:** \[API\] Engagement and operations API: banners, settings, e-mail templates, notifications, enrolments, reports (phase 3 of the admin portal epic)  
**Prepared By:** Shivam Namdev & Claude Code  
**Date:** Nov 5, 2026  
**Status:** Blueprint approved on 2026-11-05 (`docs/architecture/admin-portal-phase3-engagement-api.md`). **Slice 3a built** (banners, settings, e-mail templates). Slices 3b (notifications) and 3c (operations) are added to this file as they are built.

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

