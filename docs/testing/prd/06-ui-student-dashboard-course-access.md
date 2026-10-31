# **Product Requirements Document (PRD)**

**Product Name:** TM – Digital Learning Experience Platform  
**Product URL:** [https://shivamnamdev.com/](https://shivamnamdev.com/)  
**Feature:** \[UI\] Student Dashboard & Course Access Testing  
**Prepared By:** Shivam Namdev & Claude Code  
**Date:** Oct 30, 2026  
**Status:** PRD draft — written from the code and the owner's topic list; waiting for owner review (see [../README.md](../README.md))

---

## **1\. Feature Overview**

The student dashboard (`/learning`) is where a learner lands after signing in, after buying a course, and after a free enrollment. It answers four questions: *What am I enrolled in? Where do I join the live class? Where are my recordings? How am I doing?* A second page, the live-class lobby (`/live/[slug]`), is the gate to the Google Meet classroom for one course.

The feature is implemented in two client pages and one route:

* `app/learning/page.tsx` — **My Enrolled Courses**, *Browse Catalog* empty state, *Join Live Class*, *View Recordings*, streak, XP, leaderboard and resources.
* `app/live/[slug]/page.tsx` — enrollment check, **Secure Lobby**, *Enter Google Meet*, pre-class checklist, **Access Denied** state.
* `POST /api/xp/sync` — recomputes the learner's XP from their progress rows.

This PRD validates the **UI behaviour**: that the dashboard shows exactly the courses the learner owns, that every action opens the right place, that learners without access are stopped, and that the gamification widgets behave. It covers the post-purchase state that PRD 04 and PRD 05 lead into. The learning player itself (`/learning/[slug]`) belongs to PRD 07, and the admin portal to PRD 08.

Student dashboard is prioritised sixth because it depends on:

1. [Authentication & Access Control](01-ui-authentication-access-control.md) — sign-in, roles and route protection.
2. [Public Pages & Navigation](02-ui-public-pages-navigation.md) — how a learner reaches the dashboard.
3. [Course Discovery & Pricing](03-ui-course-discovery-pricing.md) — the catalog the empty state links to.
4. [Checkout Flow](04-ui-checkout-flow.md) and [Free Enrollment Flow](05-ui-free-enrollment-flow.md) — they create the enrollments the dashboard shows.

> **Overlap with PRD 01.** PRD 01 already automates who may open `/learning`, `/live/[slug]` and `/learning/[slug]` (`AUTH-ENR`, `AUTH-COURSE`, live-lobby cases in `tests/ui/auth/access-control.spec.ts`). This PRD does not repeat the access matrix. It adds what the learner **sees and can do** once inside, and reuses the PRD 01 cases where the same check applies.

> **Testability.** Real cohorts are closed, but enrolled learners keep access, so the dashboard can be tested with the seeded personas (Course A, Course B). Multi-course and "newly enrolled" states use the QA fixture course `qa-checkout-sandbox` through the grant/revoke helpers ([../TEST_DATA.md](../TEST_DATA.md)). The live link of every real cohort is currently empty (`liveLink: ""`), which makes the *No live link configured* state testable today; the *Enter Google Meet* state needs a fixture link (TR-2).

---

## **2\. Business Objectives**

### Primary Goals

* A paying or free learner finds their course within one click of signing in.
* Only enrolled learners can reach live classes and recordings; everyone else is stopped with a clear message.
* The dashboard never shows a course the learner does not own, and never hides one they do.
* Gamification (streak, XP, leaderboard) motivates without leaking private data or breaking the page.
* Support load drops: clear empty, loading and error states instead of blank screens.

### Success Indicators

* After any purchase or free enrollment, the course is listed on the next dashboard load.
* Zero cases of a learner seeing another learner's course or details.
* Dashboard usable on mobile and desktop; no console errors on load.

---

## **3\. Target Users**

| User | Needs from this feature |
| ----- | ----- |
| New learner, just enrolled | Sees the course immediately and knows where to start. |
| Returning learner, one course | Quick path to the live class and recordings. |
| Learner with several courses | One card per course, each with its own links. |
| Signed-in user with no courses | A friendly empty state and a way to the catalog. |
| Visitor | Sent away from the dashboard (to the home page or sign-in). |
| Admin | Can open the lobby of any course; the dashboard lists only the admin's own enrollments. |
| QA / automation | Seeded accounts and a fixture course to build every state. |

Personas (see [../TEST_DATA.md](../TEST_DATA.md)): V1 visitor, U1 no enrolments (edu), S1 Course B only (bazar), S2 Course A only (mavish), M1 several courses (a persona plus a temporary fixture grant), A1 admin (corp).

---

## **4\. Scope**

### **In Scope**

* `/learning` states: loading, signed-out redirect, empty, one course, several courses
* Course card: title, *Enrolled* and *Active Access* badges, *Join Live Class*, *View Recordings*
* Navigation targets: `/live/[slug]`, `/learning/[slug]`, `/courses` (*Browse Catalog*)
* Stats widgets: welcome name, Total XP, streak, leaderboard (top five, hidden accounts)
* Resources panel: syllabus download per enrolled course, empty text
* Live lobby: verifying state, **Access Denied**, **Secure Lobby**, *Enter Google Meet*, *No live link configured*, pre-class checklist, *Dashboard* back link
* Enrollment changes: new enrollment appears, revoked enrollment disappears, refresh persistence
* Failure handling: enrollment or stats request fails, XP sync fails
* Mobile and keyboard use, cross-browser smoke

### **Out of Scope**

* Who may open each route (access matrix) — PRD 01
* The course player, tabs, labs, AI tutor — PRD 07
* Admin portal — PRD 08
* Payment and enrollment creation — PRD 04 / 05
* Detailed API contract of `/api/xp/sync`, table design and RLS — API and Database PRDs
* Performance and load — Performance PRD

---

## **5\. Dashboard State Model**

| State | Signed in | Courses owned | Data requests | Rendered |
| ----- | ----- | ----- | ----- | ----- |
| D1 | loading | — | in flight | Spinner and *Loading your dashboard…* with navbar and footer |
| D2 | No | — | none | Redirect to `/` (client) after load; middleware sends visitors to sign-in |
| D3 | Yes | 0 | ok | **No courses yet\!** card and **Browse Catalog** → `/courses`; resources text *Course resources appear here once you enroll.* |
| D4 | Yes | 1 | ok | One course card with **Enrolled**, **Active Access**, **Join Live Class**, **View Recordings** |
| D5 | Yes | ≥ 2 | ok | One card per course, in catalog order |
| D6 | Yes (admin) | own only | ok | Same as D3/D4/D5: admin status adds no cards |
| D7 | Yes | any | enrollment request fails | Empty state shown (looks like D3) — see risk R-SD-4 |
| D8 | Yes | any | stats or XP request fails | Courses still shown; streak and XP fall back to defaults |

Live lobby states: **L1** verifying (spinner) → **L2** *Access Denied* (not enrolled, or lookup failed) → **L3** *Secure Lobby* with *Enter Google Meet* (link configured) → **L4** *Secure Lobby* with *No live link configured for this cohort yet.* Admins skip the enrollment check.

---

## **6\. Core Features & Capabilities**

### **6.1 My Enrolled Courses**

The page reads `user_enrollments` for the signed-in user and maps the slugs to `data/courses.ts`. Requirements: every owned course appears once; a course the learner does not own never appears; closed cohorts the learner owns still appear; unknown slugs in the table are ignored without errors; the learner's own first name shows in the welcome line (*Student* when missing).

### **6.2 Course Card Actions**

*Join Live Class* → `/live/[slug]`; *View Recordings* → `/learning/[slug]`; both use the card's own slug. Cards show the *Enrolled* and *Active Access* badges and the unlocked-materials text.

### **6.3 Empty State and Catalog Link**

Learners with no courses see **No courses yet\!**, an explanation and **Browse Catalog** → `/courses`. No course card, no *Join Live Class*.

### **6.4 Streak, XP and Leaderboard**

* First visit creates the `user_stats` row (streak 1, XP 0); a visit on the day after the last visit increases the streak; a gap resets it to 1; a second visit the same day changes nothing.
* XP is recomputed on every load by `POST /api/xp/sync` (10 per completed video, 50 per assignment) and shown as **Total XP** (desktop width).
* The leaderboard shows the top five learners by XP, after hiding four internal test and owner accounts; names are shown, emails are not.

### **6.5 Resources Panel**

Each owned course with a syllabus PDF gets a *\<course\> Syllabus* download link; with none, the panel shows *Course resources appear here once you enroll.*

### **6.6 Live Lobby**

Requirements: spinner while verifying; **Access Denied** for non-enrolled users and for lookup failures, with a *Return to Dashboard* link; for enrolled users and admins the **Secure Lobby** with the course title; *Enter Google Meet* opens the configured link in a new tab (`rel="noreferrer"`); with no link the text *No live link configured for this cohort yet.*; the checklist and the *Dashboard* back link work; a visitor never sees lobby content.

### **6.7 State Changes**

A new enrollment appears on the next load without a code change; a revoked enrollment disappears and its lobby becomes *Access Denied*; a hard refresh keeps the same state.

---

## **7\. User Flows**

### Flow D-A — First visit after buying or enrolling

Learner finishes checkout → *Go to Dashboard* → `/learning` → the new course card is the only card → *View Recordings* opens the course player.

### Flow D-B — Returning learner with one course

Sign in → dashboard (streak +1 if yesterday was active) → *Join Live Class* → lobby → *Enter Google Meet* in a new tab → back to the dashboard.

### Flow D-C — No courses

Sign in as a user without enrollments → empty state → *Browse Catalog* → `/courses`.

### Flow D-D — Several courses

Learner owns two courses → two cards, each linking to its own lobby and player.

### Flow D-E — Not enrolled, direct lobby link

Learner opens `/live/<other course>` → *Access Denied* → *Return to Dashboard*.

### Flow D-F — Visitor

Visitor opens `/learning` → sent to sign-in or the home page; no dashboard content is rendered.

### Flow D-G — Request failure

The enrollment request fails → the page shows the empty state; the learner reloads and the courses return (R-SD-4).

---

## **8\. Functional Requirements**

| ID | Feature | Priority | Requirement |
| ----- | ----- | ----- | ----- |
| FR1 | Loading state | Must | A spinner and message show until enrollment data is ready; no flash of the empty state for enrolled learners. |
| FR2 | Signed-out redirect | Must | Visitors never see dashboard content. |
| FR3 | Enrolled list | Must | Exactly the learner's enrolled courses are listed, each once. |
| FR4 | No foreign courses | Must | A course the learner does not own is never listed. |
| FR5 | Empty state | Must | *No courses yet\!* with *Browse Catalog* when there are no enrollments. |
| FR6 | Join Live Class | Must | Opens `/live/[slug]` of that card's course. |
| FR7 | View Recordings | Must | Opens `/learning/[slug]` of that card's course. |
| FR8 | Lobby access | Must | Non-enrolled users see *Access Denied*; enrolled users and admins see the lobby. |
| FR9 | Lobby link | Must | *Enter Google Meet* opens the configured link in a new tab, or the *No live link* text is shown. |
| FR10 | State freshness | Must | New enrollments appear and revoked ones disappear on the next load. |
| FR11 | Streak | High | Streak follows the first-visit / next-day / gap / same-day rules. |
| FR12 | XP | High | Total XP equals the server-computed value after sync. |
| FR13 | Leaderboard | High | Top five by XP, internal accounts hidden, names only. |
| FR14 | Resources | High | Syllabus links for owned courses; empty text otherwise. |
| FR15 | Failure handling | High | Stats, XP or enrollment failures never crash the page (see R-SD-4). |
| FR16 | Badges and copy | Medium | *Enrolled*, *Active Access* and unlocked-materials text on each card. |
| FR17 | Mobile | Medium | Cards and buttons usable at 390 px; XP block is desktop-only. |
| FR18 | Keyboard and browsers | Medium | Buttons reachable by keyboard; Chromium, Firefox and WebKit work. |

---

## **9\. UI Acceptance Criteria**

### **AC1 — Loading**

**When** `/learning` loads for a signed-in learner  
**Then** *Loading your dashboard…* shows until data arrives, then the final state replaces it.

### **AC2 — Visitor**

**Given** a visitor  
**When** they open `/learning`  
**Then** they are sent away and no dashboard content (*My Enrolled Courses*, *Welcome back*) is rendered.

### **AC3 — Empty state**

**Given** a learner with no enrollments  
**Then** *No courses yet\!* and *Browse Catalog* are shown, and no course card exists.

### **AC4 — One course**

**Given** a learner enrolled in one course  
**Then** exactly one card shows that course's title, *Enrolled*, *Active Access*, *Join Live Class* and *View Recordings*.

### **AC5 — Several courses**

**Given** two enrolled courses  
**Then** two cards appear, each with its own title and links.

### **AC6 — No foreign course**

**Given** a learner enrolled in Course A only  
**Then** Course B (and every other course) is absent.

### **AC7 — Actions**

**When** *Join Live Class* is clicked  
**Then** the learner is on `/live/<slug>`; **when** *View Recordings* is clicked, on `/learning/<slug>`.

### **AC8 — Browse Catalog**

**When** *Browse Catalog* is clicked  
**Then** `/courses` opens.

### **AC9 — Lobby denied**

**Given** a learner not enrolled in the course  
**When** they open `/live/<slug>`  
**Then** *Access Denied* and *Return to Dashboard* are shown and no lobby content.

### **AC10 — Lobby, link missing**

**Given** an enrolled learner and a course without a live link  
**Then** the lobby shows the course title and *No live link configured for this cohort yet.*

### **AC11 — Lobby, link set**

**Given** a course with a live link  
**Then** *Enter Google Meet* opens it in a new tab.

### **AC12 — State changes**

**When** an enrollment is added or removed  
**Then** the next load shows or hides that course, and the lobby of a removed course is *Access Denied*.

### **AC13 — Streak and XP**

**Then** a first visit shows streak 1; a visit the next day shows 2; a gap resets to 1; XP equals 10 × videos + 50 × assignments.

### **AC14 — Leaderboard**

**Then** at most five entries, internal accounts hidden, only names and XP shown.

### **AC15 — Failures**

**When** the stats or XP request fails  
**Then** the course cards still render and the page has no unhandled error.

---

## **10\. Test Coverage Matrix**

Layers: **U** = UI with seeded personas, **N** = network-mocked responses, **A** = UI plus QA Supabase (grant/revoke, direct row checks), **P** = pure logic.  
Tiers: **PR** = pull-request smoke, **REG** = regression, **NGT** = nightly.  
*Existing* names the automation that already covers the scenario (PRD 01 access cases in `tests/ui/auth/access-control.spec.ts`; PRD 03/04 specs).

| ID | Scenario | State | Layer | Tier | Existing |
| ----- | ----- | ----- | ----- | ----- | ----- |
| SD-01 | Loading state shown then replaced | D1 | N | REG | new |
| SD-02 | Visitor cannot see the dashboard | D2 | U | PR | ✓ AUTH route-protection |
| SD-03 | No-enrolment learner sees the empty state | D3 | U | PR | ✓ AUTH-ENR-001/002 |
| SD-04 | Browse Catalog opens `/courses` | D3 | U | REG | new |
| SD-05 | Empty state shows no course card and no Join Live Class | D3 | U | REG | partial |
| SD-06 | Course A learner sees only Course A | D4 | U | PR | ✓ AUTH-COURSE |
| SD-07 | Course B learner sees only Course B | D4 | U | REG | ✓ AUTH-COURSE |
| SD-08 | Card has title, Enrolled, Active Access, both buttons | D4 | U | REG | new |
| SD-09 | Join Live Class opens `/live/<slug>` | D4 | U | PR | new |
| SD-10 | View Recordings opens `/learning/<slug>` | D4 | U | PR | new |
| SD-11 | Two enrolled courses show two cards, correct links | D5 | A | REG | new |
| SD-12 | Newly enrolled course appears on next load | D4/D5 | A | PR | ✓ AUTH enrolment change; PRD 03 |
| SD-13 | Revoked course disappears; lobby becomes Access Denied | D3 | A | REG | ✓ AUTH enrolment change |
| SD-14 | Refresh keeps the same list | D4 | U | REG | new |
| SD-15 | Unknown slug in enrollments is ignored | D4 | A | REG | new |
| SD-16 | Closed-cohort course still listed for its learner | D4 | U | REG | ✓ Course A/B are closed |
| SD-17 | Admin sees only own enrollments (no extra cards) | D6 | U | REG | new |
| SD-18 | Welcome line shows first name | D4 | U | REG | new |
| SD-19 | First visit creates streak 1 | D4 | A | REG | new |
| SD-20 | Next-day visit increments the streak | D4 | A | REG | new |
| SD-21 | Gap resets streak to 1 | D4 | A | REG | new |
| SD-22 | Same-day second visit leaves the streak unchanged | D4 | A | REG | new |
| SD-23 | XP equals 10 per video + 50 per assignment | D4 | A | REG | new |
| SD-24 | XP sync failure keeps the page working | D8 | N | REG | new |
| SD-25 | Stats request failure keeps the cards | D8 | N | REG | new |
| SD-26 | Enrollment request failure: page does not crash | D7 | N | REG | new |
| SD-27 | Leaderboard: at most 5, ordered by XP | D4 | A | REG | new |
| SD-28 | Leaderboard hides internal accounts, shows no emails | D4 | A | REG | new |
| SD-29 | Resources: syllabus link for an owned course | D4 | U | REG | new |
| SD-30 | Resources: empty text when nothing owned | D3 | U | REG | new |
| SD-31 | Lobby denied for a non-enrolled learner | L2 | U | PR | ✓ AUTH-ENR-004 |
| SD-32 | Lobby verifying spinner | L1 | N | REG | new |
| SD-33 | Lobby for an enrolled learner, link missing | L4 | U | REG | ✓ AUTH live lobby |
| SD-34 | Lobby with a configured link opens it in a new tab | L3 | A | REG | new (needs fixture link, TR-2) |
| SD-35 | Lobby checklist and Dashboard back link | L3/L4 | U | REG | new |
| SD-36 | Lobby for admin without enrollment | L4 | U | REG | ✓ AUTH admin |
| SD-37 | Lobby lookup failure shows Access Denied | L2 | N | REG | new |
| SD-38 | Mobile 390 px: cards and buttons usable | D4 | U | NGT | new |
| SD-39 | Mobile: XP block hidden, rest readable | D4 | U | NGT | new |
| SD-40 | Keyboard: tab to both buttons, Enter works | D4 | U | NGT | new |
| SD-41 | Firefox and WebKit smoke of SD-06, SD-09, SD-10 | D4 | U | NGT | new |
| SD-42 | Dashboard after checkout: course listed (end to end) | D4 | A | REG | ✓ PRD 03/04 specs |

---

## **11\. Non-Functional Requirements**

| Category | Requirement |
| ----- | ----- |
| Security | A learner never sees another learner's courses. Lobby and recordings are only for owners and admins. Gaps in server enforcement are tracked in PRD 01 / R-SD-1. |
| Privacy | The leaderboard shows names and XP only; emails stay hidden. |
| Reliability | Any single failing request leaves a usable page. |
| Consistency | The list equals the `user_enrollments` rows for the learner at load time. |
| Usability | Clear empty, loading and denied states; actions named by what they do. |
| Accessibility | Buttons reachable by keyboard and named; headings in a sensible order. |
| Performance | Dashboard interactive within about 3 s on the QA stack; detailed targets in the Performance PRD. |

---

## **12\. Negative Testing Requirements**

| Case | Expected |
| ----- | ----- |
| Visitor opens `/learning` or `/live/<slug>` | Sent away; no dashboard or lobby content |
| Learner opens a lobby for a course they do not own | *Access Denied* |
| Learner opens `/learning?enrolled=true` or edits the URL | No effect on the list |
| Enrollment row with an unknown course slug | Ignored, no error |
| Enrollment, stats, XP or leaderboard request fails | Page still renders; see R-SD-4 |
| Course without live link | *No live link configured…* |
| Enrollment revoked while the lobby is open | Next load shows *Access Denied* |
| Session expires while on the page | Next navigation asks to sign in |
| Rapid double click on *Join Live Class* | One navigation |
| Back button after leaving the lobby | Dashboard shows again without errors |

---

## **13\. Success Metrics (KPIs)**

| KPI | Target |
| ----- | ----- |
| Foreign courses shown to a learner | 0 |
| Dashboard load without console errors | 100% of automated runs |
| Newly enrolled course visible on the next load | 100% |
| Non-enrolled lobby access | 0 |
| Dashboard PR smoke time | under 90 seconds |

---

## **14\. Risks & Mitigations**

| ID | Risk (from the code) | Impact | Mitigation / status |
| ----- | ----- | ----- | ----- |
| R-SD-1 | Enrollment checks on `/learning` and `/live/[slug]` are client-side with the anonymous Supabase key (PRD §13 S2); the lobby UI is hidden, not protected. | A determined user can read data or reach pages | Server-side check (SCP-39). SD-31 / SD-37 test the UI; API-level tests follow in the API PRDs. |
| R-SD-2 | Every course's `whatsappLink` and `liveLink` live in `data/courses.ts`, which is bundled into the public JavaScript, so they are readable without enrolling. | Group and class links leak to non-learners | Serve links from the server after an enrollment check. Not yet ticketed. |
| R-SD-3 | `user_stats` is written from the browser (streak, name, email) and the leaderboard is a direct read; streak logic can be forged. | Wrong streaks, privacy exposure of names and emails in the table | Move stats to a server route; return only name and XP. Tests SD-19 … SD-22, SD-28. |
| R-SD-4 | If the enrollment request fails, the page shows *No courses yet\!* (it ignores the error). | A paying learner sees an empty dashboard and may buy again | Show an error with a retry. Test SD-26 documents today's behaviour. |
| R-SD-5 | Four test and owner emails are hard-coded in the page to hide them from the leaderboard. | Owner emails in public JS; fragile | Use a flag column or a server filter. Test SD-28. |
| R-SD-6 | An admin dashboard shows only the admin's own enrollments; there is no admin entry point (AUTH-UI-004). | Admin confusion | Product decision (SCP-41). Test SD-17. |
| R-SD-7 | The streak rule compares dates in UTC while learners think in local time. | Streak may break around midnight | Document or switch to the learner's time zone. Tests SD-20 … SD-22 use fixed dates. |
| R-SD-8 | *Total XP* is hidden below the `md` breakpoint. | Mobile learners never see XP | Product decision. Test SD-39. |
| R-SD-9 | All real cohorts are closed and `liveLink` is empty, so *Enter Google Meet* is not testable on real data. | Gap in lobby coverage | Fixture link (TR-2). |
| R-SD-10 | Streak and XP tests change `user_stats`; leftover rows would skew other runs. | Test pollution | Snapshot and restore the stats row of the persona (TR-3). |

---

## **15\. QA Priority & Execution Order**

The dashboard is the **sixth UI feature tested**, after authentication, public pages, discovery & pricing, checkout and free enrollment.

### **Phase 1 — Guard rails and states**

1. SD-02 visitor, SD-03 empty state, SD-06 / SD-07 single-course learners.
2. SD-31 lobby denied, SD-16 closed cohort still listed.

### **Phase 2 — Actions and navigation**

1. SD-08 … SD-10 card content and both buttons.
2. SD-04 Browse Catalog, SD-35 lobby extras.

### **Phase 3 — State changes**

1. SD-11 … SD-15 several courses, grant, revoke, refresh, unknown slug.
2. SD-42 after-checkout journey.

### **Phase 4 — Gamification and resources**

1. SD-19 … SD-23 streak and XP.
2. SD-27, SD-28 leaderboard, SD-29, SD-30 resources.

### **Phase 5 — Failures and cross-cutting**

1. SD-24 … SD-26, SD-37 failures.
2. SD-38 … SD-41 mobile, keyboard, browsers.

### **15.1 Testing Weightage**

| Area | Weight | Why it carries this weight |
| ----- | ----- | ----- |
| Correct course list (own courses only, state changes) | 25% | The dashboard's main promise; a wrong list is a trust and security issue. |
| Access to live class and recordings (lobby, denied, actions) | 20% | Paid content; the gate is client-side today (R-SD-1). |
| Failure handling and empty/loading states | 15% | Silent failure turns into "I paid and see nothing" (R-SD-4). |
| Streak, XP and leaderboard | 15% | Browser-written data and privacy (R-SD-3, R-SD-5). |
| Navigation targets and card content | 10% | Cheap to break, visible to everyone. |
| Resources panel | 5% | Syllabus delivery. |
| Mobile, keyboard, cross-browser | 7% | Many learners are on phones. |
| Admin view | 3% | Small audience. |
| **Total** | **100%** | |

**Tier allocation:** PR smoke ≈ SD-02, 03, 06, 09, 10, 12, 31 (under 90 seconds); regression = all REG items; nightly = NGT items.

### **15.2 Test Environment, Data & Testability Requirements**

| ID | Requirement | Why | Status |
| ----- | ----- | ----- | ----- |
| TR-1 | Seeded personas U1 (no courses), S1 (Course B), S2 (Course A), A1 (admin), restored after the run. | Stable states D3 to D6. | **Done** (`global-setup`) |
| TR-2 | A fixture live link for `qa-checkout-sandbox` (for example a harmless `https://meet.google.com/qa-fixture` value behind the QA flag). | Needed for L3 and SD-34. | Proposed (needs a change to `data/courses.ts`, owner approval) |
| TR-3 | Snapshot and restore of the persona's `user_stats` row; ability to set `last_active_date` for streak cases. | SD-19 … SD-23 without pollution. | Proposed |
| TR-4 | Helpers to grant and revoke enrollments (fixture course, Course C). | Multi-course and change cases. | **Done** (`grantTestEnrolment`) |
| TR-5 | Request mocking for `user_enrollments`, `user_stats`, `/api/xp/sync`. | Failure paths. | **Done** (pattern in PRD 03 specs) |
| TR-6 | Progress rows (`video_progress`, `assignment_progress`) inserted per test for XP checks and cleaned up. | SD-23. | Proposed |
| TR-7 | `data-testid` on course cards, both buttons and the empty state. | Stable locators. | Proposed |
| TR-8 | A leaderboard fixture (several `user_stats` rows) in the QA project. | SD-27, SD-28. | Proposed |

### **15.3 Execution Readiness**

States D2 to D6, the card actions, the lobby denied/no-link states and enrollment changes can run now on the seeded personas. Streak, XP and leaderboard need TR-3, TR-6 and TR-8. The *Enter Google Meet* state needs TR-2. Existing PRD 01 automation already covers SD-02, 03, 06, 07, 12, 13, 31, 33 and 36.

---

## **16\. Definition of Done**

* All Must requirements (FR1 … FR10) have automated tests that pass in Chromium, or a logged and accepted failure with a Jira ticket.
* Every scenario in section 10 is automated or blocked with a reason.
* The list is proven to equal the learner's enrollments in each state (none, one, several, changed).
* Lobby behaviour is proven for denied, no-link and (with TR-2) link states.
* Streak and XP rules have tests with fixed dates and clean-up.
* Failure paths show no crash; R-SD-4 is fixed or accepted.
* Risks R-SD-1 … R-SD-10 are mitigated or have an owner and a decision.
* No critical or high-severity dashboard defect remains open.

---

## **17\. Future Enhancements**

* Per-course progress bars and "continue where you left off".
* Next live session date and countdown on the card.
* Server-side enrollment and link delivery (links never in the bundle).
* Error banner with retry instead of an empty state.
* Leaderboard served by the server with names only and a per-course filter.
* Notifications (new recording available).
* Certificates list on the dashboard.
* Visual regression snapshots of the dashboard states.

---

## **18\. Glossary**

**Dashboard:** The `/learning` page listing the learner's courses.

**Live lobby:** The `/live/[slug]` gate before the Google Meet classroom.

**Enrollment:** A row in `user_enrollments` linking a user and a course slug.

**Streak:** Consecutive days with a dashboard visit.

**XP:** Points computed from completed videos and assignments.

**Persona:** A named test account (see [../TEST_DATA.md](../TEST_DATA.md)).

**Fixture course:** The QA-only open course `qa-checkout-sandbox`.

---

## **19\. References**

* [app/learning/page.tsx](../../../app/learning/page.tsx) — dashboard
* [app/live/\[slug\]/page.tsx](../../../app/live/%5Bslug%5D/page.tsx) — live lobby
* [app/api/xp/sync/route.ts](../../../app/api/xp/sync/route.ts)
* [data/courses.ts](../../../data/courses.ts), [lib/admin.ts](../../../lib/admin.ts), [lib/supabaseClient.ts](../../../lib/supabaseClient.ts)
* [docs/PRD\_TM\_DIGITAL\_LEARNING\_PLATFORM.md](../../PRD_TM_DIGITAL_LEARNING_PLATFORM.md) §5.6, §13 (S2)
* [docs/DATABASE.md](../../DATABASE.md)
* Related PRDs: [01](01-ui-authentication-access-control.md), [02](02-ui-public-pages-navigation.md), [03](03-ui-course-discovery-pricing.md), [04](04-ui-checkout-flow.md), [05](05-ui-free-enrollment-flow.md)
* Existing automation: [tests/ui/auth/access-control.spec.ts](../../../tests/ui/auth/access-control.spec.ts), [tests/support/assertions.ts](../../../tests/support/assertions.ts)
* Jira: SCP-39 (server-side access checks), SCP-41 (admin link)
