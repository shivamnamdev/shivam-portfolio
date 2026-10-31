# **Product Requirements Document (PRD)**

**Product Name:** TM – Digital Learning Experience Platform  
**Product URL:** [https://shivamnamdev.com/](https://shivamnamdev.com/)  
**Feature:** \[UI\] Admin Portal Testing  
**Prepared By:** Shivam Namdev & Claude Code  
**Date:** Oct 30, 2026  
**Status:** PRD draft — written from the code and the owner's topic list; waiting for owner review (see [../README.md](../README.md))

---

## **1\. Feature Overview**

The admin portal (`/admin`, "Admin Command Center") is the owner's single screen for running the business: how many leads and enrollments exist, who owns which course, how far students have progressed, which assignments were submitted (with a code viewer) and how engaged each student is. It also holds the **Manual Enrollment / Backdoor** form used to grant a course after an offline payment.

It is implemented in one client page and two admin-only API routes:

* `app/admin/page.tsx` — gate, KPI cards, five tabs (*Directory*, *Enrollments*, *Progress*, *Assignments*, *Engagement*), code review modal, manual enrollment form.
* `GET /api/get-all-users` — the CRM directory from Clerk (paged), admin-only on the server.
* `POST /api/admin/enroll` — manual enrollment; admin-only on the server; validates the Clerk user and the course, logs the activity.

The tables read `user_enrollments`, `assignment_progress`, `video_progress` and `user_stats` directly from the browser with the anonymous Supabase key.

This PRD validates the **UI behaviour**: who can open the portal, that every KPI and tab shows correct data, that the manual enrollment form validates and gives clear messages, that the code viewer works, and that failures do not break the page. Who may open `/admin` is also covered by PRD 01; the effect of an enrollment on a learner is covered by PRD 06. API and database correctness are specified in the later API and Database PRDs.

Admin is prioritised last in the UI phase because it depends on the data every earlier feature creates:

1. [Authentication & Access Control](01-ui-authentication-access-control.md) — the admin gate.
2. [Checkout](04-ui-checkout-flow.md), [Free Enrollment](05-ui-free-enrollment-flow.md) — create enrollments.
3. [Student Dashboard](06-ui-student-dashboard-course-access.md) and [Learning Experience](07-ui-learning-experience.md) — create progress, submissions and time stats.

> **Overlap with PRD 01.** PRD 01 already automates the admin gate (admin opens `/admin`; a learner and a visitor are turned away; no navigation link for anyone). This PRD does not repeat those cases and reuses the ids where the same check applies.

> **Testability.** The admin persona (`shivamnamdev.corp@gmail.com`) exists in the QA Clerk instance. The data the tables show can be prepared with the seeded personas and the fixture course; the manual enrollment form can enroll the "no enrolments" persona in the fixture course and the test removes the row afterwards ([../TEST_DATA.md](../TEST_DATA.md)).

---

## **2\. Business Objectives**

### Primary Goals

* The owner sees the real state of the business in one place: leads, enrollments, coupon use, progress, submissions, engagement.
* Offline buyers can be enrolled safely in seconds, with a clear success or error message.
* Only the admin can see or change this data.
* A single bad request or missing record never blanks the whole portal.
* Student work (code) can be reviewed without leaving the page.

### Success Indicators

* Numbers on the KPI cards match the tables and the database.
* A manual enrollment shows up in the table and on the learner's dashboard.
* Zero cases of a non-admin seeing admin data through the UI.

---

## **3\. Target Users**

| User | Needs from this feature |
| ----- | ----- |
| Admin / owner | See KPIs, find a student, grant access, review code. |
| Support helper (future) | Look up a learner's enrollment and progress (not supported today). |
| Learner | Must never see admin content. |
| Visitor | Must never see admin content. |
| QA / automation | A prepared data set and a safe way to create and remove an enrollment. |

Personas (see [../TEST_DATA.md](../TEST_DATA.md)): A1 admin (corp), S1 and S2 learners (negative access, data rows), U1 no enrolments (target of the manual enrollment).

---

## **4\. Scope**

### **In Scope**

* Access: admin opens `/admin`; learner and visitor are sent away; spinner state; header identity line
* KPI cards: *Total Leads (CRM)*, *Enrollments*, *Coupons Used*
* Tabs and their tables: *Directory*, *Enrollments*, *Progress*, *Assignments*, *Engagement* — columns, rows, avatars/initials, dates, empty states
* *View Code* modal ("Code Review"): content, read-only editor, close
* Manual Enrollment / Backdoor: field validation, course list, loading state, success and each error message, table and KPI update, duplicate and unknown-user cases
* Data consistency between tables, KPIs and the learner's own pages
* Failure handling: a failing data request, CRM request or enrollment request
* Mobile (horizontal table scroll), keyboard and cross-browser smoke

### **Out of Scope**

* The access matrix itself — PRD 01 (only re-used)
* Detailed API contracts of `get-all-users`, `get-clerk-users`, `admin/enroll` and the Clerk webhook — API PRDs
* Database design, RLS and the admin activity log table — Database PRD
* Reporting exports, charts and search (not built; see section 17)
* Performance with large user counts — Performance PRD

---

## **5\. Portal State Model**

| State | Condition | Rendered |
| ----- | ----- | ----- |
| A1 | Not signed in | Redirect to `/` (client); middleware sends visitors to sign-in |
| A2 | Signed in, not the admin | Spinner, then redirect to `/learning` |
| A3 | Admin, data loading | Spinner |
| A4 | Admin, data loaded | Header *Admin Command Center*, *Authenticated as: \<admin email\>*, three KPI cards, tabs, table, manual enrollment form |
| A5 | Table empty | *No enrollments found.*, *No assignments submitted yet.* or *No engagement data found.* in the tab |
| A6 | A data request fails | Page still opens; the failed table is empty; the error goes to the console only |
| A7 | Code modal open | Overlay "Code Review" with name, lesson title and a read-only editor |
| A8 | Manual enrollment in flight | *Grant Access* shows a spinner and is disabled |
| A9 | Manual enrollment result | Green *Access Granted Successfully\!* or a red message under the form title |

---

## **6\. Core Features & Capabilities**

### **6.1 Admin Gate**

Only the configured admin email may use the page; everyone else is redirected (learners to `/learning`, visitors to `/`). The same email check protects the two admin APIs on the server.

### **6.2 KPI Cards**

*Total Leads (CRM)* = number of users returned by `/api/get-all-users`; *Enrollments* = enrollment total computed from `user_enrollments`; *Coupons Used* = number of enrollment rows with a coupon. Requirement: each number equals what the tables and the database contain, and updates after a manual enrollment (R-AD-4).

### **6.3 Directory Tab**

One row per Clerk user: name and avatar (or initial), email, Clerk ID, joined date, status.

### **6.4 Enrollments Tab**

One row per enrollment, newest first: student identity (CRM name and email, with fallbacks to the stored name/email/user id), course, coupon, enrolment date.

### **6.5 Progress Tab**

One row per enrollment with the number of videos watched, assignments submitted and the completion for that course.

### **6.6 Assignments Tab**

One row per submission, newest first: student, lesson title, submitted date, *View Code*. The modal shows the submitted code in a read-only Python editor (*# No code provided.* when empty).

### **6.7 Engagement Tab**

One row per `user_stats` record, ordered by time spent: total time spent (formatted), current streak and last login.

### **6.8 Manual Enrollment / Backdoor**

Inputs: *Clerk User ID* and *Course* (every course in the catalog, including the fixture when enabled). Validation: empty ID → *Please enter a valid Clerk User ID.* Server answers: unknown Clerk user → *No Clerk user found with that ID.*; unknown course → *Course not found.*; already enrolled → *Student is already enrolled\!*; other failure → *Database Error.* Success: *Access Granted Successfully\!*, the ID field clears, the table gains the new row at the top and the KPI rises.

---

## **7\. User Flows**

### Flow A-A — Daily check

Admin signs in → opens `/admin` → reads the three KPIs → scans *Enrollments* for new buyers.

### Flow A-B — Grant access after an offline payment

Admin copies the buyer's Clerk ID from *Directory* → pastes it in the form → picks the course → *Grant Access* → green message → the new row is at the top of *Enrollments* → the buyer's dashboard lists the course.

### Flow A-C — Review a submission

*Assignments* tab → *View Code* → modal shows the code → close.

### Flow A-D — Check progress and engagement

*Progress* tab for course completion per student; *Engagement* tab for time spent and streaks.

### Flow A-E — Wrong input

Empty ID, a made-up ID, an already enrolled student, an unknown course → each shows its own clear message and changes nothing.

### Flow A-F — Not the admin

Learner or visitor types `/admin` → sent away; no admin data is ever rendered.

### Flow A-G — Data failure

One of the data requests fails → the page opens, the affected tab is empty and the other tabs still work.

---

## **8\. Functional Requirements**

| ID | Feature | Priority | Requirement |
| ----- | ----- | ----- | ----- |
| FR1 | Admin gate | Must | Only the admin sees the portal; learner and visitor are redirected; no admin data renders for them. |
| FR2 | Page load | Must | Spinner then the portal with header, three KPIs, five tabs and the form; no console errors. |
| FR3 | KPI accuracy | Must | KPI numbers equal the CRM count, the enrollment total and the coupon count in the data. |
| FR4 | Directory | Must | Every Clerk user is listed with name, email, ID, joined date. |
| FR5 | Enrollments | Must | Every enrollment is listed, newest first, with course, coupon and date. |
| FR6 | Progress | High | Videos and assignments counts per enrollment are correct. |
| FR7 | Assignments | High | Every submission is listed with lesson title and date. |
| FR8 | Code viewer | High | *View Code* opens the right student's code read-only and closes cleanly. |
| FR9 | Engagement | Medium | Time spent, streak and last login per student, ordered by time. |
| FR10 | Manual enrollment — validation | Must | Empty ID and unknown ID/course give the documented messages and change nothing. |
| FR11 | Manual enrollment — success | Must | Grants the course once, shows the success message, clears the ID, updates table and KPI. |
| FR12 | Duplicate protection | Must | Enrolling an already enrolled student answers *already enrolled* and adds no row. |
| FR13 | Admin-only APIs | Must | The two admin routes refuse learners and visitors (401/403). |
| FR14 | Empty states | Medium | Each empty tab shows its message. |
| FR15 | Identity fallbacks | Medium | Missing CRM data falls back to stored name, email or user id; no blank rows. |
| FR16 | Resilience | High | A failing request leaves the rest of the page usable. |
| FR17 | Mobile and keyboard | Medium | Tables scroll horizontally, form and tabs usable at 390 px and by keyboard. |
| FR18 | Cross-browser | Medium | Chromium, Firefox, WebKit smoke. |

---

## **9\. UI Acceptance Criteria**

### **AC1 — Gate**

**Given** a learner or a visitor  
**When** they open `/admin`  
**Then** they are redirected and no admin text (*Admin Command Center*, *Backdoor*, any email table) is rendered.

### **AC2 — Load**

**Given** the admin  
**When** `/admin` opens  
**Then** a spinner is replaced by *Admin Command Center*, *Authenticated as: shivamnamdev.corp@gmail.com*, three KPI cards, the five tabs and the form.

### **AC3 — KPIs**

**Then** *Total Leads (CRM)* equals the number of Clerk users, *Enrollments* equals the enrollment total and *Coupons Used* equals the enrollments with a coupon.

### **AC4 — Tabs**

**When** each tab is clicked  
**Then** its own column headers and rows appear and the other tables disappear.

### **AC5 — Enrollments**

**Then** the newest enrollment is first and shows the student's name and email, course, coupon (or none) and date.

### **AC6 — Progress and engagement**

**Then** counts match the progress rows for each student and course, and engagement rows are ordered by time spent.

### **AC7 — Code viewer**

**When** *View Code* is clicked  
**Then** the *Code Review* modal shows the student's name, the lesson title and the submitted code in a read-only editor; the close button closes it.

### **AC8 — Manual enrollment: validation**

**When** the form is submitted with an empty ID  
**Then** *Please enter a valid Clerk User ID.* appears and no request is sent.

### **AC9 — Manual enrollment: errors**

**When** an unknown Clerk ID, an enrolled student or an unknown course is submitted  
**Then** *No Clerk user found with that ID.*, *Student is already enrolled\!* or *Course not found.* appears and no row is added.

### **AC10 — Manual enrollment: success**

**When** a valid ID and course are submitted  
**Then** *Grant Access* shows a spinner, then *Access Granted Successfully\!*, the ID clears, a new row is first in *Enrollments* and the KPI rises by one.

### **AC11 — Learner sees the grant**

**Then** the enrolled learner's dashboard lists the course and *Coupons Used* is unchanged.

### **AC12 — Empty tabs**

**Given** no data  
**Then** *No enrollments found.*, *No assignments submitted yet.* or *No engagement data found.* is shown.

### **AC13 — Failure**

**Given** one data request fails  
**Then** the page still opens and the other tabs still show data.

### **AC14 — Mobile**

**Then** at 390 px the tables scroll sideways inside their container and the form fits the screen.

---

## **10\. Test Coverage Matrix**

Layers: **U** = UI with seeded personas, **N** = network-mocked, **A** = UI plus QA Supabase and Clerk (creates and removes rows), **P** = pure logic.  
Tiers: **PR** = pull-request smoke, **REG** = regression, **NGT** = nightly.

| ID | Scenario | State | Layer | Tier | Existing |
| ----- | ----- | ----- | ----- | ----- | ----- |
| AD-01 | Admin opens `/admin`, portal renders | A4 | U | PR | ✓ AUTH admin (access-control.spec.ts) |
| AD-02 | Learner is redirected to `/learning`, no admin content | A2 | U | PR | ✓ AUTH admin denied |
| AD-03 | Visitor is turned away | A1 | U | PR | ✓ AUTH route-protection |
| AD-04 | Header shows the admin identity line | A4 | U | REG | new |
| AD-05 | Spinner then portal (no console errors) | A3→A4 | U | REG | new |
| AD-06 | KPI Total Leads equals the Clerk user count | A4 | A | REG | new |
| AD-07 | KPI Enrollments equals the enrollment total | A4 | A | REG | new |
| AD-08 | KPI Coupons Used equals enrollments with a coupon | A4 | A | REG | new |
| AD-09 | Five tabs switch their tables and headers | A4 | U | PR | new |
| AD-10 | Directory lists users with name, email, ID, date | A4 | A | REG | new |
| AD-11 | Directory shows an initial when there is no avatar | A4 | U | REG | new |
| AD-12 | Enrollments list shows the seeded personas' courses | A4 | A | PR | new |
| AD-13 | Enrollments newest first | A4 | A | REG | new |
| AD-14 | Enrollments coupon column (QA100 / none) | A4 | A | REG | new |
| AD-15 | Identity falls back to stored name or user id | A4 | A | REG | new |
| AD-16 | Progress counts match progress rows | A4 | A | REG | new |
| AD-17 | Assignments list with lesson title and date | A4 | A | REG | new |
| AD-18 | View Code opens the modal with the right code | A7 | A | PR | new |
| AD-19 | Code modal is read-only and closes | A7 | U | REG | new |
| AD-20 | Empty submission shows `# No code provided.` | A7 | A | REG | new |
| AD-21 | Engagement ordered by time, formatted | A4 | A | REG | new |
| AD-22 | Empty-state messages in each tab | A5 | N | REG | new |
| AD-23 | Form: empty ID message, no request | A9 | U | PR | new |
| AD-24 | Form: whitespace-only ID treated as empty | A9 | U | REG | new |
| AD-25 | Form: course list equals the catalog | A4 | U | REG | new |
| AD-26 | Form: unknown Clerk ID → message, no row | A9 | A | REG | new |
| AD-27 | Form: unknown course (forced) → message | A9 | N | REG | new |
| AD-28 | Form: valid grant → success, row first, ID cleared | A9 | A | PR | new |
| AD-29 | Form: grant raises the Enrollments KPI | A9 | A | REG | new |
| AD-30 | Form: grant appears on the learner's dashboard | A9 | A | PR | new |
| AD-31 | Form: second grant → already enrolled, no row | A9 | A | REG | new |
| AD-32 | Form: processing state while the request runs | A8 | N | REG | new |
| AD-33 | Form: server failure → Database Error, form usable | A9 | N | REG | new |
| AD-34 | Form: activity log entry written | A9 | A | REG | new |
| AD-35 | Admin API `get-all-users` refuses learner and visitor | — | A | PR | new |
| AD-36 | Admin API `admin/enroll` refuses learner and visitor | — | A | PR | new |
| AD-37 | Admin API `admin/enroll` rejects a forged body for a learner | — | A | REG | new |
| AD-38 | A failing enrollments request still opens the page | A6 | N | REG | new |
| AD-39 | A failing CRM request keeps the other tabs | A6 | N | REG | new |
| AD-40 | Mixed-case admin email still passes the page gate | A4 | A | REG | new (R-AD-6) |
| AD-41 | Mobile 390 px: tables scroll, form fits | A4 | U | NGT | new |
| AD-42 | Keyboard: tabs, form, modal close | A4 | U | NGT | new |
| AD-43 | Firefox and WebKit smoke of AD-01, 09, 28 | A4 | U | NGT | new |
| AD-44 | Manual enrollment, then learner opens the course page | A9 | A | REG | new |
| AD-45 | Admin portal never exposes learner data to the learner (data request returns rows only for the admin) | — | A | REG | new (R-AD-1 expected to fail) |

---

## **11\. Non-Functional Requirements**

| Category | Requirement |
| ----- | ----- |
| Security | Only the admin sees or changes data; the admin APIs enforce this on the server; the data tables must not be readable by other users (R-AD-1). |
| Privacy | Names, emails and submitted code are personal data; no other user, log or error message may expose them. |
| Reliability | One failing request never blanks the portal. |
| Data accuracy | KPIs, tables and the learner's own pages agree. |
| Auditability | Manual enrollments are logged with the admin action. |
| Usability | Clear messages for every outcome; wide tables scroll rather than overflow. |
| Accessibility | Tabs, form fields (labels) and the modal close button reachable by keyboard and named. |
| Performance | Portal interactive within about 3 s on the QA stack with the test data; large-user behaviour is a Performance PRD item. |

---

## **12\. Negative Testing Requirements**

| Case | Expected |
| ----- | ----- |
| Learner or visitor opens `/admin` | Redirected; no admin content |
| Learner calls `/api/get-all-users` or `/api/admin/enroll` | 403; visitor 401 |
| Manual enrollment with empty or whitespace ID | Validation message, no request |
| Unknown Clerk ID / unknown course / already enrolled | Documented message; no row |
| Course slug or user id with unexpected characters | Rejected cleanly; no crash |
| Rapid double click on *Grant Access* | One enrollment |
| A data request, the CRM request or the enroll request fails | Page usable; message for the form |
| Submission without code | `# No code provided.` |
| Missing CRM entry for a stored user | Fallback name/email shown |
| Session expires while on the page | Next action asks to sign in |

---

## **13\. Success Metrics (KPIs)**

| KPI | Target |
| ----- | ----- |
| Non-admin access to admin content or admin APIs | 0 |
| KPI vs data mismatches | 0 |
| Manual enrollments that create duplicate rows | 0 |
| Portal load without console errors | 100% of automated runs |
| Admin PR smoke time | under 90 seconds |

---

## **14\. Risks & Mitigations**

| ID | Risk (from the code) | Impact | Mitigation / status |
| ----- | ----- | ----- | ----- |
| R-AD-1 | The tables are read from the browser with the anonymous Supabase key (PRD §13 S2): anyone holding the public key can read all enrollments, submissions, progress and user stats (names, emails, code). | Data leak of every learner | Move reads to admin-only server routes and lock RLS (SCP-39). Test AD-45 documents it. |
| R-AD-2 | The gate on the page is client-side; server routes `get-all-users` and `admin/enroll` do enforce admin-only. | Page can be bypassed for reads (R-AD-1) | AD-35 … AD-37 prove the server side works. |
| R-AD-3 | Manual enrollment is the "backdoor": a mistaken Clerk ID or course grants paid content. | Revenue loss | Confirmation step and audit entry (AD-34). |
| R-AD-4 | The *Enrollments* KPI is incremented in the browser after a grant (`+1`) even when other state differs; it is recomputed only on reload. | KPI drift until reload | AD-29 compares before/after and after reload. |
| R-AD-5 | `ADMIN_EMAIL` is a single hard-coded address; there is no second admin or support role and no navigation link (SCP-41). | Single point of failure | Product decision. |
| R-AD-6 | The page compares the email with `!==` (case-sensitive) while the server check lower-cases it. | Mixed-case admin address is turned away by the page | AD-40; align both checks. |
| R-AD-7 | Tables have no search, filter or pagination; the directory loads up to 5,000 users and all rows at once. | Slow page, hard to find a student at scale | Future enhancement; Performance PRD. |
| R-AD-8 | The course list in the form includes every course, including closed cohorts and the QA fixture. | Wrong course by mistake | AD-25 documents it; consider grouping or a warning. |
| R-AD-9 | Test pollution: manual enrollments and submissions change the KPIs for everyone. | Flaky KPI tests | Snapshot and restore; KPI tests compare before and after, not absolute values (TR-3). |
| R-AD-10 | Real learner data (names, emails, code) is visible during tests on a shared QA project. | Privacy | Use the QA project only; no production data in tests. |

---

## **15\. QA Priority & Execution Order**

Admin is the **eighth UI feature tested**, after the learner-facing features.

### **Phase 1 — Gate**

1. AD-01 … AD-03 admin, learner, visitor.
2. AD-35 … AD-37 admin-only APIs.
3. AD-04, AD-05, AD-40 identity, load, mixed-case email.

### **Phase 2 — Read-only views**

1. AD-09 … AD-15 tabs, directory, enrollments.
2. AD-16 … AD-22 progress, assignments, code viewer, engagement, empty states.
3. AD-06 … AD-08 KPIs.

### **Phase 3 — Manual enrollment**

1. AD-23 … AD-27 validation and error messages.
2. AD-28 … AD-31, AD-44 success, KPI, learner view, duplicate.
3. AD-32 … AD-34 loading, failure, audit.

### **Phase 4 — Resilience and cross-cutting**

1. AD-38, AD-39 failing requests, AD-45 data exposure.
2. AD-41 … AD-43 mobile, keyboard, browsers.

### **15.1 Testing Weightage**

| Area | Weight | Why it carries this weight |
| ----- | ----- | ----- |
| Admin-only access (page and APIs) and data exposure | 25% | Personal data of every learner (R-AD-1). |
| Manual enrollment (validation, success, duplicates, audit) | 25% | Grants paid content by hand; money impact. |
| KPI and table accuracy | 20% | The owner decides from these numbers. |
| Code viewer and assignments | 8% | Student work review. |
| Resilience and empty states | 8% | Silent failures hide problems. |
| Engagement and progress | 6% | Useful, lower risk. |
| Mobile, keyboard, cross-browser | 5% | Admin mostly on desktop. |
| Identity fallbacks and mixed-case gate | 3% | Edge cases. |
| **Total** | **100%** | |

**Tier allocation:** PR smoke ≈ AD-01, 02, 03, 09, 12, 18, 23, 28, 30, 35, 36 (under 90 seconds); regression = all REG items; nightly = NGT items.

### **15.2 Test Environment, Data & Testability Requirements**

| ID | Requirement | Why | Status |
| ----- | ----- | ----- | ----- |
| TR-1 | Admin persona A1 and learner personas in the QA Clerk instance; seeded enrollments restored after the run. | Gate and table data. | **Done** |
| TR-2 | Helper to grant and revoke an enrollment and to read rows by user and course. | Manual enrollment tests and clean-up. | **Done** (`grantTestEnrolment`, `revokeTestEnrolment`, `adminDb`) |
| TR-3 | Before/after KPI helper (read the three numbers and compare); never assert absolute values. | Shared QA data changes. | Proposed |
| TR-4 | Submission fixture: one `assignment_progress` row with known code for A1 to review; removed afterwards. | AD-17 … AD-20. | Proposed |
| TR-5 | Request mocking for `user_enrollments`, `assignment_progress`, `video_progress`, `user_stats` and the two admin APIs. | Empty and failure states. | **Done** (pattern in PRD 03 specs) |
| TR-6 | Admin session without Google: the Clerk sign-in token helper already works for the admin persona. | Sign-in. | **Done** (`signInAs`) |
| TR-7 | `data-testid` on tabs, KPI cards, form fields, *Grant Access* and *View Code*. | Stable locators. | Proposed |
| TR-8 | A mixed-case copy of the admin email (alias or a second Clerk user) for AD-40. | R-AD-6. | Proposed (optional) |

### **15.3 Execution Readiness**

AD-01 … AD-03 already run (PRD 01). Tabs, directory, enrollments, the empty-state mocks, the form validation and the admin API refusals can be built now. Manual enrollment success tests use U1 and the fixture course with the existing grant/revoke helpers. KPI, progress, engagement and code-viewer data need TR-3 and TR-4. AD-45 is expected to fail until R-AD-1 is fixed.

---

## **16\. Definition of Done**

* All Must requirements (FR1 … FR3, FR4, FR5, FR10 … FR13) have automated tests that pass in Chromium, or a logged and accepted failure with a Jira ticket.
* Every scenario in section 10 is automated or blocked with a reason.
* Admin-only behaviour is proven for the page and for both admin APIs.
* Manual enrollment is proven for success, each error message and the duplicate case, with clean-up.
* KPIs are proven consistent with the tables before and after a grant.
* Risks R-AD-1 … R-AD-10 are mitigated or have an owner and a decision.
* No critical or high-severity admin defect remains open.

---

## **17\. Future Enhancements**

* Search, filter and pagination for every table; CSV export.
* Server-side data routes with admin check; RLS lock-down.
* Revoke access, refund note and coupon administration from the portal.
* Confirmation dialog before a manual grant.
* Multiple admins and a support role.
* Charts for enrollments, revenue and engagement over time.
* Audit log viewer.
* Admin link in the navigation (SCP-41).

---

## **18\. Glossary**

**CRM:** The list of every Clerk user, shown on the *Directory* tab.

**Lead:** A registered user, enrolled or not.

**Backdoor / manual enrollment:** Granting a course by hand, without a payment.

**Engagement:** Time spent and streak per student.

**KPI card:** One of the three numbers at the top of the portal.

**Persona:** A named test account (see [../TEST_DATA.md](../TEST_DATA.md)).

---

## **19\. References**

* [app/admin/page.tsx](../../../app/admin/page.tsx) — portal
* [app/api/admin/enroll/route.ts](../../../app/api/admin/enroll/route.ts), [app/api/get-all-users/route.ts](../../../app/api/get-all-users/route.ts), [app/api/get-clerk-users/route.ts](../../../app/api/get-clerk-users/route.ts)
* [lib/admin.ts](../../../lib/admin.ts), [lib/serverAuth.ts](../../../lib/serverAuth.ts), [lib/enrollments.ts](../../../lib/enrollments.ts)
* [docs/PRD\_TM\_DIGITAL\_LEARNING\_PLATFORM.md](../../PRD_TM_DIGITAL_LEARNING_PLATFORM.md) §5.14, §13 (S2)
* [docs/SUPABASE\_HARDENING.md](../../SUPABASE_HARDENING.md)
* Related PRDs: [01](01-ui-authentication-access-control.md), [05](05-ui-free-enrollment-flow.md), [06](06-ui-student-dashboard-course-access.md), [07](07-ui-learning-experience.md)
* Existing automation: [tests/ui/auth/access-control.spec.ts](../../../tests/ui/auth/access-control.spec.ts), [tests/support/db.ts](../../../tests/support/db.ts)
* Jira: SCP-39 (server-side access), SCP-40 (admin-course-manager routes), SCP-41 (admin link)
