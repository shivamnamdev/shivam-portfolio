# **Product Requirements Document (PRD)**

**Product Name:** TM – Digital Learning Experience Platform  
**Feature:** \[SEC\] Security Baseline Testing  
**Prepared By:** Shivam Namdev & Claude Code  
**Date:** Nov 3, 2026  
**Status:** PRD draft — first baseline; written from the response headers of production, `npm audit`, and the rendering code of user text

---

## 1. Feature Overview

The platform takes money (Razorpay), personal data (names, e-mails, submitted code) and user text (Q&A questions), and runs learner code on the server (exam grading). This PRD covers the controls that sit around the application: response headers, exposed files, error leaks, injection into user text, API access without a session, and vulnerable dependencies. Access control for data is in PRD 14, payments in PRD 09, and the exam sandbox in `tests/api/exam-grading-api.spec.ts`.

## 2. Business Objectives

* No visitor can read a secret, a source file or a stack trace.
* A learner's text can never run as code in another learner's browser.
* Browsers are told to refuse framing, sniffing and unneeded permissions.
* No critical advisory stays open in a dependency that ships to production.

## 3. Scope

**In scope:** headers, exposed paths, error answers, Q&A and share-link injection, the visitor sweep over every API route, `npm audit`. **Out of scope:** penetration testing of Clerk, Razorpay and Supabase themselves, DDoS, and the grader's printed-text weakness (follow-up task).

## 4. What was found (2026-11-03)

| Area | Finding | State |
| --- | --- | --- |
| Headers | Production sends only `Strict-Transport-Security` (Vercel). No `Content-Security-Policy`, no clickjacking protection, no `nosniff`, no `Referrer-Policy`, no `Permissions-Policy`; `X-Powered-By: Next.js` is announced | Defect, fixed 2026-11-03 in `next.config.mjs`: frame, nosniff, referrer and permissions headers enforced, `X-Powered-By` removed, CSP in report-only mode (switch to enforcing after a clean run with no console violations). `SEC-HDR-001` to `006` pass (SCP-86) |
| Dependencies | `npm audit --omit=dev`: 24 advisories on 2026-11-03 (2 critical, 15 high). After SCP-87 (2026-11-13): 6 advisories, 4 moderate and 2 low, none critical or high; left are the `swagger-ui-react` tree, `minimatch`, `baseline-browser-mapping` (no non-breaking fix) | Fixed for critical and high (SCP-87, `docs/architecture/dependency-upgrade-plan.md` section 8); `SEC-DEP-001` to `003` stay manual / CI |
| Injection | Q&A text is rendered as React text (escaped); the only `dangerouslySetInnerHTML` is the share page redirect, whose target comes from a fixed catalogue | Pass (`SEC-XSS-001`, `002`, `003`) |
| Exposure | `.env`, `.git`, `package.json` not served; broken input to public routes shows no stack trace; `/api-docs` needs sign-in | Pass (`SEC-EXP-001` to `003`) |
| API access | Every API route outside the public list refuses a visitor | Pass (`SEC-AUTH-001`) |
| Public routes | `/api/send-email` is public and unlimited (SCP-69, open). `/api/ai-tutor` now needs a signed-in learner (SCP-70, fixed 2026-11-03) | Partly open |

Upgrading `next` (14 to 16) and `@clerk/nextjs` (4 to 7) were breaking changes with their own risk; they were done in six staged PRs with a full regression run each (SCP-87, runs of 2026-11-10, 2026-11-12, 2026-11-13), not with `npm audit fix --force`. The Clerk 7 run found a real regression (the API matcher caught `/api-docs`), which `SCP-29` caught.

## 5. Test Cases

`docs/testing/cases/prd16-security.csv` (22 cases). Automated: `tests/api/security-baseline.spec.ts` and `tests/ui/learning/learning-xss.spec.ts`. Manual or CI: `SEC-HDR-007` (production header), `SEC-EXP-004` (source maps), `SEC-XSS-004` (e-mail escaping), `SEC-DEP-001` to `003` (`npm audit`), `SEC-SEC-001`, `SEC-SEC-002`.

## 6. Definition of Done

All cases automated or assigned; header defects fixed through `next.config.mjs` and re-tested; critical advisories planned; results in `docs/testing/runs/`.
