# **Product Requirements Document (PRD)**

**Product Name:** TM – Digital Learning Experience Platform  
**Product URL:** [https://shivamnamdev.com/](https://shivamnamdev.com/)  
**Feature:** \[UI\] Learning Experience (Learning Lab) Testing  
**Prepared By:** Shivam Namdev & Claude Code  
**Date:** Oct 30, 2026  
**Status:** PRD draft — written from the code and the owner's topic list; waiting for owner review (see [../README.md](../README.md))

---

## **1\. Feature Overview**

The learning experience is the core value of the platform: an enrolled learner opens a course, watches lessons, practises in a browser-based lab, gets help from an AI tutor, takes the final exam and downloads a certificate. It lives at `/learning/[slug]` and is one large client page, `app/learning/[slug]/page.tsx` (about 2,000 lines), supported by:

* **Player and curriculum** — a sidebar of modules and lessons (videos and documents), the active lesson player, progress bar and *Mark Complete*.
* **Lesson tabs** — *Details*, *Q&A*, *Materials*, *Practice* and *Visualize* (*Git Graph* for Git labs).
* **Python lab** — Monaco editor, files, *Run* (Pyodide in the browser), *Submit*, *View Solution*, expected outcome, step-by-step instructions loaded from GitHub raw files.
* **Git lab** — a terminal simulator with branch and commit graph (`components/GitGraphVisualizer.tsx`).
* **AI tutor** — *Ask AI* → `POST /api/ai-tutor` (currently a mock reply).
* **Final exam and gated lessons** — *Submit Exam (n/5)*, 80% pass mark, advanced lessons locked until passed.
* **Gamification and certificate** — progress, XP sync (`/api/xp/sync`), PDF certificate (`jsPDF`).
* **Social** — comments, likes, admin-only *Share*.

This PRD validates the **UI behaviour** of that page. Who may open it is PRD 01; how the learner reaches it is PRD 06 (dashboard). API and database correctness are specified in the later API and Database PRDs; this PRD only asserts what the learner sees.

Learning is prioritised seventh because everything before it creates the learner and the enrollment:

1. [Authentication & Access Control](01-ui-authentication-access-control.md), [Public Pages](02-ui-public-pages-navigation.md), [Discovery & Pricing](03-ui-course-discovery-pricing.md)
2. [Checkout](04-ui-checkout-flow.md) and [Free Enrollment](05-ui-free-enrollment-flow.md)
3. [Student Dashboard & Course Access](06-ui-student-dashboard-course-access.md) — the door to this page.

> **Testability.** The two seeded personas already own real courses with real content: Course A (`python-beginners-batch-2`, Python lab) and Course B (`git-beginner-batch-1`, Git lab). The page depends on external services (YouTube Data API, GitHub raw files, Pyodide CDN, Monaco). Tests need either those services reachable or recorded fixtures (TR-2, TR-3). Real cohorts are closed but enrolled learners keep access.

---

## **2\. Business Objectives**

### Primary Goals

* A learner can open any lesson, watch it and see progress saved.
* Practice labs run reliably in the browser and give clear feedback; submissions are saved.
* Learners get unstuck quickly (AI tutor, solution view, Q&A).
* The exam gate and certificate are trustworthy: advanced content stays locked until the pass mark; only a passing learner gets the certificate.
* The page works on laptops and phones and degrades safely when an external service is down.

### Success Indicators

* Lesson open → content visible within a few seconds, with no uncaught errors.
* Progress and submissions persist across reload.
* Run produces the expected output for the reference solution of each lab.
* Zero cases of locked content opening, or a certificate for a failed exam.

---

## **3\. Target Users**

| User | Needs from this feature |
| ----- | ----- |
| Python learner (Course A) | Watch lessons, write and run code, submit, see the solution. |
| Git learner (Course B) | Use the Git simulator, see the graph, submit, ask for hints. |
| Learner preparing for the exam | Take up to five attempts, see the score, unlock advanced lessons. |
| Completed learner | Download a certificate with their own name. |
| Admin | Opens any course, shares a lesson, is not blocked by locks. |
| Non-enrolled user / visitor | Never sees lessons (PRD 01). |
| QA / automation | Deterministic lab content and a way to avoid real external calls. |

Personas (see [../TEST_DATA.md](../TEST_DATA.md)): S2 (mavish, Course A), S1 (bazar, Course B), A1 (corp, admin), U1 (edu, not enrolled; negative cases).

---

## **4\. Scope**

### **In Scope**

* Page states: loading, access denied / redirect, empty curriculum, player ready
* Curriculum sidebar: modules, lessons, document items, completion marks, advanced locks
* Lesson player: video embed, title, instructor line, *Mark Complete* / *Mark as Read*, completed state, progress bar and percentage
* Tabs: *Details*, *Q&A*, *Materials*, *Practice*, *Visualize* / *Git Graph*; reset to *Details* on lesson change
* Q&A: post comment, validation, ordering, likes
* Practice (Python): instructions and steps, editor, files add/delete, *Run*, output panel, errors, infinite-loop handling, *Submit*, *View Solution*, expected outcome, save and reload
* Practice (Git): simulator commands, error and unsupported commands, graph updates, reset, submit
* AI tutor: *Ask AI* for Python and Git, loading state, reply display, failure message
* Final exam: attempts counter, scoring, pass/fail, unlock of advanced lessons, certificate
* Admin behaviour: bypass of locks, Share
* Mobile, keyboard and cross-browser use; external-service failure states

### **Out of Scope**

* Who may open the page — PRD 01; the dashboard hand-off — PRD 06
* Quality of the course content itself (videos, text)
* Detailed API contracts (`ai-tutor`, `generate-certificate`, `track-time`) and database design — API and Database PRDs
* A real LLM (the tutor is a mock today; see R-LX-5)
* Performance and load — Performance PRD
* Admin portal — PRD 08

---

## **5\. Page State Model**

| State | Condition | Rendered |
| ----- | ----- | ----- |
| P1 | Loading | Spinner and *Loading your personalized curriculum…* |
| P2 | Not signed in / not enrolled | Redirect or *Access Denied* (PRD 01 owns the matrix) |
| P3 | Enrolled, content loaded | Header with *Back* link and progress, sidebar curriculum, first lesson active |
| P4 | Lesson without lab | Player plus *Details*, *Q&A* (and *Materials* when attached) |
| P5 | Lesson with Python lab | Adds *Practice* and *Visualize*: editor, *Run*, *Submit*, *Ask AI*, *View Solution* after submit |
| P6 | Lesson with Git lab | Adds *Practice* terminal and *Git Graph* |
| P7 | Final exam lesson | *Practice* with *Submit Exam (n/5)*; no *Visualize* tab |
| P8 | Advanced lesson, exam not passed | Lesson shows a lock; click shows the locked message (admins exempt) |
| P9 | Exam passed | Advanced lessons open; certificate action available |
| P10 | External service down | Lesson, lab or video shows an error state; rest of the page keeps working |

---

## **6\. Core Features & Capabilities**

### **6.1 Curriculum Sidebar and Progress**

Modules with lessons, a mark for finished videos and submitted assignments (*✅ Assignment Submitted*, *📝 Pending Assignment*, *🏆 Final Exam*), lock marks on advanced lessons. The header shows the percentage `(completed videos + submitted assignments) / (videos + assignments)`.

### **6.2 Lesson Player**

Opening a lesson loads its video (YouTube) or document, resets the lab, the tab (*Details*), the AI reply and the likes. *Mark Complete* (*Mark as Read* for documents) saves progress, turns into the disabled *Video Watched* (*Read Complete*), updates the progress bar and triggers an XP sync.

### **6.3 Tabs**

*Details* shows the lesson description. *Q&A* shows comments, the comment box and likes. *Materials* appears only when attachments exist. *Practice* and *Visualize* appear only for lessons with an assignment; *Visualize* is hidden for exams and is called *Git Graph* in Git labs.

### **6.4 Python Lab**

Instructions and steps load from GitHub raw files; the editor opens a workspace (`main.py` and extra files). *Run* executes in Pyodide, shows output or the error, and stops runaway code. *Submit* stores the code, marks the assignment submitted, shows a toast and then the official solution. *View Solution* and the expected outcome appear after submitting. A saved submission reloads into the editor.

### **6.5 Git Lab**

A terminal accepts the supported commands (`git status`, `git add`, `git commit -m`, `git log --oneline`, `git checkout -b`, …), answers unsupported ones with a message, updates the visual graph and the branch label, and can be reset. *Submit* saves the command history.

### **6.6 AI Tutor**

*Ask AI* sends the lab type, code or Git context and the last output to `/api/ai-tutor`, shows a loading state, then the reply. Today the reply is a canned test-mode message.

### **6.7 Final Exam and Locks**

The exam lesson shows *Submit Exam (n/5)*; each submit uses an attempt; 80% or more passes; advanced lessons stay locked (alert/toast) until passed; admins bypass. After five attempts the exam can no longer be submitted.

### **6.8 Certificate**

A landscape PDF with the learner's name is generated in the browser after completion; failure shows an alert.

### **6.9 Comments, Likes, Share**

Learners post comments (shown newest first) and like a lesson; admins can copy a share link for videos. Comments and likes are per lesson.

---

## **7\. User Flows**

### Flow L-A — Watch and complete a lesson

Dashboard → *View Recordings* → player → pick a lesson → watch → *Mark Complete* → progress rises → next lesson.

### Flow L-B — Python practice

Open a lesson with an assignment → *Practice* → read steps → edit code → *Run* → see output → fix an error → *Submit* → toast → *View Solution*.

### Flow L-C — Git practice

Open a Git lesson → *Practice* → run `git status`, `git add`, `git commit -m "…"` → *Git Graph* shows the commit → *Submit*.

### Flow L-D — Stuck and asking for help

Run code with an error → *Ask AI* → loading → reply shown; the learner edits and runs again.

### Flow L-E — Final exam

Open the exam lesson → solve → *Submit Exam (1/5)* → score → pass: advanced lessons unlock and the certificate is available; fail: attempts left shown.

### Flow L-F — Locked lesson

Learner who has not passed clicks an advanced lesson → locked message; admin clicks it → opens.

### Flow L-G — Discuss

Open *Q&A* → post a comment → it appears at the top → like the lesson.

### Flow L-H — Service failure

YouTube, GitHub or Pyodide is unreachable → the affected part shows an error; the rest of the page still works and the learner can leave via *Back*.

---

## **8\. Functional Requirements**

| ID | Feature | Priority | Requirement |
| ----- | ----- | ----- | ----- |
| FR1 | Page loads | Must | Loading state, then the curriculum and the first lesson; no uncaught errors. |
| FR2 | Curriculum | Must | Every module and lesson is listed; active lesson is highlighted; marks reflect progress. |
| FR3 | Lesson open | Must | Selecting a lesson loads its player/content and resets lab, tab, AI reply and likes. |
| FR4 | Mark complete | Must | Saves progress once, disables the button, updates the progress bar; survives reload. |
| FR5 | Progress bar | Must | Percentage equals completed tasks over total tasks. |
| FR6 | Tabs | Must | Correct tabs per lesson type; tab content matches the lesson. |
| FR7 | Python run | Must | *Run* shows the program output or a readable error; the page stays responsive. |
| FR8 | Submit | Must | *Submit* stores the code, marks the assignment submitted, shows feedback; reload restores the code. |
| FR9 | Solution | High | Solution and expected outcome appear after submitting, not before. |
| FR10 | Git lab | Must | Supported commands change state and graph; unsupported ones give a message; reset works. |
| FR11 | Exam | Must | Attempts counter, 80% pass mark, five attempts, result message. |
| FR12 | Locks | Must | Advanced lessons stay locked until passed; admins exempt. |
| FR13 | Certificate | High | Only after completion; contains the learner's name; failure is reported. |
| FR14 | AI tutor | High | *Ask AI* shows a loading state and the reply; failure shows a message and does not break the lab. |
| FR15 | Q&A | High | Valid comments appear immediately; empty ones are refused; likes toggle. |
| FR16 | Materials | Medium | Tab present only with attachments; links open. |
| FR17 | Admin Share | Medium | Share link only for admins and only for videos. |
| FR18 | Resilience | Must | A failing external service never blocks the rest of the page. |
| FR19 | Mobile and keyboard | High | Player, tabs and lab usable at 390 px; main controls keyboard operable (SCP-32, SCP-34). |
| FR20 | Cross-browser | Medium | Chromium, Firefox, WebKit smoke. |

---

## **9\. UI Acceptance Criteria**

### **AC1 — Load**

**Given** an enrolled learner  
**When** `/learning/<slug>` opens  
**Then** the loading state is replaced by the curriculum, a lesson is active and no console error is thrown.

### **AC2 — Lesson change**

**When** another lesson is clicked  
**Then** the title, video and description change, the tab returns to *Details*, and lab output and AI reply are cleared.

### **AC3 — Mark Complete**

**When** *Mark Complete* is clicked  
**Then** the button becomes *Video Watched* (disabled), the progress percentage rises and the state survives a reload.

### **AC4 — Tabs**

**Then** *Practice* and *Visualize* exist only for lessons with an assignment; *Materials* only with attachments; *Visualize* is absent for the exam.

### **AC5 — Python run**

**When** valid code is run  
**Then** its output appears; **when** the code has an error, a readable error appears; **when** the code loops forever, the page stays responsive and can recover.

### **AC6 — Submit**

**When** *Submit* is clicked  
**Then** a success toast appears, the sidebar shows *✅ Assignment Submitted* and the code is restored after a reload.

### **AC7 — Solution**

**Then** the official solution and expected outcome are only viewable after a submission.

### **AC8 — Git lab**

**When** `git status`, `git add`, `git commit -m "x"` and `git log --oneline` are run  
**Then** each gives its simulator output and the graph shows the new commit; an unsupported command gives an explanatory message.

### **AC9 — AI tutor**

**When** *Ask AI* is clicked  
**Then** a loading indicator shows, then the reply; on failure a message is shown and the lab still works.

### **AC10 — Exam**

**When** *Submit Exam (n/5)* is clicked  
**Then** the attempt count increases; a score of at least 80% unlocks advanced lessons; a lower score keeps them locked and shows the remaining attempts.

### **AC11 — Locked lesson**

**When** a non-admin learner clicks a locked advanced lesson  
**Then** the lock message appears and the lesson does not open.

### **AC12 — Certificate**

**When** the learner has completed the course  
**Then** a PDF with the learner's name is downloaded; on failure an alert says so.

### **AC13 — Q&A**

**When** a comment is posted  
**Then** it appears at the top with the author and time; an empty comment is not posted.

### **AC14 — External failure**

**When** YouTube, GitHub or Pyodide cannot be reached  
**Then** the affected part shows an error and *Back* and the other tabs keep working.

### **AC15 — Mobile**

**Then** at 390 px the player, tabs and lab are reachable without horizontal scroll (known issue SCP-34).

---

## **10\. Test Coverage Matrix**

Layers: **U** = UI with seeded personas on real content, **N** = network-mocked (YouTube, GitHub, Pyodide, APIs), **A** = UI plus QA Supabase (progress rows), **P** = pure logic.  
Tiers: **PR** = pull-request smoke, **REG** = regression, **NGT** = nightly.  
*Existing* names what already covers it (PRD 01 access cases open the page for each persona).

| ID | Scenario | State | Layer | Tier | Existing |
| ----- | ----- | ----- | ----- | ----- | ----- |
| LX-01 | Enrolled learner opens the course: loading then curriculum | P1→P3 | U | PR | ✓ AUTH-COURSE (opens page) |
| LX-02 | Curriculum lists every module and lesson of the course | P3 | U | REG | new |
| LX-03 | First lesson is active on load, title shown | P3 | U | REG | new |
| LX-04 | Selecting a lesson changes title and content | P3 | U | PR | new |
| LX-05 | Lesson change resets tab to Details and clears lab output | P3 | U | REG | new |
| LX-06 | Mark Complete saves and shows Video Watched | P4 | A | PR | new |
| LX-07 | Mark Complete survives reload; progress bar rises | P4 | A | REG | new |
| LX-08 | Document lesson shows Mark as Read / Read Complete | P4 | A | REG | new |
| LX-09 | Progress percentage matches completed tasks | P3 | A | REG | new |
| LX-10 | Back link returns to the dashboard | P3 | U | REG | new |
| LX-11 | Tabs shown per lesson type (plain, lab, exam, materials) | P4/5/7 | U | REG | new |
| LX-12 | Details tab shows the lesson description | P4 | U | REG | new |
| LX-13 | Materials tab links open | P4 | U | REG | new |
| LX-14 | Q&A: post a comment appears at the top | P4 | A | REG | new |
| LX-15 | Q&A: empty comment is refused | P4 | U | REG | new |
| LX-16 | Like toggles and count updates | P4 | A | REG | new (likes table missing, PRD B9) |
| LX-17 | Python: workspace and instructions load | P5 | U | PR | new |
| LX-18 | Python: Run prints the program output | P5 | U | PR | new |
| LX-19 | Python: syntax/runtime error is readable | P5 | U | REG | new |
| LX-20 | Python: infinite loop does not freeze the page | P5 | U | REG | new |
| LX-21 | Python: add and delete a file | P5 | U | REG | new |
| LX-22 | Python: multi-step assignment moves between steps | P5 | U | REG | new |
| LX-23 | Python: Submit saves, toast, sidebar shows submitted | P5 | A | PR | new |
| LX-24 | Python: submitted code restored after reload | P5 | A | REG | new |
| LX-25 | Python: solution and expected outcome only after submit | P5 | U | REG | new |
| LX-26 | Python: reference solution passes the expected outcome | P5 | U | REG | new |
| LX-27 | Python: editor autocomplete suggests built-ins | P5 | U | NGT | new |
| LX-28 | Visualize tab shows the code visualiser | P5 | U | REG | new |
| LX-29 | Solution window closes by mouse and by keyboard | P5 | U | REG | new (SCP-32 expected to fail) |
| LX-30 | Git: instructions load, terminal ready | P6 | U | PR | new |
| LX-31 | Git: `git status` / `git add` / `git commit -m` / `git log --oneline` | P6 | U | PR | new |
| LX-32 | Git: `git checkout -b` creates a branch, label updates | P6 | U | REG | new |
| LX-33 | Git: unsupported command shows a clear message | P6 | U | REG | new |
| LX-34 | Git: commit with nothing staged is explained | P6 | U | REG | new |
| LX-35 | Git Graph tab reflects commits and branches | P6 | U | REG | new |
| LX-36 | Git: reset clears the lab | P6 | U | REG | new |
| LX-37 | Git: Submit saves the history | P6 | A | REG | new |
| LX-38 | Ask AI (Python): loading then reply | P5 | N | REG | new |
| LX-39 | Ask AI (Git): reply follows the last command | P6 | N | REG | new |
| LX-40 | Ask AI failure shows a message, lab still works | P5 | N | REG | new |
| LX-41 | Exam lesson: no Visualize tab, counter shows 0/5 | P7 | U | REG | new |
| LX-42 | Exam submit increments the attempt counter | P7 | A | REG | new |
| LX-43 | Passing score unlocks advanced lessons | P9 | A | REG | new |
| LX-44 | Failing score keeps them locked, shows attempts left | P8 | A | REG | new |
| LX-45 | After 5 attempts submit is no longer possible | P7 | A | REG | new |
| LX-46 | Locked lesson click shows the message for a learner | P8 | A | PR | new |
| LX-47 | Admin opens a locked lesson | P8 | U | REG | new |
| LX-48 | Certificate downloads with the learner's name | P9 | N | REG | new |
| LX-49 | Certificate not offered before completion | P3 | U | REG | new |
| LX-50 | Certificate failure shows the alert | P9 | N | REG | new |
| LX-51 | Admin sees Share; learner does not | P4 | U | REG | new |
| LX-52 | YouTube API failure: lessons still open | P10 | N | REG | new |
| LX-53 | GitHub raw file missing: lab shows an error, page works | P10 | N | REG | new |
| LX-54 | Pyodide fails to load: Run explains it | P10 | N | REG | new |
| LX-55 | Progress save fails: message, button recovers | P10 | N | REG | new |
| LX-56 | Mobile 390 px: player, tabs, curriculum | P3 | U | NGT | new (SCP-33/34) |
| LX-57 | Mobile: Python lab loads and runs | P5 | U | NGT | new (SCP-34 expected to fail) |
| LX-58 | Keyboard: tab through lessons, tabs, Run and Submit | P5 | U | NGT | new |
| LX-59 | Firefox and WebKit smoke of LX-01, 04, 18, 31 | P3–6 | U | NGT | new |
| LX-60 | No console errors across a 5-lesson walk-through | P3 | U | REG | new |

---

## **11\. Non-Functional Requirements**

| Category | Requirement |
| ----- | ----- |
| Reliability | One failing external service (YouTube, GitHub, Pyodide, API) never blocks the rest of the page. |
| Data integrity | Progress and submissions are saved once and restored on reload. |
| Security | Code runs inside the learner's browser (Pyodide) and cannot reach the server; locked content and exam gating are enforced as far as the UI can, with server enforcement tracked in R-LX-1. |
| Privacy | Comments show names only; the certificate uses the learner's own name. |
| Usability | Clear feedback for every action (output, toast, lock message, error). |
| Accessibility | Tabs, buttons and the solution window reachable by keyboard and named (SCP-32). |
| Performance | Lesson open and first Run within a few seconds on the QA stack; detailed targets in the Performance PRD. |

---

## **12\. Negative Testing Requirements**

| Case | Expected |
| ----- | ----- |
| Not enrolled / visitor opens the page | PRD 01 behaviour; no lessons shown |
| Locked advanced lesson clicked | Lock message; lesson does not open |
| Empty comment | Not posted |
| Python syntax error, name error, infinite loop | Readable error; page responsive |
| Unsupported or empty Git command | Explanatory message; state unchanged |
| Submit with empty editor | Handled with feedback, no crash |
| Rapid double click on Mark Complete or Submit | One save |
| External service down (YouTube, GitHub, CDN) | Local error state; rest works |
| Progress request fails | Message; button recovers |
| Exam submitted with the maximum attempts used | Refused with a message |
| Certificate before completion or when PDF generation fails | Not offered / alert |
| Session expires mid-lesson | Next action asks to sign in; no data loss on the page |
| Browser back during a lab | Page leaves cleanly |

---

## **13\. Success Metrics (KPIs)**

| KPI | Target |
| ----- | ----- |
| Lesson open without console errors | 100% of automated runs |
| Reference solutions passing in the lab | 100% |
| Locked lessons opened by non-admins | 0 |
| Progress persistence after reload | 100% |
| Learning PR smoke time | under 2 minutes |

---

## **14\. Risks & Mitigations**

| ID | Risk (from the code and tracker) | Impact | Mitigation / status |
| ----- | ----- | ----- | ----- |
| R-LX-1 | Progress, submissions, exam results and likes are written from the browser with the anonymous Supabase key, and the exam lock is a UI check (PRD §13 S2). | Forged progress, unlocked advanced content, fake exam passes | Move writes and scoring to server routes (SCP-39). Tests LX-43 … LX-46 document today's UI behaviour. |
| R-LX-2 | The page needs YouTube Data API, GitHub raw files, Pyodide CDN and Monaco; any outage breaks lessons or labs. | Flaky tests, broken labs | Mock them in network-mocked tests (TR-2); one nightly run against the real services. |
| R-LX-3 | Python Lab and Courses do not load on mobile (SCP-33 in review, SCP-34 open). | Mobile learners blocked | LX-56 / LX-57 are expected to fail until fixed. |
| R-LX-4 | The close and cross buttons of the solution window cannot be reached by keyboard (SCP-32). | Accessibility failure | LX-29. |
| R-LX-5 | The AI tutor is a mock with a fixed delay; the real LLM is not integrated and `OPENAI_API_KEY` is unused. | Tests pass against canned text; real behaviour untested | Assert only the contract (loading, reply, failure); revisit when the LLM is added. |
| R-LX-6 | `video_likes` table is missing in Supabase and the page ignores the error (PRD §13 B9). | Likes never saved | LX-16 expected to fail until the table exists. |
| R-LX-7 | Runaway or heavy Python (infinite loop, large memory) runs in the main thread. | Frozen tab | LX-20; consider a worker with a timeout. |
| R-LX-8 | The certificate is generated in the browser from the displayed name; no server record. | A learner can regenerate or alter it; no verification | Product decision; record in the API PRD. |
| R-LX-9 | Test pollution: progress, submissions and exam rows for the persona accumulate. | Wrong percentages and unlock states | Snapshot and restore the persona's progress rows (TR-4). |
| R-LX-10 | A 2,000-line single component with many effects; regressions are likely when any part changes. | Hidden breakages | Smoke walk-through (LX-60) on every PR; refactor later (PRD §13 E4). |

---

## **15\. QA Priority & Execution Order**

Learning is the **seventh UI feature tested**, after authentication, public pages, discovery & pricing, checkout, free enrollment and the student dashboard.

### **Phase 1 — Open and navigate**

1. LX-01 … LX-05 load, curriculum, lesson change.
2. LX-10, LX-11, LX-60 back link, tabs, console errors.

### **Phase 2 — Progress**

1. LX-06 … LX-09 mark complete, persistence, progress bar.
2. LX-14 … LX-16 Q&A and likes.

### **Phase 3 — Python lab**

1. LX-17 … LX-20 workspace, run, error, loop.
2. LX-21 … LX-26 files, steps, submit, restore, solution.
3. LX-27 … LX-29 autocomplete, visualise, keyboard.

### **Phase 4 — Git lab and AI**

1. LX-30 … LX-37 commands, graph, reset, submit.
2. LX-38 … LX-40 AI tutor.

### **Phase 5 — Exam, locks, certificate**

1. LX-41 … LX-47 exam, attempts, unlock, lock.
2. LX-48 … LX-51 certificate and admin.

### **Phase 6 — Resilience and cross-cutting**

1. LX-52 … LX-55 service failures.
2. LX-56 … LX-59 mobile, keyboard, browsers.

### **15.1 Testing Weightage**

| Area | Weight | Why it carries this weight |
| ----- | ----- | ----- |
| Python lab (run, submit, solution, restore) | 20% | The main hands-on value; most code in the page. |
| Progress, completion and persistence | 15% | Drives XP, certificates and the learner's trust. |
| Exam, locks, certificate | 15% | Access control and credentials; forgeable today (R-LX-1). |
| Git lab and graph | 12% | Second lab type, custom simulator. |
| Resilience to external failures | 10% | Four external dependencies (R-LX-2). |
| Curriculum, player and tabs | 10% | Every lesson goes through it. |
| AI tutor | 5% | Mock today; contract only. |
| Q&A and likes | 5% | Community, known gap (R-LX-6). |
| Mobile, keyboard, cross-browser | 8% | Open defects SCP-32/33/34. |
| **Total** | **100%** | |

**Tier allocation:** PR smoke ≈ LX-01, 04, 06, 17, 18, 23, 30, 31, 46 (under 2 minutes); regression = all REG items; nightly = NGT items.

### **15.2 Test Environment, Data & Testability Requirements**

| ID | Requirement | Why | Status |
| ----- | ----- | ----- | ----- |
| TR-1 | Seeded personas S2 (Course A), S1 (Course B), A1 (admin), U1 (not enrolled), restored after the run. | Real content for both lab types. | **Done** |
| TR-2 | Mock helpers for YouTube Data API, GitHub raw URLs and `/api/ai-tutor`; recorded fixtures of one Python and one Git assignment. | Deterministic runs, failure paths. | Proposed |
| TR-3 | Pyodide and Monaco loaded from their CDN with a warm-up wait; optional local copy for CI. | Stable timing. | Proposed |
| TR-4 | Snapshot and restore of the persona's rows in `video_progress`, `assignment_progress`, `exam_progress`, `video_comments`, `video_likes`. | Isolation. | Proposed |
| TR-5 | A reference solution per lab (from the course repo) to prove LX-26. | Correctness of the expected outcome. | Proposed |
| TR-6 | A way to set the exam state (attempts used, passed) for the persona, through the service role. | LX-43 … LX-46 without playing the exam. | Proposed |
| TR-7 | `data-testid` on lesson items, tabs, Run, Submit, Ask AI, terminal input and progress bar. | Stable locators. | Proposed |
| TR-8 | Console-error collector in the shared Playwright helpers. | LX-60. | Proposed |

### **15.3 Execution Readiness**

Opening the page, the curriculum, tabs, Python Run and the Git terminal can run now on Course A and Course B with the seeded personas. Failure paths need TR-2. Progress, submit and exam cases need TR-4 and TR-6 for clean-up and set-up. The expected failures (LX-16, LX-29, LX-56, LX-57) stay visible in Allure.

---

## **16\. Definition of Done**

* All Must requirements (FR1 … FR8, FR10 … FR12, FR18) have automated tests that pass in Chromium, or a logged and accepted failure with a Jira ticket.
* Every scenario in section 10 is automated or blocked with a reason.
* Reference solutions pass in both lab types; progress and submissions persist across reload.
* Exam and lock behaviour is proven for pass, fail and exhausted attempts, and for the admin bypass.
* Each external-service failure has a test.
* Every row the tests create is removed; persona state is restored.
* Risks R-LX-1 … R-LX-10 are mitigated or have an owner and a decision.
* No critical or high-severity learning defect remains open.

---

## **17\. Future Enhancements**

* Server-side progress, exam scoring and certificate record with a verification link.
* Real LLM tutor with prompt tests and rate limits.
* Python execution in a web worker with a time limit.
* Resume-where-you-left-off and per-lesson notes.
* Offline-friendly lab assets (self-hosted Pyodide).
* Captions and transcripts for videos.
* Visual regression snapshots of the player and labs.

---

## **18\. Glossary**

**Lesson:** One video or document in the curriculum.

**Assignment / lab:** A practice task attached to a lesson (Python or Git).

**Pyodide:** Python compiled to run inside the browser.

**Monaco:** The code editor component.

**Final exam:** The scored assignment (80% to pass, five attempts) that unlocks advanced lessons.

**Advanced lesson:** A lesson locked until the exam is passed.

**Persona:** A named test account (see [../TEST_DATA.md](../TEST_DATA.md)).

---

## **19\. References**

* [app/learning/\[slug\]/page.tsx](../../../app/learning/%5Bslug%5D/page.tsx) — the learning page
* [components/GitGraphVisualizer.tsx](../../../components/GitGraphVisualizer.tsx), [components/TimeTracker.tsx](../../../components/TimeTracker.tsx)
* [app/api/ai-tutor/route.ts](../../../app/api/ai-tutor/route.ts), [app/api/xp/sync/route.ts](../../../app/api/xp/sync/route.ts), [app/api/track-time/route.ts](../../../app/api/track-time/route.ts)
* [data/courses.ts](../../../data/courses.ts) — playlists and assignments
* [docs/PRD\_TM\_DIGITAL\_LEARNING\_PLATFORM.md](../../PRD_TM_DIGITAL_LEARNING_PLATFORM.md) §5.7 to §5.9, §13 (S2, B9, E4)
* [docs/CONTENT\_MANAGEMENT.md](../../CONTENT_MANAGEMENT.md)
* Related PRDs: [01](01-ui-authentication-access-control.md), [06](06-ui-student-dashboard-course-access.md)
* Jira: SCP-32 (solution window keyboard), SCP-33 (courses on mobile), SCP-34 (Python lab on mobile), SCP-39 (server-side access)
