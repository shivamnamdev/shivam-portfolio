# Progress Log

Date-wise log of changes, generated from `git log` (see [CONSTITUTION.md](../../CONSTITUTION.md) §2).
Newest first. Format: `hash` subject — author (files changed, +added/−deleted). Merge commits are tagged **[merge]**; commits on other branches but not yet in `origin/main` are tagged **[not in main]**.

_Last generated: 2026-11-13 from `9694b61` on branch `docs/SCP-87-upgrade-records`._

## Working tree (not yet committed)


## Commit history

### 2026-11-13

- `9694b61` docs(SCP-87): upgrade plan outcome, three run records, changelog, PRD 16 and constitution log **[not in main]** — shivamnamdev (8 files, +808/−3)
- `673a6c1` fix(ci): pin ubuntu-24.04 and Node 24 so Playwright can install browsers (SCP-87) **[not in main]** — shivamnamdev (1 files, +4/−2)
- `3698bd4` Merge pull request #91 from shivamnamdev/fix/SCP-87-stage5-next-16 **[merge]** — SHIVAM NAMDEV
- `fbf32b5` fix(deps): stage 5 next 15 to 16.4.6 (SCP-87) — shivamnamdev (1 files, +3/−1)

### 2026-11-12

- `317fcaa` wip(deps): stage 5 next 15 to 16.4.6, PARKED, do not merge before Clerk 7 (SCP-87) — shivamnamdev (5 files, +59/−91)
- `38fdb3a` Merge pull request #90 from shivamnamdev/fix/SCP-87-stage6-clerk-7 **[merge]** — SHIVAM NAMDEV
- `aee3821` fix(deps): stage 6 follow-ups from the full suite, api matcher no longer catches /api-docs and Clerk 7 sign-out and error locators (SCP-87) — shivamnamdev (2 files, +5/−3)
- `aec9bc4` fix(deps): stage 6 @clerk/nextjs 4.31.8 to 7.9.25 (SCP-87) — shivamnamdev (37 files, +158/−599)
- `97b99cf` Merge pull request #89 from shivamnamdev/fix/SCP-87-stage4-next-15 **[merge]** — SHIVAM NAMDEV

### 2026-11-10

- `60d107c` fix(deps): stage 4 follow-ups found by the full suite, inert on the preview checkout and an exact Next button locator (SCP-87) — shivamnamdev (2 files, +2/−2)
- `b1a9381` fix(deps): stage 4 next 14 to 15.5.29 (SCP-87) — shivamnamdev (52 files, +839/−190)
- `4bce663` Merge pull request #88 from shivamnamdev/fix/SCP-87-stage3-nodemailer-10 **[merge]** — SHIVAM NAMDEV
- `c2b002a` Merge pull request #87 from shivamnamdev/fix/SCP-87-stage2-swagger-ui-5 **[merge]** — SHIVAM NAMDEV
- `8c87447` Merge pull request #86 from shivamnamdev/fix/SCP-87-stage1-in-range-fixes **[merge]** — SHIVAM NAMDEV

### 2026-11-09

- `612133f` fix(deps): stage 3 nodemailer 8 to 10 (SCP-87) — shivamnamdev (2 files, +6/−6)
- `fc7d5a5` fix(deps): stage 2 swagger-ui-react 3 to 5 and pin dompurify 3.4.17 (SCP-87) — shivamnamdev (2 files, +1147/−925)
- `1d5e242` docs: dependency upgrade plan for SCP-87, refreshed 2026-11-09 (proposal) **[not in main]** — shivamnamdev (1 files, +77/−0)
- `e996610` docs(testing): regression run 2026-11-08, 970 passed, 20 flaky, 23 failed, 97 skipped (SCP-97) **[not in main]** — shivamnamdev (2 files, +302/−1)
- `277b01c` fix(deps): stage 1 in-range fixes for eight transitive packages (SCP-87) — shivamnamdev (1 files, +26/−26)

### 2026-11-08

- `bccad31` chore: add Building-with-the-Claude-API as a submodule (reference notebooks for the future AI epic) — shivamnamdev (2 files, +4/−0)
- `b89d48d` Merge pull request #85 from shivamnamdev/admin-portal/p5d-prices-coupons **[merge]** — SHIVAM NAMDEV
- `5ae7b6b` test(portal): flush the catalog cache after specs that publish portal rows, wait for sign-in before applying a coupon, scope the 5a pricing case (SCP-89) — shivamnamdev (5 files, +21/−5)

### 2026-11-07

- `abe8da7` Merge pull request #84 from shivamnamdev/admin-portal/p5d-prices-coupons **[merge]** — SHIVAM NAMDEV
- `d9640f1` feat(portal): slice 5e admin-only learner preview of draft, published and archived cohorts (SCP-89) — shivamnamdev (26 files, +613/−149)
- `7e8253b` docs: phase 6e Blueprint proposed, retire the data files as a runtime source after the production soak (SCP-89) — shivamnamdev (3 files, +66/−0)
- `6f35a09` Merge pull request #83 from shivamnamdev/admin-portal/p5d-prices-coupons **[merge]** — SHIVAM NAMDEV
- `5eae6c8` feat(admin): phase 6a to 6c retire the legacy admin routes, admin phone and keyboard specs, cutover check and runbook (SCP-89) — shivamnamdev (29 files, +465/−389)
- `2ccb411` feat(portal): phase 5d prices and coupons read the portal behind PORTAL_COUPONS (SCP-89, SCP-53) — shivamnamdev (23 files, +747/−43)

### 2026-11-06

- `31801fa` merge: admin portal phases 4 and 5 into the course-cta-update-3 integration branch (base for slice 5d) **[merge]** — shivamnamdev
- `eae8346` Merge pull request #82 from shivamnamdev/admin-portal/p5-learner-portal **[merge]** — SHIVAM NAMDEV
- `a948f62` feat(portal): phase 5c banners, notification bell and saved mail templates read the portal behind PORTAL_ENGAGEMENT (SCP-89) — shivamnamdev (29 files, +905/−82)
- `585301e` feat(portal): phase 5b lessons, dashboard cards and private links read the portal behind PORTAL_LEARNING (SCP-89, SCP-45) — shivamnamdev (28 files, +553/−66)
- `94bb3e5` feat(portal): phase 5a course list and sales pages read the portal behind PORTAL_CATALOG (SCP-89) — shivamnamdev (19 files, +505/−17)
- `bf857fc` docs: phase 5 blueprint, the learner portal reads the database behind per-slice flags (SCP-89) — shivamnamdev (3 files, +77/−1)
- `506f613` feat(admin): phase 4f(c) learners directory screen and retirement of the classic admin page (SCP-89) — shivamnamdev (30 files, +236/−1073)
- `fd17332` feat(admin): phase 4f read-only progress, submissions and engagement API and screens; sign-ups report window to 365 days (SCP-89) — shivamnamdev (34 files, +1020/−24)
- `b79a179` feat(admin-ui): phase 4e enrolments (grant, two-step remove, CSV downloads) and count-only reports screens (SCP-89) — shivamnamdev (13 files, +472/−7)
- `bb4df86` feat(admin-ui): phase 4d-2 banners, notifications with the confirmed e-mail send dialog, and e-mail template screens (SCP-89) — shivamnamdev (19 files, +1149/−10)
- `e7c3640` feat(admin-ui): phase 4d-1 coupons (create, generate, change) and settings screens (SCP-89) — shivamnamdev (18 files, +970/−9)
- `c0208c4` feat(admin-ui): phase 4c curriculum editor with lesson panel, publish and discard, outline preview and import helper (SCP-89) — shivamnamdev (15 files, +914/−5)

### 2026-11-05

- `0e16ade` feat(admin-ui): phase 4b courses and cohorts screens with pricing editor, life cycle and private links (SCP-89) — shivamnamdev (16 files, +954/−7)
- `a5ec638` feat(admin-ui): phase 4a admin shell, overview, audit log and API keys screens, portal toggle (SCP-89, SCP-41) — shivamnamdev (17 files, +805/−3)
- `353a867` Merge pull request #81 from shivamnamdev/admin-portal/p3c-operations-api **[merge]** — SHIVAM NAMDEV
- `55614e5` feat(admin-api): phase 3c enrolments, count-only reports and CSV export, unit and API tests (SCP-89) — shivamnamdev (18 files, +764/−21)
- `0194ab3` Merge pull request #80 from shivamnamdev/admin-portal/p3-engagement-api **[merge]** — SHIVAM NAMDEV
- `ad33901` feat(admin-api): phase 3b notifications and the owner-only e-mail send, unit and API tests (SCP-89) — shivamnamdev (18 files, +823/−15)
- `bc3ac36` feat(admin-api): phase 3a banners, settings and e-mail templates, unit and API tests (SCP-89) — shivamnamdev (27 files, +1193/−5)

### 2026-11-04

- `ef3f04a` feat(admin-api): curriculum import endpoint (dry run, owner only), unit and API tests (SCP-89) — shivamnamdev (11 files, +214/−7)
- `594c777` feat(admin-api): phase 2 content API: curriculum of a cohort, draft and publish, unit and API tests (SCP-89) — shivamnamdev (24 files, +1140/−4)
- `298e640` Merge pull request #79 from shivamnamdev/admin-portal/p1-api-foundation **[merge]** — SHIVAM NAMDEV
- `4691966` test(admin-api): unit tests for the business rules, sample requests, serial admin-api script (SCP-89) — shivamnamdev (7 files, +420/−22)
- `e3bb132` feat(admin-api): phase 1: courses, cohorts, coupons, learners picker, audit, API keys, OpenAPI and docs page (SCP-89) — shivamnamdev (51 files, +2114/−15)
- `d1b224b` feat(admin-api): phase 1 slice 1: core library, SQL for the four tables, unit tests (SCP-89) — shivamnamdev (13 files, +443/−3)
- `cbf48b2` fix(test): adapt discovery and public specs to the plan-based sales page (listed flag, two View Open Cohorts links) — shivamnamdev (5 files, +5/−4)
- `76bf745` docs: record the Blueprint approval and write PRD 17 (admin API) with 45 cases — shivamnamdev (5 files, +94/−3)
- `5f43925` fix(test): fixture course is single-price; order notes now carry planId — shivamnamdev (2 files, +3/−1)
- `c59ef7e` docs: epic plan: one-time coupons, no new packages, payment roadmap, e-mail scope, minimum-order proposal — shivamnamdev (2 files, +45/−43)
- `a6e0df8` Merge course-cta-update-3 into current main (integration test branch) **[merge]** — shivamnamdev
- `1192f6c` docs: correct the coupon model: open-for-all or selected students, mandatory expiry for both — shivamnamdev (1 files, +24/−12)
- `ee9b748` docs: align phase 1 scope with the small table set — shivamnamdev (1 files, +1/−1)
- `98877a8` docs: admin portal plan updated with the owner's decisions, payment models, coupon rules, notifications, banners, role-ready guard and a small Supabase footprint — shivamnamdev (3 files, +132/−23)
- `394b8e1` docs: admin portal and learner portal epic plan (proposal, no code) — shivamnamdev (3 files, +168/−0)
- `a478d73` docs: add the links and coupons plan file (SCP-45, SCP-53) **[not in main]** — shivamnamdev (1 files, +91/−0)
- `bafe3b7` docs: plan to take course links and coupons out of the public JavaScript (SCP-45, SCP-53) **[not in main]** — shivamnamdev (1 files, +1/−0)
- `a028c1b` Merge pull request #78 from shivamnamdev/fix/SCP-59-60-admin-case-and-streak-timezone **[merge]** — SHIVAM NAMDEV
- `f4ce1f7` fix: admin page uses isAdminEmail; streak day follows the learner's time zone (SCP-59, SCP-60) — shivamnamdev (7 files, +59/−13)
- `d43912f` Merge pull request #77 from shivamnamdev/test/SCP-73-limit-test-seeds-stats-row **[merge]** — SHIVAM NAMDEV

### 2026-11-03

- `630d345` test: AIA-TRK-004 creates its own stats row so the limit test runs (SCP-73) — shivamnamdev (2 files, +16/−6)
- `b47e113` Merge pull request #76 from shivamnamdev/fix/security-bug-batch **[merge]** — SHIVAM NAMDEV
- `279b99b` docs: record batch run results — shivamnamdev (1 files, +1/−0)
- `27b502b` Merge branch 'feat/SCP-69-73-rate-limits' into fix/security-bug-batch **[merge]** — shivamnamdev
- `1d7b3ae` Merge branch 'fix/SCP-71-certificate-needs-completion' into fix/security-bug-batch **[merge]** — shivamnamdev
- `189dcef` Merge branch 'fix/SCP-67-68-clerk-webhook' into fix/security-bug-batch **[merge]** — shivamnamdev
- `a638759` Merge branch 'fix/SCP-66-verify-payment-unknown-order' into fix/security-bug-batch **[merge]** — shivamnamdev
- `c383470` feat(security): Supabase-backed rate limits for send-email and track-time (SCP-69, SCP-73) — shivamnamdev (8 files, +120/−9)
- `ad2a159` fix(certificate): issue only after 80% of the course and a passed exam, name from Clerk (SCP-71) — shivamnamdev (7 files, +123/−28)
- `7c99da4` fix(certificate): refuse names the PDF font cannot print with 400 (SCP-72) — shivamnamdev (2 files, +8/−0)
- `d9e3a00` fix(webhook): log a Clerk signup once and tolerate a missing e-mail list (SCP-67, SCP-68) — shivamnamdev (2 files, +13/−7)
- `c771cbc` fix(payments): verify-payment answers 404 for an order Razorpay does not know (SCP-66) — shivamnamdev (2 files, +10/−1)
- `ff571a9` fix(ai-tutor): require a signed-in learner (SCP-70) — shivamnamdev (8 files, +33/−25)
- `7abb9af` docs: dependency upgrade plan for SCP-87 (proposal, nothing installed) **[not in main]** — shivamnamdev (4 files, +66/−0)
- `136c823` fix(admin): manual enrollment shows the database error cause to the admin **[not in main]** — shivamnamdev (1 files, +4/−1)
- `97476a1` Merge pull request #74 from shivamnamdev/test/prd16-security-baseline **[merge]** — SHIVAM NAMDEV
- `3260028` docs: record SCP-86 and SCP-87 — shivamnamdev (2 files, +2/−1)
- `945d791` fix(security): send response headers (frame, nosniff, referrer, permissions, report-only CSP); add inform-before-installing rule — shivamnamdev (5 files, +40/−4)
- `751ee69` Merge main into test/prd16-security-baseline **[merge]** — shivamnamdev
- `001a826` Merge pull request #75 from shivamnamdev/fix/lockfile-in-sync **[merge]** — SHIVAM NAMDEV
- `35babe9` fix: put the four missing peer packages back in package-lock.json so npm ci passes in CI — shivamnamdev (1 files, +56/−14)
- `df80a1c` test: PRD 16 security baseline (headers, exposure, XSS, visitor sweep) — shivamnamdev (7 files, +215/−2)

### 2026-11-02

- `c90205d` Merge pull request #73 from shivamnamdev/feat/server-side-exam-grading **[merge]** — SHIVAM NAMDEV
- `9cbf6ba` feat(exam): grade the final exam on the server — shivamnamdev (14 files, +538/−275)
- `ab4d001` docs: Pyodide server spike findings (sandbox escape found and closed) — shivamnamdev (1 files, +9/−0)
- `c49a792` docs: exam grading blueprint handles input() without a human time limit — shivamnamdev (1 files, +6/−2)
- `5769999` docs: blueprint for server-side exam grading (awaiting approval) — shivamnamdev (1 files, +19/−0)
- `40960f6` Merge pull request #72 from shivamnamdev/docs/pol-016-result **[merge]** — SHIVAM NAMDEV
- `56b6d8e` docs: POL-016 result on QA, POL-012 not available — shivamnamdev (3 files, +9/−1)
- `2f9b4ce` Merge pull request #71 from shivamnamdev/docs/qa-step5-verified **[merge]** — SHIVAM NAMDEV
- `71a9522` docs: QA step 5 verified, tests/db all green — shivamnamdev (3 files, +12/−4)
- `22fb41b` Merge pull request #70 from shivamnamdev/fix/supabase-admin-requires-service-key **[merge]** — SHIVAM NAMDEV
- `0c2097d` Merge main into fix/supabase-admin-requires-service-key (keep both changelog entries) **[merge]** — shivamnamdev
- `0746845` fix: supabaseAdmin no longer falls back to the public key when the service-role key is missing — shivamnamdev (3 files, +13/−8)
- `76bfc3b` Merge pull request #69 from shivamnamdev/docs/prod-lock-results **[merge]** — SHIVAM NAMDEV
- `7251613` docs: production lock verified (steps 4 and 5), SCP-74 to SCP-76 — shivamnamdev (6 files, +165/−1)
- `0911504` Merge pull request #68 from shivamnamdev/security/SCP-74-enrollments-route **[merge]** — SHIVAM NAMDEV
- `9ef1b13` security(SCP-75): read enrolments through /api/learning/enrollments and add the step 5 lock script — shivamnamdev (16 files, +114/−42)
- `80773bd` Merge pull request #67 from shivamnamdev/feat/restore-lesson-like-button **[merge]** — SHIVAM NAMDEV
- `304a03d` feat(learning): restore the lesson Like button and automate LRN-TAB-011 (SCP-49) — shivamnamdev (4 files, +140/−113)

### 2026-11-01

- `6402e40` Merge pull request #66 from shivamnamdev/security/SCP-74-lock-learner-tables **[merge]** — SHIVAM NAMDEV
- `2ddaf0b` Merge main into security/SCP-74-lock-learner-tables (keep all log entries) **[merge]** — shivamnamdev
- `478f655` Merge pull request #65 from shivamnamdev/security/SCP-74-admin-data-route **[merge]** — SHIVAM NAMDEV
- `ba69f75` docs: blank line before the admin-data changelog heading — shivamnamdev (1 files, +1/−0)
- `ca2916c` Merge main into security/SCP-74-admin-data-route (keep both log entries) **[merge]** — shivamnamdev
- `560f281` Merge pull request #64 from shivamnamdev/security/SCP-74-learner-routes **[merge]** — SHIVAM NAMDEV
- `e718b82` feat(security): database lock script for the learner tables with rollback (SCP-74 to SCP-76, PR 3 of 3) — shivamnamdev (4 files, +47/−5)
- `f64052c` feat(security): admin portal reads its data through /api/admin/dashboard-data (SCP-74 to SCP-76, PR 2 of 3) — shivamnamdev (7 files, +102/−18)
- `ddc54b3` feat(security): learner routes under /api/learning replace browser access to the learner tables (SCP-74 to SCP-76, PR 1 of 3) — shivamnamdev (19 files, +625/−126)
- `ef233c6` Merge pull request #63 from shivamnamdev/docs/progress-after-db-policy **[merge]** — SHIVAM NAMDEV
- `e6447ed` docs(blast): regenerate progress.md after the DB-Policy merge — shivamnamdev (1 files, +3/−9)
- `c66fb10` Merge pull request #62 from shivamnamdev/DB-Policy **[merge]** — SHIVAM NAMDEV
- `56e27c9` test(db): policy inventory SQL, checker and QA/production results (PRD 14) — shivamnamdev (15 files, +999/−18)
- `fe48f45` Merge pull request #61 from shivamnamdev/docs/bug-fix-workflow-skill **[merge]** — SHIVAM NAMDEV
- `50cc67e` Merge pull request #60 from shivamnamdev/fix/SCP-85-unique-violation-in-grant-enrollment **[merge]** — SHIVAM NAMDEV
- `03e287b` Python day-22 access specifier video updated — shivamnamdev (1 files, +2/−1)
- `ad729c8` docs(skills): bug-fix-workflow also updates docs/blast (task plan, findings, progress) — shivamnamdev (1 files, +5/−1)
- `25a59d2` docs(skills): add the bug-fix-workflow skill and a Jira helper script — shivamnamdev (3 files, +152/−1)
- `1b7e9c5` fix(enrollments): treat a unique violation as "already enrolled" (SCP-85) — shivamnamdev (1 files, +9/−1)

### 2026-10-31

- `36736db` Merge pull request #59 from shivamnamdev/docs/testing-hub **[merge]** — SHIVAM NAMDEV
- `8ce2957` Updated all the PRDs and test cases — shivamnamdev (56 files, +3078/−301)

### 2026-10-30

- `dad94e0` Updated prds and testing scripts — shivamnamdev (62 files, +8563/−214)

### 2026-10-27

- `dde206e` PRD-01 and PRD-02 Updated — shivamnamdev (47 files, +7393/−192)
- `0b5abd0` Merge pull request #58 from shivamnamdev/test/pr-smoke-suite **[merge]** — SHIVAM NAMDEV
- `4f1010a` testcase added — shivamnamdev (11 files, +136/−24)

### 2026-10-24

- `5ddb5c8` Python day 21 oops inheritance uploaded — shivamnamdev (1 files, +3/−2)

### 2026-10-18

- `5fa1bbb` Merge branch 'main' of github-personal:shivamnamdev/shivam-portfolio merge it **[merge]** — shivamnamdev
- `5609380` python day-20 oops — shivamnamdev (1 files, +3/−3)

### 2026-10-16

- `7a67129` Blast — shivamnamdev (8 files, +790/−0)
- `be922f1` Course sales page upgrade with plan-based pricing (from course-cta-update-2) — shivamnamdev (25 files, +728/−82)
- `d045541` Merge pull request #57 from shivamnamdev/fix/prd-known-issues **[merge]** — SHIVAM NAMDEV
- `67a63d8` Add pricing unit tests and record regression findings — shivamnamdev (2 files, +68/−1)
- `67748bb` Fix security and correctness issues from the platform PRD audit — shivamnamdev (36 files, +815/−352)
- `2b46c45` documentations and skills — shivamnamdev (7 files, +1125/−0)

### 2026-10-11

- `2f14678` Mini Project 2 for Python — shivamnamdev (1 files, +4/−4)

### 2026-10-10

- `db58b12` Python function day-2 — shivamnamdev (1 files, +5/−4)

### 2026-10-04

- `b702655` update Python Functions — shivamnamdev (1 files, +3/−2)

### 2026-10-03

- `7069fe5` On course-cta-update-2: Course CTA Update **[merge]** **[not in main]** — shivamnamdev
- `9cbfce7` index on course-cta-update-2: 65de6c3 Updated the python course page detail draft 2 **[not in main]** — shivamnamdev
- `fd314b0` update Python Exceptional handling — shivamnamdev (1 files, +4/−3)

### 2026-09-27

- `65de6c3` Updated the python course page detail draft 2 **[not in main]** — shivamnamdev (7 files, +446/−397)
- `a1e5513` Updated the course title by removing batch detail **[not in main]** — shivamnamdev (1 files, +5/−1)
- `57021c7` Product Diagram — shivamnamdev (1 files, +0/−0)
- `b93ea51` Course CTA draft 1 **[not in main]** — shivamnamdev (4 files, +375/−93)

### 2026-09-20

- `ce28128` Update Python file handling day 2 lesson and assignment — shivamnamdev (1 files, +7/−6)

### 2026-09-19

- `4159f65` file handling pythonsession uploaded — shivamnamdev (1 files, +5/−4)

### 2026-09-15

- `8f858bc` Merge pull request #56 from shivamnamdev/mobile-responsive **[merge]** — SHIVAM NAMDEV
- `32ad805` mobile resolution video loading support — shivamnamdev (2 files, +173/−113)

### 2026-09-13

- `185e0a0` Updated python mini project 1 — shivamnamdev (1 files, +7/−1)

### 2026-09-12

- `2eb0c67` Merge pull request #55 from shivamnamdev/mobile-responsive **[merge]** — SHIVAM NAMDEV
- `ba58792` updated python dictionary — shivamnamdev (1 files, +30/−34)

### 2026-09-10

- `1c7fc1f` Tuple and set assignment updated — shivamnamdev (1 files, +5/−4)

### 2026-09-09

- `01bbeee` SCP-27: Public pages would accessible without auth — shivamnamdev (1 files, +3/−0)

### 2026-09-08

- `5d2ddbf` Update tuple and set data type sessions — shivamnamdev (1 files, +3/−1)

### 2026-09-06

- `8834364` updated python list hands data — shivamnamdev (1 files, +6/−5)
- `f46ea22` update python batch 2 cohort enrollment close — shivamnamdev (1 files, +3/−3)
- `9dbb4c8` Revoke Teacher's day coupon — shivamnamdev (2 files, +7/−16)

### 2026-09-05

- `34ed9f4` teacher day banner updated for git course — shivamnamdev (1 files, +1/−1)
- `1d26c0b` GIT Course offer message update — shivamnamdev (1 files, +3/−3)
- `3c4bff7` GIT Course only for today — shivamnamdev (2 files, +18/−4)
- `6415b85` updated python day 11 content — shivamnamdev (1 files, +11/−5)

### 2026-08-25

- `63325ec` Updated python session video — shivamnamdev (1 files, +4/−2)

### 2026-08-13

- `fdce43c` Stage branch testing **[not in main]** — shivamnamdev (2 files, +353/−0)

### 2026-08-10

- `5f08e9e` Updated Python lab with auto complete using jedi — shivamnamdev (1 files, +74/−2)

### 2026-08-09

- `a6ee23f` Python Day-9:Strings basic Uploaded — shivamnamdev (1 files, +6/−7)

### 2026-08-08

- `7b761f3` Python Day:8 Patterns using loop completed — shivamnamdev (1 files, +5/−7)

### 2026-08-07

- `b835b1d` Merge pull request #54 from shivamnamdev/video-doc-enhancements **[merge]** — SHIVAM NAMDEV
- `0c748cb` added user engagement tracking functionality — shivamnamdev (4 files, +135/−9)

### 2026-08-05

- `0af26d6` Merge pull request #53 from shivamnamdev/video-doc-enhancements **[merge]** — SHIVAM NAMDEV
- `619e94a` updated github and python docs and doc type code — shivamnamdev (2 files, +56/−94)

### 2026-08-04

- `cf89a43` Merge pull request #52 from shivamnamdev/video-doc-enhancements **[merge]** — SHIVAM NAMDEV

### 2026-08-03

- `ff4bb39` Base course docs file updated — shivamnamdev (1 files, +105/−35)

### 2026-08-01

- `b130649` Python Day-7:For Loop Recording update — shivamnamdev (2 files, +14/−3)

### 2026-07-27

- `83f6102` update infinite loop handling for python labs — shivamnamdev (1 files, +41/−9)

### 2026-07-26

- `57a4943` Python Day-6 Recording and Assignment — shivamnamdev (1 files, +3/−2)

### 2026-07-25

- `1b94faa` Python Day-5 Session Recording and Assignment — shivamnamdev (1 files, +3/−2)

### 2026-07-20

- `83690f9` Git Course close — shivamnamdev (1 files, +4/−4)

### 2026-07-19

- `c8d801f` Day-4 python recording — shivamnamdev (1 files, +6/−5)

### 2026-07-18

- `2676334` notification for python recording update — shivamnamdev (1 files, +8/−0)
- `2264872` updated Python Day 3-recording — shivamnamdev (2 files, +9/−5)

### 2026-07-16

- `37e23a6` Merge pull request #51 from shivamnamdev/assignment-retainer **[merge]** — SHIVAM NAMDEV
- `efc5761` Updated advance video backend code — shivamnamdev (2 files, +25/−12)

### 2026-07-15

- `c0c52e3` Merge pull request #50 from shivamnamdev/assignment-retainer **[merge]** — SHIVAM NAMDEV
- `32a97e1` Updated last day of git session — shivamnamdev (1 files, +2/−1)

### 2026-07-14

- `7267e2f` Updated Assignment code retainer after revisiting: Phase 1 — shivamnamdev (1 files, +181/−37)
- `4e79977` updated the GIT Day-13 session video — shivamnamdev (1 files, +2/−1)

### 2026-07-13

- `38cc8aa` update Git Workflow 2 updated — shivamnamdev (1 files, +2/−1)

### 2026-07-12

- `18b20f1` Updated Python Day-2 Session recording and assignment — shivamnamdev (1 files, +9/−12)
- `b264f6c` Updated the python batch 3 whatsapp group link — shivamnamdev (1 files, +1/−1)

### 2026-07-11

- `1caf14d` updated coupon for existed users — shivamnamdev (1 files, +2/−2)
- `cf33396` updated Python batch 3 Day-1 session recording — shivamnamdev (1 files, +2/−2)

### 2026-07-10

- `f29fbfc` updated the page refresh cache to keep the last state of the video — shivamnamdev (1 files, +138/−4)
- `429c43c` uploaded git workflow 1 — shivamnamdev (1 files, +1/−1)

### 2026-07-09

- `a144b55` updated git day 12 live session recording — shivamnamdev (1 files, +2/−1)

### 2026-07-08

- `d35da7d` day 11 git session recording update — shivamnamdev (1 files, +2/−1)

### 2026-07-07

- `cd7d211` updated day 10 video — shivamnamdev (1 files, +1/−1)

### 2026-07-06

- `92e828c` updated Day 9 Git Session recording — shivamnamdev (1 files, +2/−1)

### 2026-07-04

- `5c2e672` updated sharing link authenticate — shivamnamdev (2 files, +124/−16)

### 2026-07-03

- `4c419a1` updated Day 8 Git session — SHIVAM NAMDEV (1 files, +2/−1)

### 2026-07-02

- `d66b66c` updated day 2 assignment — SHIVAM NAMDEV (1 files, +8/−5)
- `4620115` Add new GIT video ID for Day 07 to Module 3 — SHIVAM NAMDEV (1 files, +3/−2)

### 2026-07-01

- `984886c` updated the day 6 video and assignment — shivamnamdev (6 files, +462/−37)

### 2026-06-30

- `db9302f` updated the git day 05 video — shivamnamdev (1 files, +7/−6)

### 2026-06-29

- `5147c30` updated the git day 04 video — shivamnamdev (1 files, +6/−69)

### 2026-06-27

- `4c3d167` updated python advertisement — shivamnamdev (3 files, +1/−1)
- `352cb47` Updated python course last date — shivamnamdev (1 files, +1/−1)

### 2026-06-26

- `d552527` Updated git day 03 video — shivamnamdev (1 files, +11/−146)

### 2026-06-23

- `eaa6274` Day-2 video — shivamnamdev (1 files, +4/−2)

### 2026-06-22

- `48c0f35` updated git day 1 session recording — shivamnamdev (1 files, +1/−1)
- `0eddc7c` updated coupon and meet join link — shivamnamdev (2 files, +2/−2)
- `3e52205` Revert "Update call link and coupon" — shivamnamdevqa-kyndryl (2 files, +2/−3)
- `e29dda0` Update call link and coupon — shivamnamdevqa-kyndryl (2 files, +3/−2)

### 2026-06-19

- `326e806` Updated coupon" — shivamnamdev (2 files, +337/−1)

### 2026-06-18

- `6581c75` Updated coupon codes — shivamnamdev (6 files, +35/−4)
- `f185cb7` Revert "update git course syllabus and code" — shivamnamdevqa-kyndryl (5 files, +5/−28)
- `2eb71d4` Revert "Coupon for git class has been updated" — shivamnamdevqa-kyndryl (1 files, +1/−10)
- `8641c7f` Coupon for git class has been updated — shivamnamdevqa-kyndryl (1 files, +10/−1)

### 2026-06-17

- `28cbe0f` Updated the redundant portfolio **[not in main]** — shivamnamdev (1 files, +1/−4)

### 2026-06-16

- `1772e51` update git course syllabus and code — shivamnamdev (5 files, +28/−5)
- `a628e09` Add/Updated git course details — shivamnamdev (6 files, +936/−910)

### 2026-06-09

- `965c577` Merge pull request #49 from shivamnamdev/advance-lessons **[merge]** — SHIVAM NAMDEV
- `a5a09d7` updated expected result — shivamnamdev (2 files, +87/−28)

### 2026-06-08

- `767c435` Merge pull request #48 from shivamnamdev/advance-lessons **[merge]** — SHIVAM NAMDEV
- `a1b97b3` update logo — shivamnamdev (5 files, +5/−0)

### 2026-06-06

- `46b1971` Merge pull request #47 from shivamnamdev/advance-lessons **[merge]** — SHIVAM NAMDEV
- `cd5dccd` added final exam — shivamnamdev (3 files, +209/−71)

### 2026-06-04

- `d0064d8` Merge pull request #46 from shivamnamdev/advance-lessons **[merge]** — SHIVAM NAMDEV
- `08a4ffd` Updated video resolution — shivamnamdev (1 files, +292/−297)

### 2026-06-01

- `543f71e` Updated the portfolio **[not in main]** — shivamnamdev (6 files, +305/−74)

### 2026-05-30

- `0a33444` Merge pull request #45 from shivamnamdev/new-ui **[merge]** — SHIVAM NAMDEV
- `0818d5a` Update all video links — shivamnamdev (1 files, +3/−1)
- `6b6b205` Portfolio update **[not in main]** — shivamnamdev (1 files, +62/−0)
- `709f4c6` Updated the portfolio **[not in main]** — shivamnamdev (2 files, +255/−22)

### 2026-05-27

- `f57a447` Merge pull request #44 from shivamnamdev/new-ui **[merge]** — SHIVAM NAMDEV
- `1df3d4c` updated content and learning slug page — shivamnamdev (2 files, +51/−33)
- `218c55c` day content complete — shivamnamdev (1 files, +11/−4)
- `9fe6971` Merge pull request #43 from shivamnamdev/new-ui **[merge]** — SHIVAM NAMDEV
- `944b6eb` Sharing button update — shivamnamdev (1 files, +1/−8)

### 2026-05-26

- `772526a` share message update — shivamnamdev (2 files, +21/−17)
- `4fe1f06` Merge pull request #42 from shivamnamdev/new-ui **[merge]** — SHIVAM NAMDEV
- `337ea87` share message update — shivamnamdev (7 files, +410/−147)

### 2026-05-25

- `6a742f7` Merge pull request #41 from shivamnamdev/new-ui **[merge]** — SHIVAM NAMDEV
- `c399234` 27th day data — shivamnamdev (1 files, +10/−3)
- `6f57d76` Merge pull request #40 from shivamnamdev/new-ui **[merge]** — SHIVAM NAMDEV
- `85077e5` UI Upgrade — shivamnamdev (26 files, +1074/−973)

### 2026-05-23

- `4ea3a96` Merge pull request #39 from shivamnamdev/new-ui **[merge]** — SHIVAM NAMDEV
- `7fa0245` Updated Assignments — shivamnamdev (1 files, +16/−7)

### 2026-05-21

- `a3bf1ad` Merge pull request #38 from shivamnamdev/visualiser **[merge]** — SHIVAM NAMDEV
- `d561f36` cohort update — shivamnamdev (4 files, +315/−86)
- `9fbc93c` Merge pull request #37 from shivamnamdev/visualiser **[merge]** — SHIVAM NAMDEV
- `5fef0f7` lab update: python file containing starter code — shivamnamdev (2 files, +25/−8)
- `b393e0a` Readme on automation — shivamnamdev (2 files, +75/−2)
- `8fa6533` Merge pull request #36 from shivamnamdev/visualiser **[merge]** — SHIVAM NAMDEV
- `18cd7d8` update all the keys and some code as well — shivamnamdev (7 files, +186/−143)
- `dbc54d2` Merge pull request #35 from shivamnamdev/visualiser **[merge]** — SHIVAM NAMDEV
- `0f81fc8` api-doc update with / to force swagger to user current website domain — shivamnamdev (2 files, +17/−15)
- `fe27e2b` Merge pull request #34 from shivamnamdev/visualiser **[merge]** — SHIVAM NAMDEV
- `b57457f` Fix CI: Add Supabase env variables to GitHub Actions — shivamnamdev (1 files, +2/−0)
- `6f09e63` Merge pull request #33 from shivamnamdev/visualiser **[merge]** — SHIVAM NAMDEV
- `e2545ed` Fix CI pipeline: Add Clerk and API keys to GitHub Actions — shivamnamdev (1 files, +5/−0)
- `24eccf7` Merge pull request #32 from shivamnamdev/visualiser **[merge]** — SHIVAM NAMDEV
- `078f990` Update Day-25 Session recording — shivamnamdev (12 files, +315/−21)

### 2026-05-19

- `bc8bb29` Merge pull request #31 from shivamnamdev/visualiser **[merge]** — SHIVAM NAMDEV
- `bb74f98` Update swagger — shivamnamdev (1 files, +12/−122)
- `be0034f` Merge pull request #30 from shivamnamdev/visualiser **[merge]** — SHIVAM NAMDEV
- `6e3b4cc` Update — shivamnamdev (4 files, +2346/−17)

### 2026-05-18

- `0ed7e33` Merge pull request #29 from shivamnamdev/visualiser **[merge]** — SHIVAM NAMDEV
- `0c8e6dd` Doc Update — shivamnamdev (1 files, +70/−13)
- `81556b7` Merge pull request #28 from shivamnamdev/visualiser **[merge]** — SHIVAM NAMDEV
- `84b64aa` Notification alerts persist fix — shivamnamdev (2 files, +34/−32)

### 2026-05-17

- `58c70cd` Merge pull request #27 from shivamnamdev/visualiser **[merge]** — SHIVAM NAMDEV
- `d649ff9` middleware update for admin webhook functionality to work — shivamnamdev (1 files, +8/−3)

### 2026-05-16

- `b1a1af5` Merge pull request #26 from shivamnamdev/visualiser **[merge]** — SHIVAM NAMDEV
- `3b198e6` Fix alert — shivamnamdev (2 files, +14/−9)
- `10d6090` Merge pull request #25 from shivamnamdev/visualiser **[merge]** — SHIVAM NAMDEV
- `d102c49` user added for coupon — shivamnamdev (1 files, +1/−1)
- `66228a7` Merge pull request #24 from shivamnamdev/visualiser **[merge]** — SHIVAM NAMDEV
- `b5d8a9e` Admin alert — shivamnamdev (6 files, +252/−217)
- `81c9fc8` Merge pull request #23 from shivamnamdev/visualiser **[merge]** — SHIVAM NAMDEV
- `91c0d50` Fixes and new assignments and solutions. — shivamnamdev (9 files, +633/−166)

### 2026-05-12

- `ba7c778` Merge pull request #22 from shivamnamdev/visualiser **[merge]** — SHIVAM NAMDEV
- `70eaa6d` adding input functionality into the lab section — shivamnamdev (2 files, +33/−11)
- `882b932` Merge pull request #21 from shivamnamdev/visualiser **[merge]** — SHIVAM NAMDEV
- `71a4a12` multifile lab update — shivamnamdev (1 files, +229/−73)
- `78de640` Merge pull request #20 from shivamnamdev/visualiser **[merge]** — SHIVAM NAMDEV
- `4c30afb` Admin and lab update — shivamnamdev (6 files, +435/−356)

### 2026-05-10

- `a55084e` update lab content **[not in main]** — shivamnamdevqa-kyndryl (1 files, +7/−7)

### 2026-05-08

- `b10c77c` Updated lab solutions — shivamnamdev (1 files, +2/−1)
- `70df828` Merge pull request #18 from shivamnamdev/visualiser **[merge]** — SHIVAM NAMDEV
- `a624d62` Updated lab solutions — shivamnamdev (2 files, +6/−3)
- `730768f` Merge pull request #17 from shivamnamdev/visualiser **[merge]** — SHIVAM NAMDEV
- `475d06e` Updated lab solutions — shivamnamdev (2 files, +184/−79)

### 2026-05-06

- `ffe6609` Merge pull request #16 from shivamnamdev/visualiser **[merge]** — SHIVAM NAMDEV
- `fecac51` Update Practice section — shivamnamdev (5 files, +241/−134)

### 2026-05-03

- `f5b10ad` Merge pull request #15 from shivamnamdev/visualiser **[merge]** — SHIVAM NAMDEV
- `4a3f325` Visualiser added — shivamnamdev (1 files, +59/−9)
- `997cbfe` Discount code added — shivamnamdev (8 files, +252/−85)
- `45f8a14` Notification update — shivamnamdev (1 files, +9/−1)
- `44d3d2a` Main Page Update — shivamnamdev (1 files, +7/−8)

### 2026-05-02

- `9d00000` Added logo: — shivamnamdev (2 files, +9/−3)
- `f0805ce` Notificatino Button Fix — shivamnamdev (1 files, +36/−8)
- `fc04f03` Notificatino Button — shivamnamdev (2 files, +124/−7)
- `ecdcaa2` Update Ask AI Tutor Button — shivamnamdev (5 files, +188/−120)

### 2026-04-30

- `0560fa3` Merge pull request #14 from shivamnamdev/Assignment-submission **[merge]** — SHIVAM NAMDEV
- `e2a4ae4` joining link — shivamnamdev (6 files, +490/−9)
- `0b0e0a8` Merge pull request #13 from shivamnamdev/Assignment-submission **[merge]** — SHIVAM NAMDEV
- `a479334` Documentation and small fix — shivamnamdev (6 files, +272/−96)

### 2026-04-29

- `1c4d3b1` Merge pull request #12 from shivamnamdev/Video-Description-Q **[merge]** — SHIVAM NAMDEV
- `0922160` Update assignments — shivamnamdev (2 files, +204/−152)

### 2026-04-28

- `adbc5a7` Merge pull request #11 from shivamnamdev/Video-Description-Q **[merge]** — SHIVAM NAMDEV
- `6aa4f2a` Update international customer  payment method — shivamnamdev (8 files, +470/−210)
- `31a39b2` Merge pull request #10 from shivamnamdev/Video-Description-Q **[merge]** — SHIVAM NAMDEV
- `663b3f2` Added Description and comment section — shivamnamdev (2 files, +264/−84)
- `72c1693` Update new recording — shivamnamdev (2 files, +8/−8)

### 2026-04-27

- `71f0ca3` Merge pull request #9 from shivamnamdev/Payment **[merge]** — SHIVAM NAMDEV
- `54512e9` Update contact details — shivamnamdev (14 files, +415/−42)
- `72ef385` Merge pull request #8 from shivamnamdev/Payment **[merge]** — SHIVAM NAMDEV
- `6223dbe` User payed and jump to dashboard — shivamnamdev (3 files, +204/−56)

### 2026-04-26

- `cd29599` Merge pull request #7 from shivamnamdev/Course-Content **[merge]** — SHIVAM NAMDEV
- `bfb644e` Added razor pay as well — shivamnamdev (10 files, +640/−63)

### 2026-04-23

- `42fc2de` Merge pull request #6 from shivamnamdev/main **[merge]** **[not in main]** — SHIVAM NAMDEV

### 2026-04-22

- `4a5a25e` Merge pull request #5 from shivamnamdev/Multi-Page-Website **[merge]** — SHIVAM NAMDEV
- `c8e2173` User login and dashborard — shivamnamdev (6 files, +965/−25)

### 2026-04-21

- `09012b2` Merge pull request #4 from shivamnamdev/Multi-Page-Website **[merge]** — SHIVAM NAMDEV
- `734b6eb` Separate email setup for contact and mentorship — shivamnamdev (4 files, +237/−47)

### 2026-04-19

- `55e84f7` Merge pull request #3 from shivamnamdev/Multi-Page-Website **[merge]** — SHIVAM NAMDEV
- `11d39e8` Python Separate page deploying 2nd phase — shivamnamdev (5 files, +209/−192)

### 2026-04-18

- `68b2be5` Merge pull request #2 from shivamnamdev/Multi-Page-Website **[merge]** — SHIVAM NAMDEV
- `c176838` Python Separate page deploying — shivamnamdev (7 files, +173/−25)

### 2026-04-16

- `57cd35f` Revert to Light Theme and remove curriculum flyer image — shivamnamdev (6 files, +129/−75)
- `a2fa2d7` Merge pull request #1 from shivamnamdev/dark-theme-test **[merge]** — SHIVAM NAMDEV

### 2026-04-14

- `374b2e4` Switch to Dark Theme — shivamnamdev (14 files, +398/−161)

### 2026-04-08

- `5a3707a` UrgencyBanner Testimonials, and FAQs added — shivamnamdev (7 files, +181/−18)

### 2026-04-07

- `d1dbc5b` Fix Navbar EOF error and add dynamic Python cohort and HeroVSL Page — shivamnamdev (3 files, +16/−16)

### 2026-04-06

- `cfc49b8` Update with Python Session details — shivamnamdev (5 files, +171/−9)

### 2026-04-04

- `4d68426` Change the backround color and font color wherever required — shivamnamdev (8 files, +96/−107)

### 2026-04-03

- `6b4fa33` High-Converting Video Sales Letter (VSL) Funnel — shivamnamdev (7 files, +294/−22)
- `b674dcd` Updated the README.md file with build command details **[not in main]** — shivamnamdev (1 files, +32/−2)
- `5f8e88e` next.config.mjs file updated for npm run build command to generate the  out folder as per s3 bucket requirements **[not in main]** — shivamnamdev (1 files, +1/−0)

### 2026-04-01

- `67e3b47` Update about section in terminal — shivamnamdev (2 files, +48/−39)

### 2026-03-31

- `5a5a5c4` Improvise UI with Image and terminal box — shivamnamdev (10 files, +253/−116)
- `29d9f2b` UI Polish: Upgrade Typography, Glassmorphism, and Animations — shivamnamdev (4 files, +153/−75)

### 2026-03-30

- `3f9c928` Revert to 2nd implementation and fix Tailwind config — shivamnamdev (11 files, +241/−199)

### 2026-03-27

- `9e2729c` Fix Tailwind CSS directives for v3 compatibility — shivamnamdev (1 files, +4/−2)

### 2026-03-26

- `442180c` Change next config to mjs for Next 14 compatibility — shivamnamdev (2 files, +11/−14)
- `71b3b35` Updated the next.config.ts file — shivamnamdev (1 files, +8/−2)
- `3d5924f` Fix commit author email for Vercel — Shivam-Namdev
- `6450ab3` Fix lucide-react peer dependency — Shivam-Namdev (1 files, +878/−5885)
- `6c8015a` Updated the lucide-react to latest — Shivam-Namdev (1 files, +1/−1)
- `b24326b` Initial commit — Shivam-Namdev (17 files, +719/−112)

### 2026-03-25

- `3740792` Initial commit from Create Next App — Shivam-Namdev (19 files, +6922/−0)
