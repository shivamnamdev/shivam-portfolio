# Admin portal and learner portal (epic)

Status: **decisions D1 to D8 answered on 2026-11-04 (section 11); Blueprint approval and the new questions in section 11.2 are still open. No implementation code exists.** Date: 2026-11-04. Branch: `epic/admin-portal` (from `main`).
Owner request: two portals (Admin and Learner), switched with a toggle that only the admin sees; the admin portal gets full CRUD on courses, contents, coupons, banners (new), notifications and more; work in phases on a dedicated branch; **start with the admin API and Swagger**. A third-party enterprise Course Manager guide (the Skytap/Kyndryl help set, supplied by the owner) is the reference for what a mature course manager covers.

Per CONSTITUTION section 2 (halt rule): nothing below is built until the owner approves the Blueprint in `docs/blast/task_plan.md` and answers the questions in section 11.

## 1. North Star

One admin console where the owner can run the whole business without editing code: create and publish courses, edit lessons and assignments, manage coupons, banners and announcements, enrol learners and see what is happening, with every change checked on the server, audited and reversible. The learner portal keeps working the same way and reads what the admin published.

## 2. What we take from the enterprise Course Manager guide (and what we skip)

The guide describes VM labs (Skytap templates, events, delayed provisioning, CMHelper, scripts, consumption control). Most of that is not our product. The parts that are:

| Enterprise concept | Our equivalent | Decision |
|---|---|---|
| Course = reusable blueprint, Event = scheduled run | Course content (pitch, curriculum) vs a batch/cohort run (dates, price, links, enrolment open or closed) | **Adopt** as Course + Cohort (decision D1) |
| Manual with draft, publish, versions, mark inactive | Lesson and course content with draft, publish, revert, archive | **Adopt** |
| Published content, attachments | Course page copy, syllabus PDF, lesson resources | **Adopt** (attachments: decision D6) |
| Learning Console preview | "Preview as learner": the portal toggle, plus draft preview | **Adopt**: this is the toggle |
| Course edit and delete rules (what happens to people in a course in use) | Archive instead of delete when enrolments exist; block hard delete | **Adopt** |
| Users and roles (Admin, Staff, Event Manager, Lab) | Today one admin e-mail | **Later** (phase 6, decision D5) |
| Activity page, activity summary, CSV reports | Admin tabs already show progress, assignments, engagement | **Adopt**: add CSV export and filters |
| Email templates with placeholders and per-event override | Welcome and receipt e-mails are hard-coded HTML | **Adopt** (templates in the database, escaped placeholders) |
| Broadcast message to participants | Announcements and notifications | **Adopt** |
| Account settings (searchable) | Site settings (contact phone, WhatsApp widget, offer text) | **Adopt**, small |
| API keys with Staff or Admin level, API documentation | Admin API keys, Swagger | **Adopt** (phase 1) |
| Logs (who changed what) | Audit log for every admin write | **Adopt** (phase 1) |
| Tags, entitlements, custom data attributes, metadata attributes | Coupon allowed users and course access cover the real need | **Skip** for now |
| Templates, VMs, regions, CMHelper, scripts, lab actions, Virtual Browser, File Drop, delayed provisioning, scheduling, consumption control, LMS and SSO integrations | Not applicable | **Skip** |

## 3. The two portals and the toggle

- **Admin portal**: `/admin/**`, its own shell (sidebar: Dashboard, Courses, Cohorts, Content, Coupons, Banners, Notifications, Learners, Enrolments, E-mail templates, Settings, Audit log, API and docs).
- **Learner portal**: what exists today (`/`, `/courses`, `/learning`, `/live`, `/share`).
- **Toggle**: a button shown only to the admin, in the admin shell ("Switch to learner portal") and in the learner navigation ("Switch to admin portal"; also closes SCP-41). It is only a link: the real protection is server-side.
- **Rules**: `/admin/**` and `/api/admin/**` are checked on the server for every request (a server layout plus `requireAdmin()`); a non-admin never receives admin code or data (this also closes SCP-39 for the admin side). The toggle is hidden for everyone else and the last portal used is remembered in a cookie that grants nothing.
- **Preview**: from any course screen the admin can open "Preview as learner" for a draft; the preview route is admin-only and never writes learner data (no progress, no enrolment).

## 4. Domain model (data first)

Server-authoritative tables, RLS on, no anon or authenticated grants, written only through service-role routes (same pattern as the learner tables). Types below are the contract; field names are final only after decisions D1 to D6.

```ts
type Status = 'draft' | 'published' | 'archived';

type Course = {                       // content shared by every batch
  id: string; slug: string;           // slug stays stable: enrolments reference it today
  title: string; status: Status; version: number;
  pitch: { vsl: Vsl; painPoints: PainPoints; differentiators: Item[]; highlights: Item[]; outcomes: string[]; bonuses: Item[]; testimonials: Testimonial[]; syllabus?: AssetRef };
  createdAt: string; updatedAt: string; updatedBy: string;
};
type Cohort = {                       // a batch / run of a course
  id: string; courseId: string; slug: string; status: Status;
  statusText: string; demoOffer: string; duration: string; contactPhone: string;
  enrollmentClosed: boolean; listed: boolean;          // listed=false hides it from /courses (already on course-cta-update-3)
  pricing: PricingModel;                               // section 4.1
  startsAt?: string; endsAt?: string;
  // private part, server only (SCP-45): returned only to the admin and, after the access check, to enrolled learners
  whatsappLink: string; liveLink: string;
};
type Module = { id: string; courseId: string; title: string; position: number; advanced: boolean };
type Lesson = { id: string; moduleId: string; position: number; kind: 'video' | 'document'; videoId?: string; title?: string;
                assignment?: { title: string; rawUrl: string; solutionUrl?: string; starterCodeUrl?: string; labType?: 'python' | 'git'; isExam?: boolean } };
type Coupon = {                                         // section 4.2
  code: string; active: boolean;
  discount: { type: 'percentage'; percent: number } | { type: 'fixed'; inr?: number; usd?: number };
  expiresAt: string;                                     // MANDATORY for every kind, no coupon without an expiry
  audience: { kind: 'everyone' }                         // kind 1: open for all, many uses
          | { kind: 'selected'; userIds: string[] }      // kind 2: only the signed-up users the admin selected (at least one)
          | { kind: 'single-use' };                      // kind 3: generated code for a student the admin does not know yet, ONE redemption
  appliesTo?: { courseSlugs?: string[]; planIds?: string[] };   // optional extra: limit to some courses or plans
  maxRedemptions?: number | null; redemptions: number;          // optional extra for kinds 1 and 2
  reservedBy?: string | null; reservedUntil?: string | null;    // kind 3 only: held while a payment is in progress
  redeemedBy?: string | null; redeemedAt?: string | null;       // kind 3 only: who used it
};
type Banner = {                                          // section 4.4
  id: string; purpose: 'announcement' | 'offer' | 'course-promo' | 'learner-notice' | 'maintenance';
  message: string; ctaLabel?: string; ctaUrl?: string; style: 'info' | 'urgent' | 'success' | 'warning';
  placement: 'site-top' | 'courses' | 'course-page' | 'learning' | 'dashboard';
  audience: 'all' | 'visitors' | 'learners' | { courseSlug: string } | { planId: string };
  startsAt: string | null; endsAt: string | null; countdownTo?: string; dismissible: boolean; priority: number; active: boolean;
};
type Notification = {                                    // section 4.3
  id: string; type: NotificationType; title: string; body: string;
  channels: Array<'inbox' | 'email'>;                    // defaulted by type, the admin may narrow it per send
  target: 'all' | { courseSlug: string } | { planId: string } | { userId: string };
  publishAt: string; expiresAt: string | null; createdBy: string;
};
type EmailTemplate = { key: 'welcome' | 'payment-receipt' | 'free-enrolment'; subject: string; bodyHtml: string; updatedAt: string };   // placeholders escaped
type Setting = { key: string; value: string };       // small, typed list, not free-form
type AuditEntry = { id: string; at: string; actor: string; action: string; resource: string; resourceId: string; before?: unknown; after?: unknown };
type ApiKey = { id: string; name: string; level: 'admin' | 'staff'; hash: string; lastUsedAt?: string };     // secret shown once, only the hash is stored
```

Things the admin must **not** be able to enter: executable code (exam graders stay in `lib/examGraders.ts`, reviewed in git, because they run on the server), raw HTML in public pages (rich text is sanitised on write and escaped on render), URLs other than `https`.

## 4.1 Payment models (multi-plan pricing)

Source: branch `course-cta-update-3` (commit `be922f1`, not merged). It adds `pricingPlans` to a course (Community and Personal for Python: INR only, GST inclusive, different "facilities"), `planId` in `create-order`, `enroll-free` and `verify-payment`, `getBasePrice()` in `lib/pricing.ts`, `user_enrollments.plan_id` (SQL in `docs/SUPABASE_PLAN_COLUMN.md`), a `listed` flag, and a new Python sales page (plan cards, sticky enrol bar, instructor story, certificate preview).

The admin must manage pricing as a **model per cohort**, not two price strings:

```ts
type PricingModel =
  | { kind: 'single'; inr: Price; usd?: Price }                       // today's courses
  | { kind: 'plans'; currency: 'INR'; plans: Plan[] }                 // Community / Personal (on the branch)
  | { kind: 'installments'; ... } | { kind: 'bundle'; ... };          // reserved, not built until confirmed (Q1)
type Plan = { id: string; name: string; subtitle?: string; price: Price; originalPrice?: Price; popular?: boolean;
              features: string[];                                      // sales-page bullets
              perks?: Perk[];                                          // facilities with consequences, Q2
              unlocks?: { moduleIds?: string[]; lessonIds?: string[] } };   // plan-gated content, Q3
```

**Owner answers (2026-11-04)**: the further models (installments, bundles, upgrade by paying the difference, subscription) sound good and are wanted **in addition to plans**; plan facilities are kept: the admin can track what a plan owes a learner (for example 2 calls included, 1 used) and a plan can unlock specific modules or lessons, checked on the server. Delivery order, each as its own small plan before any code: (1) plans (already built on the branch), (2) upgrade by paying the difference, (3) bundles, (4) installments, (5) subscription (needs recurring payments from Razorpay and is the largest). The pricing model is a discriminated union so each kind is added without touching the others.

Rules: prices and plan ids are validated on the server; the amount never comes from the browser (already true on the branch); the plan is recorded on the order notes and on the enrolment (`plan_id`); a plan cannot be deleted while enrolments use it (archive instead); a plan price change does not touch past orders.

**Dependency:** `course-cta-update-3` changes `data/courses.ts`, `lib/pricing.ts`, the three payment routes and `lib/enrollments.ts`: the same files phase 1 imports and phase 5 replaces. It should land on `main` (and its `plan_id` SQL run) **before** phase 1's import script is written, so the imported shape includes plans. Open question Q6.

## 4.2 Coupons (decision D8, corrected twice: 2026-11-04)

Three kinds of coupon, and **every kind has a mandatory expiry date**:

| | Kind 1: open for all | Kind 2: selected students | Kind 3: one-time use |
|---|---|---|---|
| Who can use it | any signed-in learner who knows the code | only the learners the admin selected | the first signed-in person who redeems it, **not known in advance** |
| How many uses | many (optional overall limit) | many by each selected student (optional limit) | **exactly one**, then it is dead |
| Created how | admin types or generates a code | admin picks **several** signed-up users (searchable multi-select by name or e-mail) | admin generates **one or many random codes** in one action (for example 25 codes for a workshop), copies or downloads them and hands them out |
| Expiry | mandatory | mandatory | mandatory |
| Discount | percentage, or fixed amount (INR and/or USD) | same | same |

- **Expiry**: no coupon can be created or re-activated without a future `expiresAt`; an expired coupon is refused in validate, create-order and enroll-free; the admin list shows "expired" and "expires in N days".
- **Selected students**: the picker lists Clerk users who have signed up (the data behind today's `/api/get-clerk-users`, behind the admin guard) and stores their **Clerk ids**; the browser never receives a coupon's list of ids (closes the id leak in SCP-53). A person who has not signed up cannot be selected yet; they sign up first, then the admin adds them. Removing a student takes effect at once; an order already created keeps its price. Anyone else sees "This coupon is not available for your account" and learns nothing about the list.
- **One-time use**: codes are random and long enough not to be guessed (for example 10 characters from an unambiguous alphabet), created by the server, never derived from a name. To stop two people paying with the same code at once, the code is **reserved** for the signed-in user when the order is created (held for a short time, for example 30 minutes, then released) and **consumed** only when the payment is verified or the free enrolment is created, in one atomic step; a second person who tries a reserved or used code is refused. A failed or abandoned payment releases it. The admin list shows each code as unused, reserved, redeemed (by whom and when) or expired, and can void an unused code.
- **Optional extras, off by default** (say if you do not want them): limit a coupon to some courses or plans (needed once plans exist, for example only the Personal plan) and an overall use limit for kinds 1 and 2 (applied atomically, once per verified order or free enrolment).
- **Existing coupons** (decision Q5): they stay **as they are, aside**: `data/coupons.ts` is not imported into the admin. Phase 5 switches the learner portal to the database coupons; **from that moment the four old codes stop working** unless you recreate them in the portal. You create new coupons in the Course Manager whenever needed. (Existing students who already used them keep their enrolments.)
- Price maths stays deterministic in `lib/pricing.ts` and unit-tested. A discount that brings the price to **exactly zero** uses the free-enrolment path; the admin screen refuses a coupon and plan combination that would leave a price between zero and the payment minimum (decision Q7, below).
- Test-only: `QA100` (QA fixture coupon built from `NEXT_PUBLIC_QA_FREE_COUPON_USERS`) stays an environment-driven test fixture, not an admin coupon.

## 4.3 Notifications: in-app inbox with a bell, and e-mail

Every notification has a **type**; the type decides the default channels and whether the learner can opt out. The admin may narrow channels on a manual send, never widen them past what the type allows.

| Type | Examples | Inbox (bell) | E-mail | Opt-out |
|---|---|---|---|---|
| Transactional | payment receipt, enrolment confirmed, free enrolment, certificate ready | yes | yes | no |
| Course announcement | schedule change, live link posted, class cancelled | yes | yes | no, while enrolled |
| Reminder | class starts soon, assignment due | yes | optional per send | yes |
| Progress | exam passed, streak milestone, new lesson unlocked | yes | no | yes |
| Marketing | new batch, offer, coupon for you | yes | **no** (owner decision: e-mail is only for receipts and small announcements) | yes |
| Admin alert | new signup, new enrolment, failed payment | admin bell only | optional to the owner | n/a |

Needs: a `notifications` row per message plus `notification_reads` (per user read state) for the learner bell. **E-mail stays on the current Gmail sender** and is used only for receipts and small announcements (decision Q4): the send action refuses an announcement e-mail above a recipient cap (default 50, adjustable in settings) and counts sends against the daily Gmail allowance through the existing rate-limit counter, so the account is never pushed over its limit. No marketing e-mail, so no opt-in or unsubscribe flow is needed yet; if that changes, a provider and a consent flow come first.

## 4.4 Banners (all purposes)

`purpose` x `placement` x `audience` x schedule x priority, one model for every use: site-wide announcement, **offer with countdown** (replaces the hard-coded `UrgencyBanner`), course promo on a course page, learner notice inside `/learning` or the dashboard, and maintenance or incident notice. Rules: only banners inside their window and matching the viewer's audience show; at most one per placement (highest priority) unless the admin allows more; dismissal is remembered per browser (cookie), never required; the message is plain text with an optional `https` link (no raw HTML); a banner with a countdown never shows a negative time.

## 4.5 Role-ready guard (decision D5: RBAC later, designed in now)

Every admin route calls `requirePermission('resource:action')` (for example `courses:write`, `coupons:write`, `audit:read`) instead of `requireAdmin()`. In phase 1 the only role is `owner` (the admin e-mail) and it holds every permission, so behaviour equals today. Phase 6 (or earlier if wanted) adds a `roles` source and roles such as `editor` (content, no coupons or settings), `support` (learners and enrolments read, grant access) and `viewer`. Permissions are listed in the OpenAPI document per operation, so Swagger shows who may call what, and API keys carry a role. Cost now: one function and a permission list; cost later: a roles table and a screen, no route rewrites.

## 4.6 Supabase footprint (decision D6: keep it small, free plan)

The Free plan is limited (500 MB database, 1 GB storage, limited projects) and you run SQL by hand, so the design uses **few tables** and **no Storage**:

| Table | Holds | Phase | Why a table of its own |
|---|---|---|---|
| `content_docs` | one row per document: `kind` (`course`, `cohort`, `curriculum`, `banner`, `email_template`, `setting`), `key` (slug), `status`, `version`, `doc jsonb`, `updated_by`, `updated_at`; unique on (`kind`, `key`) | 1 | one table instead of about ten; the JSON shape is validated by the API, versions give draft, publish and revert |
| `coupons` | the coupon rows | 1 | needs unique codes and an atomic redemption counter |
| `admin_audit` | every admin write | 1 | append-only history |
| `api_keys` | hashed keys | 1 | secrets handled apart |
| `notifications`, `notification_reads` | messages and read state | 3 | per-learner state |
| `rate_limits` | exists | done | |

That is **4 new tables in phase 1**, 2 more in phase 3, and one added column already planned (`user_enrollments.plan_id`). Attachments and images stay in git (`/public`) or on external links; **no Storage bucket** until you ask. Each table comes with a SQL file and a rollback in `docs/testing/sql/`, run on QA first by you. Estimated data size is tiny (a few hundred KB of JSON); the audit log and notifications are the only tables that grow, and the plan includes a retention rule (for example keep 12 months of audit rows).

## 5. Admin API v1 (phase 1)

- **Where**: `/api/admin/v1/**`. Every route calls one shared guard: Clerk session of the admin, or an admin API key (hashed, rate limited with the existing `rate_limit_hit`). 401 for none, 403 for a signed-in non-admin.
- **Conventions**: JSON envelope `{ success, data | error }`; `400` validation (field errors), `404`, `409` conflict (duplicate slug, stale version), `422` rule violation (for example deleting a course that has enrolments); list endpoints take `limit`, `cursor`, `q`, `status`; updates use `If-Match: <version>` (optimistic concurrency); `Idempotency-Key` on create; no `select *`, no stack traces.
- **Audit**: every write inserts an `AuditEntry` (actor, action, before and after) in the same request. Failing to write the audit entry fails the request.
- **Resources and endpoints** (all have the standard `GET list`, `POST`, `GET one`, `PATCH`, `DELETE`; special actions listed):

| Resource | Phase | Special actions |
|---|---|---|
| `courses` | 1 | `publish`, `unpublish`, `archive`, `duplicate`, preview payload |
| `cohorts` | 1 | `open-enrolment`, `close-enrolment`, `links` (private part) |
| `coupons` | 1 | `activate`, `deactivate`, `redemptions` |
| `modules`, `lessons` | 2 | `reorder`, `move`, draft `publish` and `revert` |
| `assets` | 2 | signed upload and delete (D6) |
| `banners` | 3 | `activate`, `schedule`, preview |
| `notifications` | 3 | `send-now`, `expire` |
| `email-templates` | 3 | `preview` (sample data), `reset-to-default` |
| `settings` | 3 | typed get and set |
| `enrolments` | 3 | `grant`, `revoke`, list by course or user (builds on today's `/api/admin/enroll` and `dashboard-data`) |
| `learners`, `reports` | 3 | read only, CSV export of progress, assignments, engagement |
| `audit` | 1 | read only |
| `api-keys` | 1 | `create` (secret shown once), `revoke` |

## 6. Swagger (admin only)

- One **source of truth** for request and response shapes; the OpenAPI 3 document is built from it, not typed twice. Served at `/api/admin/v1/openapi.json` (admin or API key only) and rendered at `/admin/api-docs`.
- The public `/api-docs` page (SCP-29: already admin-only) is folded into this one; its inline spec for the existing routes becomes a section of the new document.
- **Contract test**: a test lists the real route files under `app/api/admin/v1` and fails if any is missing from the spec or the other way round, and checks that each documented status code is reachable. The spec never reaches the browser for a non-admin (server check before any Swagger code is sent, as today).
- Whether this needs new packages is decision D7 (nothing is installed without your OK, CONSTITUTION section 7).

## 7. Phases (each its own branch off `epic/admin-portal`, own PR, own tests and rollback)

| Phase | Scope | Exit criteria |
|---|---|---|
| **0 Blueprint** | This document, decisions D1 to D8, task plan approved | Owner approval recorded in `docs/blast/task_plan.md` |
| **1 Admin API foundation + Swagger** | Role-ready guard (`requirePermission`), envelope, errors, audit log, API keys; the 4 tables of section 4.6 (`content_docs`, `coupons`, `admin_audit`, `api_keys`); endpoints for courses, cohorts (with pricing models and plans) and coupons; OpenAPI and `/admin/api-docs`; import script that copies today's 5 courses and the coupons from `data/*.ts` into the tables (dry run first). **Nothing in the learner portal reads the new tables yet** | API tests per endpoint (401, 403, 400, 404, 409, 422, 200), audit rows exist, contract test green, import is repeatable and a diff shows zero changes against `data/*.ts`, RLS check on every new table |
| **2 Content API** | modules, lessons, assignments, assets, draft and publish, reorder, revert | Round trip: export the current `courseCurriculumMap` into tables and back, byte-identical; reorder is atomic |
| **3 Engagement and operations API** | banners, notifications, e-mail templates, settings, enrolments, learners, reports, CSV | Banner window and audience rules unit-tested; templates escape placeholders; CSV matches the admin tables |
| **4 Admin portal UI** | `/admin` shell, toggle, CRUD screens for every resource, preview as learner, audit viewer, API key screen; server layout guard | Playwright UI suite for each screen (visitor, student, admin), accessibility scan, existing admin tests still pass |
| **5 Learner portal reads the database** | Public pages and learning pages read published rows on the server; links only after the access check (SCP-45); coupon check on the server with expiry and limits (SCP-53); banners and notifications shown; revalidate on publish; **feature flag with fallback to the data files** | Full Playwright suite green with the flag on and off; bundle test shows no links, coupon codes or Clerk ids; learner flows unchanged |
| **6 Hardening and cutover** | Roles beyond one admin if wanted (D5), rate limits, backups and restore drill, performance budget, cleanup of `data/courses.ts` and `data/coupons.ts`, docs and runbook | Soak period without the fallback, rollback tested |

Phases 1 to 3 are API-only and invisible to learners, so they can merge to `main` safely behind the admin guard. The learner portal changes only in phase 5, behind a flag.

## 8. Relationship to existing tickets and plans

- **SCP-45, SCP-53**: closed by phases 1 and 5 (this plan replaces `docs/architecture/course-links-and-coupons-plan.md`, branch `docs/links-and-coupons-plan`).
- **SCP-39, SCP-41, SCP-40**: the server guard and the toggle close the admin side; SCP-40's merge gate is met by design (`requireAdmin()` on every write, with tests).
- **SCP-87 (Next and Clerk upgrades, `docs/architecture/dependency-upgrade-plan.md`)**: independent but touches the same files. Rule: do not run an upgrade stage while an admin phase PR is open; the admin guard is one function (`requireAdmin` in `lib/serverAuth.ts`), so the Clerk 7 migration changes one place.
- **The `admin-course-manager` branch** (`cms_*` tables, one write route without admin check) is **not reused**; the new tables and routes replace it. It stays unmerged and can be deleted after phase 1.

## 9. Security and constitution checklist (applies to every phase)

Server-side authorisation on every route; RLS on, no policies, no anon grants; input validated and length-limited; output escaped; admin-entered URLs `https` only and checked before they are stored; audit on every write; secrets only in `.env*` and shown once; no stack traces; rate limit on write endpoints; pricing and coupon rules stay deterministic in `lib/`; docs updated in the same PR (`docs/DATABASE.md`, PRD, `docs/testing/`); a test case registry entry for every new case (new PRD files `17` onward in `docs/testing/prd/`); Jira bugs and stories under SCP-2 and SCP-3; Playwright tests run on QA only, never production.

## 10. Risks

- **Course vs cohort split** touches enrolments (they key on the batch slug). Mitigation: the cohort keeps the old slug, so no enrolment row changes.
- **Pages are client components that import the data files** (about 2,000 lines in the lesson page): phase 5 is the largest change. Mitigation: read through a small server catalog module, flag and fallback, one screen at a time.
- **Caching**: published changes must show quickly. Mitigation: revalidate by tag on publish; test it.
- **Rich text** is an XSS risk. Mitigation: sanitise on write, escape on render, test with hostile input (PRD 16 pattern).
- **Scope**: this is a multi-week epic. Mitigation: phases ship independently; stop after any phase and the product still works.
- **Two long-lived branches** (`epic/admin-portal` and `main`) drift. Mitigation: merge `main` into the epic at the start of every phase and after any hotfix.

## 11. Decisions

### 11.1 Answered on 2026-11-04

| # | Decision | Recorded answer |
|---|---|---|
| D1 | Model | **Course + Cohort** (agreed) |
| D2 | Branching | Each phase PR into `epic/admin-portal`; epic merges to `main` after phases 3, 5 and 6 |
| D3 | Notifications | In-app inbox with a bell **and** e-mail; the type decides which (section 4.3) |
| D4 | Banners | Every purpose (section 4.4) |
| D5 | Roles | RBAC wanted later: role-ready guard now, roles in a later phase (section 4.5) |
| D6 | Attachments and Supabase | Keep Supabase small, no Storage, few tables (section 4.6) |
| D7 | Packages | "Appreciate it": recorded as thanks for asking, **not** as approval of a specific install. Exact proposal below, nothing installed |
| D8 | Coupons | **Corrected**: two kinds, open for all or selected students (several signed-up users picked by the admin), both with a mandatory expiry, percentage or fixed discount (section 4.2); plus payment models per course (section 4.1) |

**D7 decision (owner, 2026-11-04):** an **upgrade of a package that is already installed is fine; a new package must be shown to the owner first** (office laptop and office policies). So: **no new package for this epic.** Request validation and the OpenAPI document are written by hand in `lib/` (typed validators plus a typed OpenAPI object), and the contract test keeps spec and routes in sync. `zod` and `zod-to-openapi` are **not** proposed any more. The only package change in sight is the **upgrade of the already installed `swagger-ui-react` (3.x to 5.x)** for the admin docs page, which is stage 2 of the dependency plan (SCP-87); I will tell you the exact version and what changes before running it, as always.

### 11.2 Status of the questions

| # | Topic | Status |
|---|---|---|
| Q1 | Payment models | Answered: wanted, roadmap above |
| Q2, Q3 | Plan facilities and plan-gated content | Answered: keep both |
| Q4 | E-mail | Answered: receipts and small announcements only, Gmail stays |
| Q5 | Existing coupons | Answered: kept aside, not imported, new ones created in the portal |
| Q6 | `course-cta-update-3` | Merged with current `main` on a **test branch** (`integrate/course-cta-update-3`), 2 small conflicts resolved, tests run; the owner tests it before it lands |
| Q7 | Orders under the payment minimum | **Explained and proposed below, needs a yes** |
| Q8 | Approval of this Blueprint | **Still open** |

**Q7 explained.** Razorpay refuses an order below its minimum (1 rupee, 100 paise; 1 dollar-cent equivalents differ). Today `create-order` quietly charges at least 1 unit (SCP-51). That only matters if a discount leaves a price **between zero and the minimum**, for example a fixed-amount coupon that leaves 40 paise. With your prices (1999, 2999) and your rule "nothing is free until a coupon makes it free", the real cases are only two: (a) the coupon takes the price to **exactly zero**, which already goes through free enrolment and needs no decision; (b) a coupon that leaves a tiny positive amount, which should never happen on purpose. **Proposal:** the admin screen and API refuse to save a coupon (or a plan price) whose result for any course or plan would be above zero and below the minimum, and the server keeps the safety floor as a last guard. Then there is nothing for a learner to hit and SCP-51 closes as "prevented at creation". If you agree, no business decision is left here.

Also from CONSTITUTION section 3: **integrations** Clerk, Supabase, Razorpay (plans), Gmail sender (templates); **delivery** admin UI, API and Swagger; **Do not**: no executable content from the admin, no VM or lab features from the enterprise guide.

## 12. What happens after approval

1. Record the approval (Q8) and decisions in `docs/blast/task_plan.md`; create `docs/testing/prd/17-admin-api.md` with the case list for phase 1.
2. Create Jira stories under SCP-3 (tests) and tasks under SCP-2 (one per phase).
3. Phase 1 starts on branch `admin-portal/p1-api-foundation` from `epic/admin-portal`. Before the first SQL or any package install I will tell you exactly what it is and wait for your OK.
