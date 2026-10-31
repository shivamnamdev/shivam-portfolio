# **Product Requirements Document (PRD)**

**Product Name:** TM – Digital Learning Experience Platform  
**Feature:** \[API\] AI Tutor, Certificate and Learning Support APIs Testing (`ai-tutor`, `generate-certificate`, `track-time`, `xp/sync`)  
**Prepared By:** Shivam Namdev & Claude Code  
**Date:** Oct 30, 2026  
**Status:** PRD draft — written from the code; the screens that call them are in [PRD 06](06-ui-student-dashboard-course-access.md) and [PRD 07](07-ui-learning-experience.md)

---

## 1. Feature Overview

* `POST /api/ai-tutor` (`app/api/ai-tutor/route.ts`) — public route. Today a **mock**: it waits 1.2 s and returns a canned hint chosen from the error in `output` (SyntaxError, NameError), an empty `code`, or the last Git command. The OpenAI client is created but never called.
* `POST /api/generate-certificate` — needs a Clerk session (not public). Builds a landscape A4 PDF with `pdf-lib` from `studentName` and `courseTitle` and returns it. The course page currently builds its certificate in the browser and does not call this route.
* `POST /api/track-time` — session required; adds `seconds` (1 to 60, whole number) to `user_stats.total_time_seconds`; fed by a 60-second heartbeat.
* `POST /api/xp/sync` — session required, no input; recomputes `total_points` = 10 × `video_progress` rows + 50 × `assignment_progress` rows and stores it.

## 2. Business Objectives

* The tutor and the certificate cannot be used by strangers or for other people's names, and cannot cost money when the mock is replaced by a real model.
* Time and XP shown to the admin and on the leaderboard cannot be inflated by a script.

## 3. Scope

**In scope:** access, input validation, response type and shape, robustness, anti-abuse. **Out of scope:** the lab and certificate screens (PRD 07), the dashboard widgets (PRD 06), the real model quality (not built), performance (PRD 15).

## 4. Request / Response Model

| Route | Request | Success | Refusals |
| --- | --- | --- | --- |
| `POST /api/ai-tutor` | `{labType, code, assignment, output, gitContext}` | `200 {success:true, message}` | `500 {success:false}` on a handler error |
| `POST /api/generate-certificate` | `{studentName, courseTitle}` | `200` `application/pdf` | `401/redirect` visitor · `400 {error:"Missing data"}` · `500` |
| `POST /api/track-time` | `{seconds}` | `200 {success:true, newTotal}` | `401` · `400 {error:"Invalid seconds"}` · `500` |
| `POST /api/xp/sync` | none | `200 {success:true, points}` | `401` · `500` |

## 5. Functional Requirements

| ID | Requirement |
| --- | --- |
| FR1 | The tutor answers with a hint that matches the error or Git command in the request. |
| FR2 | The tutor tolerates empty, unreadable and very large bodies without a `5xx`. |
| FR3 | The tutor needs a signed-in learner. |
| FR4 | The certificate route needs a session, refuses missing data, returns a valid PDF and tolerates unusual names. |
| FR5 | A certificate is only issued to a learner who finished the course. |
| FR6 | `track-time` accepts only whole numbers 1 to 60 and adds exactly that many seconds. |
| FR7 | Time cannot be added faster than real time. |
| FR8 | `xp/sync` computes points from progress rows only and is idempotent; the caller cannot set points or the user. |

## 6. Test Coverage Matrix

19 cases in [the workbook](../workbooks/%5BAPI%5D%20AI%20Tutor%20Certificate%20and%20Learning%20Support%20APIs%20Testing.xlsx) (ids `AIA-…`) and [`cases/prd13-learning-api.csv`](../cases/prd13-learning-api.csv). Automation: `tests/api/learning-apis.spec.ts`. The stats row of mavish is restored after each test.

## 7. Risks

| Risk | Note |
| --- | --- |
| R-AI-1 | The tutor is public. Once a real model replaces the mock, any visitor can spend the owner's tokens (needs sign-in, a per-user limit and a size limit). |
| R-AI-2 | `generate-certificate` issues a certificate for any name and course to any signed-in user; it does not check completion. It is unused by the UI today, so it can be removed or fixed. |
| R-AI-3 | A name the standard PDF font cannot draw (for example Japanese) returns `500`. |
| R-AI-4 | `track-time` has no rate limit: ten pings at once add ten minutes. Engagement time on the admin screen and any reward based on it can be inflated. |
| R-AI-5 | `track-time` and `xp/sync` read then write (no atomic add), so concurrent pings can lose updates. |

## 8. Weightage and Testability

Access and abuse 40% · validation 25% · XP correctness 20% · PDF validity 15%. Needs the QA Supabase service role (stats snapshot and restore) and the learner session of mavish.

## 9. Definition of Done

All 19 cases automated; known failures keep failing visibly with a ticket; stats rows restored; CHANGELOG line added.
