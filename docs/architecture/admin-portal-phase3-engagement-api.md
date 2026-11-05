# Phase 3: Engagement and operations API — Blueprint

Status: **approved by the owner 2026-11-05** (recommended option on all five decisions in section 9). Note: setting keys are kebab-case (`announcement-email-cap`, ...) because `content_docs.key` only allows lower case; one extra rule S2: `announcement-email-cap` may not exceed `daily-email-cap`. Branch `admin-portal/p3-engagement-api`, stacked on `admin-portal/p2-content-api` (it re-targets to `epic/admin-portal` once phase 2 merges). Part of [admin-portal-plan.md](admin-portal-plan.md) section 7. Learners see nothing different until phase 5.

## 1. North Star
The admin can manage banners, site settings, e-mail templates, in-app notifications, manual enrolments and CSV exports through the API, with every rule that protects learners and the Gmail account enforced on the server and unit-tested.

## 2. Three slices, each its own PR and commit (reviewable, reversible)
| Slice | Content | New SQL |
|---|---|---|
| **3a Site content** | banners, settings, e-mail templates | **none** (`content_docs` already allows kinds `banner`, `setting`, `email_template`) |
| **3b Notifications** | create, schedule, list, delete notifications; the e-mail send action with caps | **2 tables**: `notifications`, `notification_reads` (run by you on QA, then production) |
| **3c Operations** | enrolments (list, grant, revoke), learners, 3 reports, CSV export | **none** |

## 3. Data shapes (final once approved)

```ts
// 3a ----------------------------------------------------------------------
type Banner = {                              // content_docs kind 'banner', key = slug
  purpose: 'announcement' | 'offer' | 'course-promo' | 'learner-notice' | 'maintenance';
  message: string;                           // plain text, max 280; never HTML
  ctaLabel?: string; ctaUrl?: string;        // https or a site-relative path
  style: 'info' | 'urgent' | 'success' | 'warning';
  placement: 'site-top' | 'courses' | 'course-page' | 'learning' | 'dashboard';
  audience: { kind: 'all' | 'visitors' | 'learners' } | { kind: 'cohort'; cohortSlug: string } | { kind: 'plan'; planId: string };
  startsAt: string | null; endsAt: string | null;   // window; endsAt after startsAt
  countdownTo?: string;                      // never shown negative
  dismissible: boolean; priority: number;    // higher wins; one banner per placement unless allowMultiple
  allowMultiple?: boolean;
};   // status draft | published | archived comes from content_docs
type SettingKey = 'announcementEmailCap' | 'dailyEmailCap' | 'supportPhone' | 'supportEmail';   // typed list, not free-form
type EmailTemplate = { key: 'welcome' | 'payment-receipt' | 'free-enrolment'; subject: string; body: string };   // body is plain text with {{placeholders}}, see rules

// 3b ----------------------------------------------------------------------
type NotificationType = 'transactional' | 'announcement' | 'reminder' | 'progress' | 'marketing' | 'admin-alert';
type Notification = {                        // table notifications
  id: string; type: NotificationType; title: string; body: string; link?: string;
  channels: Array<'inbox' | 'email'>;        // allowed set depends on the type
  target: { kind: 'all' } | { kind: 'cohort'; cohortSlug: string } | { kind: 'plan'; planId: string } | { kind: 'user'; userId: string };
  publishAt: string; expiresAt: string | null; createdBy: string; emailSentAt: string | null; emailRecipients: number | null;
};
type NotificationRead = { notificationId: string; userId: string; readAt: string };   // table notification_reads (used by the learner bell in phase 5)

// 3c ----------------------------------------------------------------------
type EnrolmentRow = { userId: string; email: string | null; name: string; cohortSlug: string; planId: string | null; enrolledAt: string; source: 'payment' | 'free' | 'manual' };
type Report = 'enrolments-per-cohort' | 'signups-per-day' | 'coupon-usage';
```

## 4. Endpoints (all `/api/admin/v1`, same envelope, guard, audit, rate limit, OpenAPI)
- **3a:** `banners` and `banners/{slug}` (CRUD + publish, unpublish, archive, restore, `If-Match`); `settings` (GET all) and `settings/{key}` (PUT); `email-templates` (GET), `email-templates/{key}` (GET, PUT, `POST …/preview` with sample values, returns the rendered text and HTML).
- **3b:** `notifications` (GET list, POST create), `notifications/{id}` (GET, DELETE), `notifications/{id}/recipients` (GET count and a sample, no addresses for more than 5), `notifications/{id}/send-email` (POST, once).
- **3c:** `enrolments` (GET with filters, POST grant, DELETE revoke), `reports/{name}` (GET), `exports/{enrolments|learners}.csv` (GET).

## 5. Rules (the part that must be right)
- **B1 Banners:** plain text only; the cta link is `https` or a site-relative path starting `/` (not `//`, not `javascript:`); `endsAt` after `startsAt`; `priority` 0 to 100; a pure function `visibleBanners(banners, viewer, now)` picks what a viewer would see (window, audience, placement, one per placement by priority unless `allowMultiple`, countdown never negative) and is used by phase 5.
- **S1 Settings:** typed keys with ranges (`announcementEmailCap` 1 to 200 default 50, `dailyEmailCap` 1 to 500 default 200, phone and e-mail formats); unknown keys refused; each change audited.
- **E1 Templates:** the admin edits **plain text**, never HTML. The server turns blank lines into paragraphs, supports `**bold**` and `[label](https://…)` and escapes everything else; placeholders from a fixed list per template (`{{name}}`, `{{course}}`, `{{amount}}`, `{{orderId}}`, …) are substituted **escaped**; an unknown placeholder is refused when saving; subject has no line breaks.
- **N1 Channels by type:** transactional and announcement: inbox + e-mail; reminder: inbox + optional e-mail; progress: inbox only; marketing: **inbox only** (owner decision Q4, e-mail is receipts and small announcements); admin-alert: not learner-visible. A request outside the allowed channels is 422.
- **N2 E-mail send:** only through the explicit `send-email` action (immediate, once per notification); refused above `announcementEmailCap` recipients (422) and when the day's total would pass `dailyEmailCap` (counted with the existing rate-limit counter); recipients are resolved on the server, never taken from the request; the recipient list is never returned.
- **N3 Inbox timing:** `publishAt` may be in the future (inbox only, no cron needed: it simply becomes visible then); `expiresAt` after `publishAt`.
- **N4 No learner data leak:** admin notification reads never return other users' read state beyond counts.
- **O1 Enrolments (as built, 2026-11-05):** `user_enrollments` has no source column, so revoke protects everything the admin API did not grant itself (matched by the exact enrolment id in the `grant` audit entry); `force` still needs the owner session. Original rule: grant reuses the existing manual enrolment logic (`lib/enrollments.ts`, Clerk lookup, activity log), accepts a `planId` that exists on the cohort, 409 if already enrolled; revoke refuses when the enrolment came from a payment (409, refund first) unless `force: true` **and** the owner session (not an API key); both audited.
- **O2 CSV:** cells beginning with `=`, `+`, `-`, `@`, tab or CR are prefixed with `'` (spreadsheet formula injection); values are quoted; no payment secrets or tokens; the export is audited; owner session or admin key only.
- **O3 Reports:** counts only, no personal data.

## 6. Tests (written with the code, constitution section 7)
- Unit (no DB): banner validators, `visibleBanners` (window, audience, placement, priority, countdown), setting ranges, template rendering and escaping (script tags, placeholders with HTML, unknown placeholders), channel rules per type, e-mail cap arithmetic, CSV escaping, enrolment rules (plan on cohort, source), permission table.
- API (QA): 401/403/400/404/409/422/428/200 for each endpoint, audit rows, staff key read-only, CSV content.
- OpenAPI contract test covers new routes automatically; PRD 19 (engagement API) and cases CSV; sample requests.

## 7. SQL (slice 3b only)
`docs/testing/sql/step8-notifications.sql`: `notifications` and `notification_reads`, RLS on, no grants for anon or authenticated, rollback at the bottom, run on QA first by you. Retention note: notifications older than 12 months can be deleted.

## 8. Do not
No learner-facing change, no raw HTML anywhere, no new package, no marketing e-mail, no cron or background sender, no automatic e-mail on notification creation.

## 9. Decisions needed from the owner (recommended option first)
1. **Slicing:** three slices, three PRs (3a, 3b, 3c) — recommended — or one PR for all of phase 3.
2. **E-mail templates:** plain text with simple formatting rendered safely (recommended) or allow admin HTML (needs a sanitiser package, not allowed).
3. **E-mail sending:** immediate, explicit action only, no scheduling (recommended), or scheduled sends (needs a cron).
4. **Settings list:** the four above (recommended), or tell me others.
5. **Revoking a paid enrolment:** refused unless `force` by the owner session (recommended), or always refused.
