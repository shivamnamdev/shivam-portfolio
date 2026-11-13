# Recorded courses replace the live cohorts (Blueprint, PROPOSED, awaiting owner approval)

Requested by the owner on 2026-11-13. Rule from CONSTITUTION §2: no implementation code until this is approved.

## 1. North Star

From now on only **recorded** courses are sold. The old live courses stay for the people who bought them and for the admin, and are invisible and unreachable for everyone else.

## 2. Decisions already given by the owner

- New routes: Python `python-foundation`, Git `git-beginner` (`/courses/<slug>`, `/learning/<slug>`).
- Old courses (`python-beginners-batch-2`, `python-beginners`, `git-beginner-batch-1`): not listed in `/courses`; still on the `/learning` dashboard of anyone enrolled; invisible to new visitors.
- The admin can still enrol any user into any course, old or new (for example someone who only wants the live recordings).
- Prices, plans and benefits on the new courses are today's, with live-only wording removed.
- The old sales page is reachable only by enrolled learners (and the admin); everyone else gets "not found" (no redirect).
- A shared lesson link of an old course works only for a learner enrolled in it.
- The live Python course is named "Python Live Session (Batch 2)" (SCP-101).
- Python outline is given (17 sessions, section 5). Video recordings do not exist yet: lesson video ids stay blank. The Git outline comes later.

## 3. Integrations and source of truth

- No new service. Source of truth is `data/courses.ts` (catalog and pricing) and `data/learning-content.ts` (curriculum). Production has no `PORTAL_*` flag set (checked on Vercel 2026-11-13: none), so these files are the runtime source; the admin-portal database path (`lib/catalog/*`) is off and is left unchanged.
- Enrolments: table `user_enrollments` (`course_slug`). No schema change.

## 4. Data shapes (additions only)

`data/courses.ts` entry gets one optional field:

```ts
format?: "live" | "recorded";   // default "live"; "recorded" hides every live-only element
```

New entries `python-foundation` and `git-beginner`: `listed: true`, `enrollmentClosed: false`, `format: "recorded"`, plans and prices copied from the live courses, `liveLink` empty, no live schedule facts. Old entries: `listed: false` and `enrollmentClosed: true` (the three old entries keep their data, so dashboards, certificates, the lobby and the admin enrol picker keep working).

`data/learning-content.ts`: new keys `python-foundation` and `git-beginner` with the module and lesson titles of section 5; every lesson `videoIds` entry blank until recordings exist. (How the player treats a lesson without a video id is decided in build step 3; it must show a "recording coming soon" state, never a broken player.)

Pure helper `lib/courseAccess.ts` (unit tested):

```ts
canSeeUnlisted({ listed, isAdmin, enrolled }): boolean   // listed => true; otherwise admin or enrolled
```

## 5. Python outline (from the owner)

17 sessions: 01 Foundation (Maggi Robot, Waiter Tray, Sticky Notes in Memory Heap); 02 Conditional Statements; 03 While Loop; 04 For Loops; 05 Loop Logical Program (bonus); 06 Patterns; 07 Logical Thinking (bonus); 08 Strings; 09 List; 10 Tuple & Set; 11 Dictionary; 12 File Handling; 13 Exception Handling; 14 Functions; 15 OOPs; 16 Mini Project; 17 GitHub Copilot and Claude. Metaphors per session as given in the chat of 2026-11-13; the sales-page modules group related sessions (to be shown to the owner as copy before going live).

## 6. Behaviour

| Where | Visitor | Enrolled learner | Admin |
|---|---|---|---|
| `/courses` | new courses only | same | same |
| `/courses/<new slug>` | page and checkout | page | page |
| `/courses/<old slug>` | 404 | page (closed, cannot buy) | page |
| `/learning` dashboard | n/a | cards of every course they own, old and new | own cards |
| `/learning/<slug>`, `/live/<slug>` | refused (already enforced) | open | open |
| `/share/<videoId>` of a new course | preview, then course page | lesson | lesson |
| `/share/<videoId>` of an old course | generic preview, then `/courses` | lesson | lesson |
| purchase of an old course (`create-order`, `enroll-free`) | refused (closed, already enforced) | refused | refused |

`format: "recorded"` hides: Join Live Class on the dashboard card, the live lobby link, "Live: Sat & Sun" and "Max N learners" facts, "Live interactive classes" and 1-on-1 call benefits on the plan cards.

## 7. Build order (each its own commit; unit tests ship with each)

1. Access rules: `lib/courseAccess.ts`, `/courses/[slug]` 404 for unlisted unless enrolled or admin, share page change (generic metadata and `/courses` fallback for old courses), old entries hidden. Tests `CAC-UNIT-*`, UI `CAC-UI-*`.
2. New course entries with recorded copy, plans and prices (Python now; Git when its outline exists). `format` field and the dashboard/lobby/facts changes. Tests.
3. Learning content for `python-foundation` (blank video ids, "coming soon" state). Exam, certificate and XP paths checked for a course with no videos.
4. Update affected existing tests (any spec that opens an old sales page as a visitor), PRD 03/06/07 and `docs/testing/CHANGELOG.md`.

## 8. Risks and open points

- **Git:** until the Git outline exists there is no recorded Git course. Hiding the old Git course now would leave `/courses` without a Git product; owner to decide (question below).
- Test suites use the live Python course as "Course A" and the QA fixture is derived from it; they keep working because the old entry stays in the data, only hidden.
- An enrolled learner who opens an old sales page sees a closed sales page; acceptable, the dashboard is the entry point.
- Crawler previews are public by design (WhatsApp): an old-course share link gets a generic title and no thumbnail so no lesson title leaks.
- Order and enrolment routes already refuse a closed course; no change to payment logic.

## 9. Owner decisions pending

1. Approve this Blueprint.
2. Git: hide the old Git course now (catalog has no Git until the new one exists) or keep it listed until the Git outline and recordings are ready?
3. Confirm: old-course share links show a generic preview and send non-enrolled people to `/courses`.
4. Confirm: Python Batch 1 follows the same hidden rules.
