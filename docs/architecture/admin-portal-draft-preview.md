# Draft preview: the admin sees unpublished courses and cohorts as a learner would (Blueprint, APPROVED 2026-11-07)

Status: **approved by the owner 2026-11-07** with these decisions: design A (separate admin-only routes) but **reusing the real catalog cards and the real sales page**, so a preview looks as it will on the public site with only a draft tag on the card and one slim label on the page; archived cohorts **hidden by default**, with a dropdown that lists **only archived** ones (greyed out); preview is **read-only** (no checkout, also for published cohorts). Requested on 2026-11-07: "newly created courses are not listing if they are in draft; they should list for the admin only, so I can check and then publish". Nothing is built until this is approved. It belongs to phase 5 (slice 5e); it needs no SQL and no new package.

## 1. North Star
The admin can open any draft (or published, or archived) course or cohort exactly as a learner would see it, with a clear "draft" label, edit, look again, then publish. A learner or visitor never sees a draft.

## 2. Integrations
Supabase (service role, server side) and Clerk (the admin check). No new keys.

## 3. Source of truth and delivery
`content_docs` rows of kind `course` and `cohort` in **any** status except deleted. Delivery: two admin-only server pages and a "Preview as learner" button on the Courses and Cohorts screens.

## 4. The design choice (owner decision 1)
- **A (recommended): separate preview pages.** `/preview/courses` lists every cohort with a status badge (draft, published, archived); `/preview/courses/{cohortSlug}` renders the **same sales page** a learner gets, from the portal's data, with a banner "Draft preview, only you can see this. Checkout is off until you publish." The public `/courses` and `/courses/{slug}` are **not touched**: they stay cacheable, never depend on who is asking, and cannot leak a draft through a cache.
- **B: drafts inline on the public pages for the admin.** `/courses` would show draft cards to the admin only. That makes the two public pages depend on the signed-in user (rendered per request for everybody, slower, and a mistake in caching would show a draft to the public). Not recommended.

## 5. Behaviour (design A)
1. Guard: the same server check as the admin portal (a visitor goes to the home page, a signed-in learner to `/learning`; `robots: noindex`; the pages are not in the middleware's public list, so a visitor is also stopped by sign-in). The page data is never sent to a non-admin.
2. Data: a reader `lib/catalog/preview.ts` (server only, never cached, **independent of the `PORTAL_*` flags**, so it works whatever the flags say) reads the cohort and its course in any status and builds the page object with the existing `buildCourse` (prices and plans from the portal, no private links). A cohort whose course row does not exist is listed with the note "its course is missing".
3. Page: the sales page body moves into one shared component used by both the public route and the preview route, so what you preview is the real page, not a copy. Differences in preview: the status banner, the plan cards and Buy button are shown but a click explains that checkout is off (the order routes already refuse a draft with "Course not found", so nothing can be bought).
4. Lessons: not part of this slice (the Curriculum screen already has its outline preview).
5. Entry points: a "Preview as learner" link on the Courses and Cohorts screens (opens the preview in a new tab) and a "Learner preview" entry in the admin sidebar.

## 6. Data shapes
Reader output: `{ items: [{ slug, courseSlug, title, status: "draft"|"published"|"archived", courseStatus, listed, enrollmentClosed, priceText }] }` for the list; the full `CatalogCourse` (existing shape) plus `status` for one cohort. No payload of any public route changes.

## 7. Security rules
Server-side admin check before any data is read; the preview never returns private links; no preview data in any cache (`dynamic = "force-dynamic"`, no `unstable_cache`); the status banner text is fixed (no user text); the preview route is not added to `publicRoutes`.

## 8. Tests that ship with it
Unit: the list and one-cohort mapping (status, missing course, price text, no private link). API/UI (QA, flags both ways): a visitor and a learner cannot open either preview page (redirect, no draft text in the HTML); the admin sees a draft cohort in the preview list and on its page with the draft banner and its plans; the same draft is **absent** from the public `/courses` and `/courses/{slug}` (404); after publishing it appears on the public pages; the Courses and Cohorts screens show the link. Run with the catalog flag on `files` and on `database`.

## 9. Order of work
Blueprint approval, then: reader and unit tests, shared sales-page component (public page unchanged, existing sales and discovery specs re-run), preview pages, entry points, UI tests. Shown to the owner before commit.

## 10. Decisions (all answered 2026-11-07)
1. Design A (recommended) or B?
2. Should the preview list also show **archived** cohorts (recommended: yes, greyed), or only draft and published?
3. Should the preview be allowed to start a real checkout for a **published** cohort (recommended: no, preview is read-only; the public page is the place to buy)?
