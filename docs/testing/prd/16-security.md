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
| Headers | Production sends only `Strict-Transport-Security` (Vercel). No `Content-Security-Policy`, no clickjacking protection, no `nosniff`, no `Referrer-Policy`, no `Permissions-Policy`; `X-Powered-By: Next.js` is announced | Defect, fixed 2026-11-03 in `next.config.mjs`: frame, nosniff, referrer and permissions headers enforced, `X-Powered-By` removed, CSP in report-only mode (switch to enforcing after a clean run with no console violations). `SEC-HDR-001` to `006` pass |
| Dependencies | `npm audit --omit=dev`: 24 advisories (2 critical: `next`, `dompurify` through `swagger-ui-react`; 15 high: `@clerk/*`, `nodemailer`, `postcss` and others) | Defect, `SEC-DEP-001` to `003` (manual / CI) |
| Injection | Q&A text is rendered as React text (escaped); the only `dangerouslySetInnerHTML` is the share page redirect, whose target comes from a fixed catalogue | Pass (`SEC-XSS-001`, `002`, `003`) |
| Exposure | `.env`, `.git`, `package.json` not served; broken input to public routes shows no stack trace; `/api-docs` needs sign-in | Pass (`SEC-EXP-001` to `003`) |
| API access | Every API route outside the public list refuses a visitor | Pass (`SEC-AUTH-001`) |
| Public routes | `/api/send-email` and `/api/ai-tutor` are public and unlimited (SCP-69, SCP-70, already ticketed) | Open |

Upgrading `next` (14 to 16) and `@clerk/nextjs` (4 to 7) are breaking changes with their own risk: they need their own plan and the full regression run, not a quick `npm audit fix --force`.

## 5. Test Cases

`docs/testing/cases/prd16-security.csv` (22 cases). Automated: `tests/api/security-baseline.spec.ts` and `tests/ui/learning/learning-xss.spec.ts`. Manual or CI: `SEC-HDR-007` (production header), `SEC-EXP-004` (source maps), `SEC-XSS-004` (e-mail escaping), `SEC-DEP-001` to `003` (`npm audit`), `SEC-SEC-001`, `SEC-SEC-002`.

## 6. Definition of Done

All cases automated or assigned; header defects fixed through `next.config.mjs` and re-tested; critical advisories planned; results in `docs/testing/runs/`.
