@workspace Act as a Senior QA Automation Architect. We are transitioning this Next.js EdTech repository to an automated testing pipeline using Playwright (JS/TS). 

Before writing code, I need you to scan this entire repository and generate a comprehensive "Test Automation Blueprint" document formatted in Markdown. This document will serve as the master context file for another AI model to generate our Playwright API and UI test scripts.

Please scan the `app/`, `components/`, `data/`, and `lib/` directories and generate a document containing the following sections:

1. PLATFORM ARCHITECTURE & TECH STACK
- Briefly summarize the stack (Next.js 14 App Router, Clerk Auth, Supabase DB, Razorpay, Pyodide, Monaco Editor).

2. AUTHENTICATION & ROLES
- Define the user roles present in the code (e.g., Unauthenticated, Enrolled Student, Admin with email 'shivamnamdev.corp@gmail.com').
- Note how authentication is handled in the middleware and UI.

3. COMPLETE API INVENTORY (For Playwright API Testing)
- Scan `app/api/` and list every endpoint.
- For each endpoint, provide: Method (GET/POST), Required Headers (e.g., x-api-key, Clerk session), Expected JSON Payload, and Expected Response Status Codes (Success & Error cases).

4. CORE USER JOURNEYS (For Playwright UI Testing)
- Map out the step-by-step UI flow for the following Critical paths:
  A. The Checkout Flow (Clicking "Buy Now", toggling INR/USD, applying a Coupon, Razorpay popup, and redirect to `/learning`).
  B. The Free Enrollment Flow (Applying a 100% coupon and bypassing Razorpay).
  C. The Learning Lab Flow (Opening a video, switching to the "Practice" tab, running Pyodide code, and clicking "Submit").
  D. The Admin Flow (Visiting `/admin`, viewing the CRM, and granting Backdoor access).

5. KEY UI SELECTORS & LOCATORS
- Scan the components (especially `HeroVSL.tsx`, `ActiveCohorts.tsx`, and `app/learning/[slug]/page.tsx`) and extract the exact text of important buttons, inputs, and headings (e.g., "Student Login", "Enroll for Free", "Ask AI Tutor", "Run Code", "Claim Certificate"). This will help Playwright use `getByRole` and `getByText`.

6. TIERED TEST CASE STRATEGY
- Categorize the identified test cases into 4 tiers:
  * CRITICAL (P0): Payments, Database writes, Login, and Code Execution.
  * MAJOR (P1): Coupon validation, Video progression, AI Tutor responses.
  * MINOR (P2): Dashboard UI rendering, Gamification (streaks/points), Certificate Generation.
  * TRIVIAL (P3): Dark mode toggles, animations, hover sounds.

Please output this entire response in raw Markdown format so I can save it as `QA_BLUEPRINT.md`.