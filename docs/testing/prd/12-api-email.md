# **Product Requirements Document (PRD)**

**Product Name:** TM – Digital Learning Experience Platform  
**Feature:** \[API\] Email API Testing (`send-email`, the contact form)  
**Prepared By:** Shivam Namdev & Claude Code  
**Date:** Oct 30, 2026  
**Status:** PRD draft — written from the code

---

## 1. Feature Overview

`POST /api/send-email` (`app/api/send-email/route.ts`) is the endpoint behind the contact form. It is a public route (`middleware.ts`). It trims and limits the fields (name 100, email 254, subject 200, message 5000), refuses a malformed address, ignores a filled honeypot field (`website`), removes line breaks from the subject, escapes everything it puts in the HTML body and sends one e-mail **to the owner's own Gmail** (`to: GMAIL_USER`, `replyTo: <visitor address>`) with nodemailer.

Other e-mails of the product (welcome e-mail after a purchase, signup e-mails) are sent by `verify-payment` and the Clerk webhook and are covered in PRD 09 and PRD 11; this PRD owns the contact form and the shared sending rules.

## 2. Business Objectives

* A real enquiry reaches the owner, with a working reply address.
* The endpoint cannot be used to send mail to anyone else, to inject headers, or to flood the owner's inbox.
* A bot filling the hidden field is told it worked and costs nothing.

## 3. Scope

**In scope:** validation, honeypot, header-injection attempts, limits, method handling, abuse (rate limit), the one real send, e-mail content escaping (manual). **Out of scope:** the contact page UI (PRD 02), the welcome e-mails (PRD 09, 11), Gmail delivery itself.

## 4. Request / Response Model

| Request | Success | Refusals |
| --- | --- | --- |
| `POST {name, email, subject?, message?, website?}` | `200 {success:true, message:"Email sent successfully!"}` | `400 {success:false, error:"Please provide a valid email address."}` · `500 "Server Configuration Error: Missing Keys"` when `GMAIL_*` is empty · `500` on a send error |

## 5. Functional Requirements

| ID | Requirement |
| --- | --- |
| FR1 | Anyone may call it; no session needed. |
| FR2 | A filled `website` field returns the success answer and sends nothing. |
| FR3 | The address must match `x@y.z` after trimming; line breaks can never reach a header. |
| FR4 | Inputs are cut to their limits; the subject loses line breaks and defaults to "New Website Inquiry". |
| FR5 | Name, address, subject and message are HTML-escaped in the body. |
| FR6 | Only the owner receives the mail; the visitor is the `replyTo`. |
| FR7 | A burst of requests is slowed down (rate limit). |

## 6. Test Coverage Matrix

13 cases in [the workbook](../workbooks/%5BAPI%5D%20Email%20API%20Testing.xlsx) (ids `EMLA-…`) and [`cases/prd12-email-api.csv`](../cases/prd12-email-api.csv). Automation: `tests/api/email-api.spec.ts` (8 tests). Three content cases need to read the mailbox and stay manual.

## 7. Risks

| Risk | Note |
| --- | --- |
| R-EM-1 | No rate limit on a public route that sends real mail through the owner's Gmail: a script can fill the inbox and exhaust the Gmail quota. |
| R-EM-2 | Locally `GMAIL_USER` and `GMAIL_APP_PASSWORD` are empty, so the route answers `500`; the contact page then shows a failure (the symptom in SCP-35). |
| R-EM-3 | `verify-payment` and the Clerk webhook skip mail silently when the same variables are empty. A missing secret in a deployment would mean no welcome e-mails and no error visible to the learner. |

## 8. Weightage and Testability

Validation and injection 40% · abuse 25% · honeypot 15% · content and reply handling 20% (manual). The suite never sends real mail unless `E2E_SEND_REAL_EMAIL=1` is set; with `GMAIL_*` set it sends exactly one message with the subject `[QA-AUTOMATION] contact form`.

## 9. Definition of Done

Automated cases run on every pass; the rate-limit case keeps failing visibly until a limit exists (ticket); manual cases are executed by the owner with the checklist in the workbook; CHANGELOG line added.
