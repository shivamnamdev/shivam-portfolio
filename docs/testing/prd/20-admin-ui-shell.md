# PRD 20: Admin portal UI, slice 4a (shell, overview, audit log, API keys)

Status: built 2026-11-05. Blueprint: [docs/architecture/admin-portal-phase4-admin-ui.md](../../architecture/admin-portal-phase4-admin-ui.md). Later slices (4b to 4e) extend this PRD.

## 1. Scope
The admin shell under `/admin/(shell)`: sidebar, the two-way portal toggle, and the first three screens (Overview, Audit log, API keys). The screens only call `/api/admin/v1/**`; every rule stays on the server (PRD 17 and 19).

## 2. Rules under test
* **Gate:** the shell layout checks the admin on the server before any admin component is sent. A visitor goes to `/`, a signed-in non-admin to `/learning`; neither receives admin markup. The API checks again.
* **Toggle:** the admin sees "Switch to admin portal" in the learner navigation (desktop and phone menu) and "Switch to learner portal" in the shell; nobody else sees the first. It is only a link.
* **Sidebar:** one list in `lib/adminUi/nav.ts`; screens of later slices (4b to 4f, including Student progress and Code submissions) are shown disabled with their slice; the current screen is marked `aria-current`. Phone: the menu opens and closes, and the page never scrolls sideways.
* **Overview:** counts only (enrolments, cohorts with learners, sign-ups in 7 days, coupon redemptions), enrolments per cohort, the latest 8 changes. No learner e-mail or name appears. Each card loads on its own and shows the server message if its report fails.
* **Audit log:** read only; filters (resource, action, item id) are sent to the API; "Load more" follows the cursor; before and after are shown as text, only on request.
* **API keys:** create (name, level), the token is shown once in memory and is gone after "I have saved it" or a reload; revoke asks for a confirmation that names the key (Cancel has focus, Escape closes). A server refusal is shown inline with its field lines. An admin or staff key cannot reach this screen's API (owner only).
* **Errors:** 401 sends the admin to sign in; 403, 409, 428, 400 and 422 show the server's message; a server fault or a lost connection shows a plain instruction and says nothing was changed.

## 3. Tests
**Unit (`tests/unit/admin-ui-client.spec.ts`, 5 tests):** `ADMUI-UNIT-ENV-001` and `002` (envelope and failure mapping), `ADMUI-UNIT-REQ-001` (query string, If-Match), `ADMUI-UNIT-FMT-001` (relative time), `ADMUI-UNIT-NAV-001` (sidebar and active matching). The screens themselves are markup and are covered by the UI tests.
**UI (`tests/ui/admin/admin-shell.spec.ts`, 9 tests):** `ADMUI-GATE-001` and `002`, `ADMUI-SHELL-001` to `003`, `ADMUI-OVR-001`, `ADMUI-AUD-001`, `ADMUI-KEY-001` and `002`. Run: `npx playwright test tests/ui/admin --project=chromium --workers=1` with `E2E_SEED_PERSONAS=1`. The key test removes the keys and audit rows it makes.
**Not automated:** a screen-reader pass and the dark-theme look (shown to the owner before the slice is finalised, constitution section 8).

## 4. Known limits
The classic `/admin` page keeps its own client-side guard until slice 4e replaces it; the learner CRM link in the sidebar points to it.

---

## 5. Slice 4b: courses and cohorts
Screens: `/admin/courses` (list, filters, create), `/admin/courses/{slug}` (edit, life cycle, duplicate, delete, its cohorts), `/admin/cohorts` (list, filters, create with pricing), `/admin/cohorts/{slug}` (edit, pricing, open/close enrolment, private links, life cycle, delete). Only `/api/admin/v1/courses|cohorts` is called.

**Rules under test:**
* **Slug** is suggested from the title (lower case, dashes) until the owner edits it; it cannot change later (the API has no rename), and the form says so. An invalid slug disables Create.
* **Edit sends only what changed** (PATCH with `If-Match` = the loaded version). Nothing changed is shown as a message, not sent. An emptied optional text or date box is not sent (the API cannot clear them) and the screen says so. A stale save (409) shows the server message and a "Reload the latest version" button.
* **Course sales-page content** is a JSON box for now (a structured editor is a later improvement). Broken JSON or a non-object disables Save with an explanation.
* **Life cycle** buttons are exactly the server's transitions (a unit test compares the table with `COURSE_ACTIONS`): draft publish or archive, published move back or archive, archived restore. Each asks first and names the item; Cancel changes nothing.
* **Pricing editor:** one price (INR, optional USD) or plans (1 to 6). Early hints mirror the server (minimum 1 in the currency for anything above zero, original not below price, plan ids unique and valid, a plan needs a name); a bad number is flagged on the box and linked with `aria-describedby`. A price of 0 shows a "free to join" notice (never blocked). Hints inform and the server decides, so a refusal comes back inline.
* **Private links** (WhatsApp, live class) load from the separate links route, are https only, and save through the same versioned PATCH.
* **Delete** asks first; a course with cohorts or a cohort with learners is refused by the server and the message is shown inline; duplicate asks for the new slug and title and reports a taken slug inline.

**Unit (`tests/unit/admin-ui-forms.spec.ts`, 9 tests):** `ADMUI-UNIT-LIFE-001`, `SLUG-001`, `PITCH-001`, `DATE-001`, `PRICE-001` to `003`, `COH-001`, `COH-002`.
**UI (`tests/ui/admin/admin-courses-cohorts.spec.ts`, 9 tests):** `ADMUI-COURSE-001` to `005`, `ADMUI-COHORT-001` to `004`. Everything they make is named `qa-admui-...` and removed afterwards.
**Not automated:** the visual look of the pricing editor (shown to the owner before the slice is finalised).

