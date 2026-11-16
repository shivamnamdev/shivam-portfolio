# Learner draft preview: "Preview as learner" opens the real course page (Blueprint, APPROVED 2026-11-17, SCP-113)

Status: **approved by the owner 2026-11-17** (new tab; the old outline stays as "Outline").

## 1. North Star
After editing a curriculum, the admin presses "Preview as learner" and sees the real course page (YouTube player, lesson description, labs, exam) with the unpublished working copy, as a learner will see it after publishing.

## 2. Integrations and source of truth
Clerk (admin check) and Supabase (`content_docs`, kind `curriculum`, field `modules` = the working copy; `published` is what learners get). No new key, table, SQL or package.

## 3. Delivery
- Editor: "Preview as learner ↗" is a link that opens `/learning/<cohort>?preview=draft` in a new tab (`lib/learnerPreview.ts` `previewUrl`). "Outline" (the old plain list) is a toggle on the same screen.
- Page: `isDraftPreview(isAdmin, flag)`; only the admin is ever in it, anyone else with the flag in the address sees the normal course.
- Read: `GET /api/learning/content/{slug}?draft=1` returns the working copy in the lesson-page shape (`getDraftLayout`, never cached); 403 for anyone but the admin (no fallback to the published course), 401 without a session. Title and links come from the cohort as before.

## 4. Rules
- P1 Admin only (server and page).
- P2 Read only: in the preview nothing is written: no like, comment, "Mark complete", assignment or exam submission, no exam attempt, no XP sync, no study time (`TimeTracker` ignores the address). Each action shows "Preview only. Nothing is saved."
- P3 The preview shows the course as a new learner sees it: no stored progress is read.
- P4 A fixed amber bar says "Preview of the unpublished draft. Nothing here is saved." with "Back to the editor"; the page's Back arrow also goes to the editor.
- P5 As admin, locked advanced lessons open (existing admin behaviour).
- Not covered: the AI tutor still works in the preview (it stores nothing).

## 5. Tests
Unit `ADMUI-UNIT-PRV-001..004`; API `LRNP-API-001/002`; UI `ADMUI-PRV-001/002`; updated `ADMUI-CUR-004`-area clicks that used the old button (`admin-curriculum`, `admin-exam` now click "Outline").
