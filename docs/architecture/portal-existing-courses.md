# Existing courses in the admin portal (Blueprint, APPROVED 2026-11-13)

Requested by the owner on 2026-11-13. Rule from CONSTITUTION §2: no implementation code until this is approved.

## 1. North Star

The cohorts the site sells and teaches today (Python Batch 1, Python Batch 2, Git Batch 1, and the new Python Foundation) appear in the admin portal as **published courses and cohorts**, and the owner adds videos to them there: open the cohort's curriculum, paste a YouTube link in a module, press Add. The learner sees the video without a deploy.

## 2. Decisions already given by the owner

- Scope: **lessons and course records only.** Sales pages, prices, plans and coupons stay in the data files (`PORTAL_CATALOG` and `PORTAL_COUPONS` stay off), so payments are untouched.
- Method: a **one-off import** of courses and cohorts (not typed by hand).
- Cohorts: **all four** (`python-beginners`, `python-beginners-batch-2`, `python-foundation`, `git-beginner-batch-1`).
- Video entry as today: the curriculum editor already has a "YouTube link or id" field and an **Add** button in every module (`app/admin/(shell)/curriculum/[cohort]/page.tsx`). Nothing to build for that part.

## 3. What exists and what is missing

| Piece | State |
|---|---|
| Admin screens for courses, cohorts, curriculum (add, reorder, publish, preview) | built (phase 4) |
| Curriculum import `POST /api/admin/v1/import/curriculum` (dry run by default, never overwrites an edited curriculum) | built (phase 2) |
| Learner reads lessons from the portal when `PORTAL_LEARNING=database`, falls back to the files on error or when empty | built (phase 5b) |
| **Import of courses and cohorts** (title, status, duration, links, syllabus, pricing) | **missing**: this change |
| **`format: recorded` on a portal cohort** (recorded-courses PR #99 reads it from the data files only) | **missing**: this change |
| Production flags | none set today (checked on Vercel 2026-11-13): learners read the files |

## 4. Design

**4.1 One course per cohort.** Each data entry becomes a portal course and a cohort with the same slug (`courseSlug` = cohort slug). A course holds the pitch shared by its batches; the live and recorded Python pitches differ, so one-to-one keeps every page exactly as it is. Grouping into one "Python" course can be done later in the portal.

**4.2 Import endpoint** `POST /api/admin/v1/import/catalog` (owner only, permission `import:run`), body `{ apply?: boolean, overwrite?: boolean }`. Dry run unless `apply: true`. Same safety as the curriculum import: a course or cohort that already exists and differs is reported (`differs`) and left alone unless `overwrite`. Response per entry: `{ slug, course: create|unchanged|differs|overwrite, cohort: ..., notes: string[] }`. Never returns a private link.

**4.3 Mapping** (pure, unit-tested `lib/adminApi/importCatalog.ts`, like `importCurriculum.ts`):

| Data file field | Portal field |
|---|---|
| `slug`, `title`, `statusText`, `demoOffer`, `duration`, `contactPhone`, `enrollmentClosed`, `listed` | cohort, same names |
| `whatsappLink`, `liveLink` | cohort `private` part (links, https only; empty stays empty) |
| `pricingPlans` (strings like `"₹1999"`) or `pricing` (INR and USD) | cohort `pricing` (`plans` with numbers, or `single`) |
| `vsl`, `painPoints`, `resources` (syllabus), `differentiators`, `cohortHighlights`, `courseTestimonials`, `outcomes`, `bonuses`, `modules` | course `pitch` (the allowed blocks only) |
| `format` (new) | cohort `format`: `"live"` or `"recorded"` |

Status after import: course and cohort **published** (the files are what learners see today), curriculum published by the existing import, same as phase 2.

**4.4 `format` through the portal.** Add `format` (optional, `"live"` or `"recorded"`) to the cohort create and update shapes and to `cohortFromDoc`, and return it from the learner course lookup, so the dashboard still hides "Join Live Class" for recorded courses when the learner flag is on.

## 5. Data shapes

Input: `{ apply?: boolean; overwrite?: boolean }`. Output: `{ data: { applied: boolean, plans: Array<{ slug: string; course: Action; cohort: Action; notes: string[] }> } }` with `Action = "create" | "unchanged" | "differs" | "overwrite"`. Cohort document gains `format?: "live" | "recorded"`. No table change (documents live in `content_docs`).

## 6. Build order (each with unit tests before the next layer)

1. `importCatalog.ts` mapper and planner, unit tests (mapping of all four entries, price strings, links to `private`, empty links, unchanged/differs/overwrite, `listed` and `enrollmentClosed` copied, no private link in the report).
2. `format` in the cohort shape, mapping and learner lookup; unit tests.
3. The route, OpenAPI entry, API tests on QA (`AAPI-IMP-*`: dry run writes nothing, apply creates, second run unchanged, edited cohort is left alone, non-owner refused).
4. QA: dry run, apply, the curriculum import, `cutover-check PORTAL_LEARNING`, learner suites with `PORTAL_LEARNING=database` and again with `files`, add one video through the editor and watch it appear.
5. Docs: PRD 17/18, cutover runbook, CHANGELOG, constitution log.
6. Production (owner actions, section 7).

## 7. Owner actions (production)

1. Merge the PRs; run the import dry run, read it, then apply (owner key); run the existing curriculum import dry run, then apply.
2. `node scripts/cutover-check.mjs PORTAL_LEARNING` says OK.
3. Set `PORTAL_LEARNING=database` in Vercel and redeploy; open a lesson as an enrolled learner, the dashboard card, and the live lobby of a live cohort.
4. Add videos in the portal.

## 8. Risks

- **Private links**: with the learner flag on, the live and WhatsApp links come from the portal. The import copies them exactly and the dry run lists, per cohort, whether each link is set (not the link itself); owner checks one lobby after the switch.
- **A learner in a cohort without a curriculum** would fall back to the files; the cutover check names such cohorts.
- **Edits in the portal diverge from the files.** After the switch the portal is the source for lessons; the files stay as the fallback and are not updated. Slice 6e (retiring the files) is a separate, later decision.
- **Progress** is keyed by course slug and video id and does not change; the round-trip of the three real curricula is already unit-tested.
- The portal cache is 60 seconds: a new video can take up to a minute to show.

## 9. Owner decisions pending

1. Approve this Blueprint.
2. One course per cohort (4.1) as the starting point: yes or group Python now?
3. Publish on import (4.3): yes, as the files are live today.

## Screen (2026-11-14)

The owner could not run the import on production without an API request, and `/admin/curriculum` lists cohorts, so curricula imported without a cohort were invisible there. `/admin/curriculum` now has a "Courses and cohorts from the data files" panel (Check, then Apply, owner only) that calls `POST /import/catalog`. No new server rule, no SQL, no new package. Tests `ADMUI-UNIT-CUR-014`, `ADMUI-CUR-016`.
