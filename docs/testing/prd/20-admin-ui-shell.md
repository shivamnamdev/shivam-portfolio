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

---

## 6. Slice 4c: curriculum editor
Screens: `/admin/curriculum` (every cohort with its curriculum, "Create curriculum", and the owner's import helper) and `/admin/curriculum/{cohort}` (the editor). Only `/api/admin/v1/curriculum/**` and `/import/curriculum` are called.

**Layout (owner decision, 2026-11-05):** one page per cohort. Modules are cards with their lessons listed; a lesson opens in a side panel. Publish, discard and the "changes not published yet" banner sit at the top. Reordering is done with up and down buttons and a "Move to…" list (no drag and drop, so no new package and it works from the keyboard).

**Rules under test:**
* **The screen never edits its own copy.** Every curriculum call returns the whole updated curriculum; the screen replaces its state with the answer. A refusal leaves the last good copy on screen with the server message next to what was attempted. A stale edit (409) shows a "Reload the latest version" button.
* **Lesson ids** come from a pasted YouTube link (watch, youtu.be, embed, shorts, live), a bare 11-character id, or a `doc-` id; anything else disables "Add lesson". A duplicate id is refused by the server and shown.
* **Moving** builds exactly the lists the reorder endpoints accept (a unit test runs them through the server's own `reorderModules` and `reorderLessons`); the first and last items cannot move further; a lesson can move to the end of another module.
* **Lesson panel:** title, description (500), assignment (python or git lab, only that lab type's links are sent, empty boxes left out, links must be https on `raw.githubusercontent.com`), resources (up to 20, https on the allowed hosts, title and link required). Only changed parts are sent. **The exam flags (`isExam`, `serverGraded`, `expectedOutcomeUrl`) are read-only**: the panel never sends them, shows a notice, and an exam lesson's assignment cannot be removed. Hints inform; the server decides.
* **Publish and discard** ask first. Publish is off when the curriculum is empty or nothing changed; discard is off when nothing is published. The banner says whether the published copy matches.
* **Delete** (module or lesson) asks first; the server refuses while learners have progress on a lesson (message shown, lesson stays).
* **Preview as learner:** a read-only outline of the working copy (modules in order, lessons numbered per module, advanced modules, assignments, exam, resources). It writes nothing and calls no learner API. The true learner-page preview comes with phase 5.
* **Import helper (owner only):** "Check" writes nothing and shows per cohort what would be created, left alone or replaced, with the entries the importer drops; "Apply" is only enabled after a check and asks first (a stronger warning when replacing existing curricula).

**Unit (`tests/unit/admin-ui-curriculum.spec.ts`, 8 tests):** `ADMUI-UNIT-CUR-001` to `008`, including drift guards against the server's host lists, limits, reorder and patch logic.
**UI (`tests/ui/admin/admin-curriculum.spec.ts`, 8 tests):** `ADMUI-CUR-001` to `008`. The course and cohort are made through the API and everything is named `qa-admui-cur...` and removed afterwards.
**Not automated:** the visual look of the editor and a screen-reader pass (shown to the owner before the slice is finalised); the import "Apply" path (it changes real curricula, so it is a manual case).

---

## 7. Slice 4d-1: coupons and settings
Screens: `/admin/coupons` (list, filters, "New coupon", "Generate one-time codes"), `/admin/coupons/{code}` (change, activate or deactivate, delete) and `/admin/settings` (the four site settings). Only `/api/admin/v1/coupons/**`, `/learners` (the picker) and `/settings/**` are called. 4d is delivered in two parts (owner decision, 2026-11-06): 4d-1 is this section, 4d-2 is banners, notifications and e-mail templates.

**Rules under test:**
* **Create:** the code is 4 to 40 letters, numbers, `-` or `_` (stored upper case); kind is *everyone* (optional total limit) or *selected students*; **every coupon needs an expiry in the future** (30 days ahead is pre-filled). Early hints list every problem; the server's refusals (taken code, minimum-price rule, unknown e-mail) come back inline.
* **Discount:** percentage (above 0, up to 100) or fixed (INR, USD or both, above 0). The minimum-price rule against real cohort prices is the server's (a refusal is shown), not duplicated on screen.
* **Selected students:** a pasted list (split on spaces, commas, semicolons and lines, lower-cased, de-duplicated, at most 200) plus a learner picker that searches signed-up users by name or e-mail and adds the address. Someone who has not signed up is named by the server.
* **Works for:** tick cohorts and/or type plan ids; nothing means every cohort and plan.
* **Generate:** 1 to 200 one-time codes in one call with an `Idempotency-Key` (a double submit returns the same batch); the codes are shown once for copying.
* **Change:** only what changed is sent; a limit cannot be removed once set and a one-time code stays one use (the API rules, shown as such); the code, kind and scope are not editable. JSON is compared ignoring key order (the database returns its own order), so an unchanged coupon is "Nothing has changed", not a needless save.
* **Used one-time code:** read-only, no form and no delete (the server refuses both). A used coupon of any kind can only be deactivated. Delete asks first.
* **Settings:** four fixed settings with their defaults; a typed value is checked like the server (whole numbers in range; phone and e-mail formats); the announcement limit may equal but not exceed the daily limit (the Save button stays off and says why); the first save of a key needs no version, later saves carry `If-Match`; the two text settings can be cleared.

**Unit (`tests/unit/admin-ui-coupons.spec.ts`, 9 tests; `admin-ui-forms.spec.ts` gains `ADMUI-UNIT-JSON-001`):** `ADMUI-UNIT-CPN-001` to `007`, `ADMUI-UNIT-SET-001` and `002`. They run the screen's output through the server's own validators (`couponCreateShape`, `generateShape`, `couponUpdateShape`, `checkSettingValue`, `assertSettingsConsistent`) so the hints cannot drift.
**UI (`tests/ui/admin/admin-coupons-settings.spec.ts`, 6 tests):** `ADMUI-CPN-001` to `005`, `ADMUI-SET-001`. Coupons are named `QAADMUI...`; generated codes are removed by who made them and when; the QA settings are saved before and restored after.
**Not automated:** the visual look (shown to the owner before the slice is finalised) and a real redemption at checkout (phase 5 switches the learner portal to these coupons).

## 8. Slice 4d-2: banners, notifications, e-mail templates
Screens: `/admin/banners` and `/admin/banners/{slug}`, `/admin/notifications` and `/admin/notifications/{id}`, `/admin/email-templates` and `/admin/email-templates/{key}`. Only `/api/admin/v1/banners/**`, `/notifications/**`, `/email-templates/**`, `/settings` (the caps shown in the send dialog) and `/cohorts` (a picker) are called.

**Rules under test:**
* **Banners:** created as a draft; the message is one line of plain text (up to 280, no `<` or `>`); a button needs a label and a link together (https, or a path such as `/courses`, never `//` or `javascript:`); a cohort or plan audience needs its slug; priority 0 to 100 (empty counts as 0); the end must be after the start. Life cycle is the same four actions as courses (publish, back to draft, archive, restore) through the shared bar. A published banner cannot be deleted (the button is off and says why). Edits send only changed fields; an emptied label, link, date or countdown is sent as `null`.
* **Banner preview:** a look-alike bar updates as you type. "Check what this viewer sees" explains, for the saved banner, why it would or would not show (draft, not started, ended, wrong audience); a unit test proves its yes or no equals the server's `visibleBanners` for every combination of status, window, audience and viewer. A banner with a higher priority in the same place can still take the spot (said on screen).
* **Notifications:** the e-mail box exists only for types that may e-mail (marketing, progress and admin alerts are inbox only); an admin alert is aimed at admins and only an admin alert is; an e-mail notification cannot be scheduled for later; expiry is after the publish time. **Creating never sends an e-mail.**
* **The e-mail send (owner only):** "Send e-mail…" opens a dialog that asks the server for the recipient **count** and a **sample of at most 5**, and shows both caps (per announcement, per day). The send button stays off until the owner ticks "I checked the recipients", and stays off with a reason when there is nobody to send to, when the count is over the announcement cap, or when it was already sent. The server repeats every check, sends once and one message per person; a send is audited. The page never holds the whole list.
* **E-mail templates:** three fixed templates (welcome, payment receipt, free enrolment) with built-in text until the first save; only the placeholders each template lists are allowed (insert buttons); hints mirror the server's; the first save needs no version, later ones carry `If-Match`; "Save" stays off until the stored text would actually change. The preview is drawn by the server's own renderer with sample values; hostile text (script, image, `javascript:` link) stays inert.

**Unit (`tests/unit/admin-ui-engagement.spec.ts`, 9 tests):** `ADMUI-UNIT-ENG-001` to `009`. Drift guards run the screen's output through the server's own modules (`bannerCreateShape`, `assertBanner`, `visibleBanners`, `buildNotification`, `checkEmailSend`, `templateProblems`, `assertTemplate`). The guard found one gap while building: a link typed without a label was dropped before the server saw it; it is now sent so the server refuses the pair.
**UI (`tests/ui/admin/admin-engagement.spec.ts`, 7 tests):** `ADMUI-BAN-001`, `002`, `ADMUI-NTF-001` to `003`, `ADMUI-TPL-001`, `002`. Banners are `qaadmui-...`, notifications "QAADMUI ...", the three QA templates are saved before and restored after. **No e-mail is ever sent by these tests**: the send dialog is opened, ticked and cancelled, and the database is checked to still have no send time.
**Not automated:** the real send (existing manual case `AAPI-NTF-M-001`, still to be run by the owner), the visual look, and what a banner looks like on the learner pages (phase 5).

