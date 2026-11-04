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
  expiresAt: string;                                     // MANDATORY, no coupon without an expiry
  audience: 'anyone' | { userIds: string[] };            // 'listed' students only: stored by Clerk id, picked by e-mail in the UI
  appliesTo?: { courseSlugs?: string[]; planIds?: string[] };   // empty = every course and plan
  maxRedemptions: number | null; maxPerUser: number | null; redemptions: number;
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

Rules: prices and plan ids are validated on the server; the amount never comes from the browser (already true on the branch); the plan is recorded on the order notes and on the enrolment (`plan_id`); a plan cannot be deleted while enrolments use it (archive instead); a plan price change does not touch past orders.

**Dependency:** `course-cta-update-3` changes `data/courses.ts`, `lib/pricing.ts`, the three payment routes and `lib/enrollments.ts`: the same files phase 1 imports and phase 5 replaces. It should land on `main` (and its `plan_id` SQL run) **before** phase 1's import script is written, so the imported shape includes plans. Open question Q6.

## 4.2 Coupons (decision D8)

- **Expiry is mandatory**: no coupon can be created or imported without `expiresAt`; an expired coupon is refused everywhere (validate, create-order, enroll-free). The 4 coupons in `data/coupons.ts` have no expiry today: **the owner must give a date for each** before they can be imported (I will not invent dates).
- **Audience**: anyone, or only the listed students (Clerk ids; the admin picks learners by e-mail and the API resolves them; lists are never sent to the browser, which closes the id leak in SCP-53).
- **Discount**: percentage, or fixed amount (INR and/or USD).
- **Scope** (new, needed for plans): optionally limited to some courses or some plans (for example a coupon only for the Personal plan).
- **Limits** (flexibility asked): `maxRedemptions` and `maxPerUser`, both optional; the counter is incremented atomically when a paid order is verified or a free enrolment is created, once per order (idempotent), so retries and parallel calls cannot over-use a coupon.
- Price maths stays deterministic in `lib/pricing.ts` and unit-tested: fixed discount larger than the price gives a free order only through `enroll-free`; the Razorpay one-unit floor (SCP-51) is decided together with this (Q7).

## 4.3 Notifications: in-app inbox with a bell, and e-mail

Every notification has a **type**; the type decides the default channels and whether the learner can opt out. The admin may narrow channels on a manual send, never widen them past what the type allows.

| Type | Examples | Inbox (bell) | E-mail | Opt-out |
|---|---|---|---|---|
| Transactional | payment receipt, enrolment confirmed, free enrolment, certificate ready | yes | yes | no |
| Course announcement | schedule change, live link posted, class cancelled | yes | yes | no, while enrolled |
| Reminder | class starts soon, assignment due | yes | optional per send | yes |
| Progress | exam passed, streak milestone, new lesson unlocked | yes | no | yes |
| Marketing | new batch, offer, coupon for you | yes | only if the learner opted in | yes (consent kept) |
| Admin alert | new signup, new enrolment, failed payment | admin bell only | optional to the owner | n/a |

Needs: a `notifications` row per message plus `notification_reads` (per user read state) for the learner bell; sending e-mail to many learners needs a provider decision because the current sender is a Gmail app password (a personal Gmail account allows roughly 500 messages a day): Q4. Opt-in and unsubscribe for marketing mail are needed in India (DPDP) and elsewhere.

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
| D8 | Coupons | Expiry mandatory, listed students only (optional per coupon), fixed or percentage discount (section 4.2); plus payment models per course (section 4.1) |

**D7 proposal (needs an explicit yes or no):**

| Package | Why | What it changes | Notes |
|---|---|---|---|
| `zod` (4.6.7) | one place that validates every request and response | `package.json` and the lock file; about 6 MB unpacked, no runtime dependencies | not installed today |
| `@asteasolutions/zod-to-openapi` (9.1.0, peer `zod` ^4) | builds the OpenAPI document from the same schemas, so spec and code cannot drift | `package.json` and the lock file | needs `zod` 4 |
| `swagger-ui-react` | already installed, but at 3.x with a critical `dompurify` advisory (SCP-87); the admin docs page should use 5.x | upgrade of an existing package, stage 2 of the dependency plan | I would do that stage first or together with phase 1 |

Alternative with **no new package**: hand-written validators and a hand-written OpenAPI object, plus the contract test. More code to keep in sync, nothing to install. Which do you prefer?

### 11.2 New questions from your answers

- **Q1 Payment models**: which models are real in the next 6 months? Today: single price, and plans (Community/Personal). Candidates: installments or EMI, bundle of courses, subscription or monthly, free with coupon only, upgrade from one plan to another by paying the difference. I will build the model so new kinds can be added, but only implement the ones you confirm.
- **Q2 Plan facilities with consequences**: the Personal plan promises 1-on-1 calls and direct WhatsApp access. Do you want the admin to track what is owed and done per learner (for example "2 calls included, 1 used")? That is a small extra table or JSON field.
- **Q3 Plan-gated content**: "Bonus: Advanced Python Recordings" suggests some lessons only for some plans. Should the plan unlock lessons or modules (access checked on the server), or are bonuses delivered outside the platform?
- **Q4 E-mail provider**: Gmail with an app password limits bulk sending. Keep it for transactional mail and small announcements (a few dozen), or move bulk and marketing mail to a provider with a free tier? (A choice and an account on your side; nothing installed without telling you.)
- **Q5 Coupon dates**: please give an expiry date for each existing coupon (`EXISTINGSTUDENT_BATCH03`, `BATCH002`, `BIRTHDAY20`, `SHIVAMSPECIAL`), or tell me which to retire.
- **Q6 `course-cta-update-3`**: will it merge to `main` soon? I recommend it lands (and `plan_id` SQL runs) before phase 1's import script, so plans are in the imported shape. It also hard-codes `InstructorStory` and `CertificatePreview`; the plan treats those as later "page sections" the admin can edit, not phase 1.
- **Q7 Minimum order**: with coupons and plans, should an order under the Razorpay minimum become free (enrol without payment) or be charged the minimum (SCP-51)? A business rule, so your call.
- **Q8 Approval**: do you approve this Blueprint (phases 0 to 6 as written, with the answers above) so I can write PRD 17, create the Jira tasks and start phase 1?

Also from CONSTITUTION section 3: **integrations** Clerk, Supabase, Razorpay (plans), Gmail sender (templates); **delivery** admin UI, API and Swagger; **Do not**: no executable content from the admin, no VM or lab features from the enterprise guide.

## 12. What happens after approval

1. Record the approval (Q8) and decisions in `docs/blast/task_plan.md`; create `docs/testing/prd/17-admin-api.md` with the case list for phase 1.
2. Create Jira stories under SCP-3 (tests) and tasks under SCP-2 (one per phase).
3. Phase 1 starts on branch `admin-portal/p1-api-foundation` from `epic/admin-portal`. Before the first SQL or any package install I will tell you exactly what it is and wait for your OK.
