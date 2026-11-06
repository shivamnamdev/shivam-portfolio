# Phase 4: Admin portal UI (Blueprint, APPROVED 2026-11-05)

Status: approved by the owner 2026-11-05 with the recommended option on all four decisions (five slices and five PRs; old `/admin` page kept until 4e; dark theme; admin-only read-only preview in 4c). Branch `admin-portal/p4-admin-ui` (stacked on `admin-portal/p3c-operations-api`; each slice gets its own branch and PR). Skills: nextjs-app-router-patterns, react-best-practices, frontend-ui-dark-ts, tailwind-design-system, e2e-testing, api-security-best-practices. Repo versions win: Next 14 (sync `params`), Tailwind v3, Clerk v4, no new package (D7).

## 1. North Star
The owner runs everything the phase 1 to 3 API can do from `/admin`, without Swagger or curl, and a non-admin never receives admin code or data. The screens only call `/api/admin/v1/**`; they hold no business rule of their own (the server rules and their tests stay the single source of truth).

## 2. Integrations and links
Clerk (session; admin = `isAdminEmail`), the admin API v1 (same-origin `fetch`, session cookie, envelope `{success, data|error}`, `If-Match` on updates). Link check before building each slice: the screen's list endpoint answers 200 as the admin. No new SQL, no new package.

## 3. Source of truth and delivery
Data: the API only (no direct Supabase from the browser). Delivery: pages under `app/admin/**`. Server layout `app/admin/layout.tsx` runs the admin check on the server (redirect visitors to `/`, other users to `/learning`) before any admin component is sent; client screens are loaded only inside it.

## 4. Shell, toggle, shared parts (slice 4a)
- Sidebar (plan section 3): Dashboard, Courses, Cohorts, Content, Coupons, Banners, Notifications, Learners and enrolments, E-mail templates, Settings, Audit log, API keys, API docs. Mobile: collapsible.
- Toggle: "Switch to learner portal" in the shell; "Switch to admin portal" in the learner `Navbar`, shown only to the admin (closes SCP-41). It is only a link; the protection is server-side.
- Shared components in `components/admin/` (hand built, Tailwind, Framer Motion only where the site already uses it): `DataTable` (cursor "Load more"), `StatusBadge`, `ConfirmDialog`, `FormField` with per-field server errors (`error.fields`), `Toast`, `useAdminApi` (envelope parsing, 401/403 redirect, 428/409 "changed by someone else, reload" handling, `If-Match` bookkeeping).
- Rules: every destructive action asks for confirmation naming the thing; errors show the server's message and field errors, never a raw stack; secrets (API key token) are shown once with a copy button and never stored in the page state after closing.

## 5. Slices (each its own PR, tests with it)
| Slice | Screens | API used |
|---|---|---|
| **4a Shell** | layout and guard, sidebar, toggle, dashboard hub (counts from reports), API docs link, audit viewer, API keys screen | reports, audit, api-keys |
| **4b Courses and cohorts** | list, create, edit, publish/unpublish/archive/restore/duplicate, cohort pricing (single or plans, the Q7 minimum shown inline), open/close enrolment, private links panel | courses, cohorts |
| **4c Curriculum** | per-cohort editor: modules and lessons, reorder, assignment and resources forms, draft/publish, import dry run (owner), read-only "preview as learner" rendering of the draft curriculum | curriculum, import |
| **4d Engagement** | coupons (3 kinds, generate batch, mandatory expiry), banners (live preview with `visibleBanners`), notifications (recipients count and sample, explicit "Send e-mail" with a confirm that shows the count and the caps), e-mail templates (preview), settings | coupons, banners, notifications, templates, settings |
| **4e People** | enrolments (filters, grant, revoke with the "not granted here, force" owner path), learners picker, reports, CSV export buttons | enrolments, reports, exports |
| **4f Learning activity** (added 2026-11-05 at the owner's request, later) | **Student progress** (videos completed, time, streaks per learner and course) and **Code submissions** (submitted code per lesson, read only, with the code viewer). Needs a small read-only API first (admin endpoints for `video_progress`, `assignment_progress` and `user_stats` with the same rules as the classic page's data route: admin only, no secrets, paged), written and tested before the screens | API tests then UI tests |
The old `/admin` page (learner CRM, backdoor enrolment, analytics, the progress and submissions tabs, Monaco viewer) keeps working untouched inside the shell. Slice 4e replaces its enrolment and learner features, slice 4f replaces its progress and submissions tabs; the page is removed only when 4f is done, with its two existing UI test files updated in the same change.

## 6. Tests (constitution section 7: unit tests with the logic)
- Unit (`tests/unit/`): the small pure helpers the screens need (envelope parsing and error mapping, `If-Match` bookkeeping, form to payload mappers, price display and Q7 check mirror, countdown/preview formatting). Anything that is only markup is covered by UI tests, and says so.
- UI (Playwright, `tests/ui/admin/`): per screen: visitor redirected, student redirected, admin sees it, one happy path (create, edit, confirm dialog, see the audit), one server refusal shown inline (a 400 field error, a 409 conflict). Accessibility scan per slice (labels, focus order, keyboard for dialogs). Existing admin UI tests keep passing.
- Show the owner each slice (screenshots or the running dev server) before it is finalised (constitution section 8).

## 7. Do not
No direct Supabase access from the browser, no business rules in components, no raw HTML rendered from admin text (plain text only, as the API stores it), no new package, no change to the learner portal except the toggle link, no auto-send of e-mail on any screen.
