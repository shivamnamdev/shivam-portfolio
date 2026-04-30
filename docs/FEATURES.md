# Core Features & Capabilities

## 1. Authentication & Security
* **Tech Used:** Clerk, Next.js Middleware
* **What it does:** 
  * Allows students to sign up/login via Google or Email.
  * Completely locks down the `/learning` and `/admin` routes. If a user is not logged in, they are redirected to the homepage.
  * Hides/Shows the "Student Login" vs "My Dashboard" button dynamically.
* **What it doesn't do:** 
  * Role-based database authentication (Currently, Admin rights are hardcoded to `shivamnamdev.corp@gmail.com` in the UI).

## 2. Dynamic Course Sales Pages (VSL Funnel)
* **Tech Used:** Next.js Dynamic Routing (`/courses/[slug]`), JSON Data templating.
* **What it does:**
  * Automatically generates a beautiful sales page for any course added to `data/courses.ts`.
  * Features a Region Toggle (🇮🇳 INR / 🌎 USD) that dynamically updates prices.
  * Checks Supabase to see if the logged-in user already bought the course, changing the "Buy Now" button to "Go to Dashboard".
* **What it doesn't do:**
  * Apply discount coupon codes dynamically at checkout (Razorpay handles standard pricing right now).

## 3. Automated Payments & Fulfillment
* **Tech Used:** Razorpay SDK, Supabase, Node.js API (`/api/create-order` & `/api/verify-payment`).
* **What it does:**
  * Opens a secure payment overlay without leaving the website.
  * Cryptographically verifies the payment signature on the backend to prevent fraud.
  * Instantly inserts the user into the `user_enrollments` Supabase table upon success.
  * Automatically emails the student a beautifully formatted HTML receipt and welcome email via `nodemailer`.
* **What it doesn't do:**
  * Handle recurring subscriptions/EMIs (Currently set up for one-time payments).

## 4. The Interactive Learning Portal (LMS)
* **Tech Used:** YouTube API, Supabase, Framer Motion.
* **What it does:**
  * Automatically fetches official video titles and durations from YouTube API.
  * Replaces the video player with a "Coming Soon" screen if the course has no videos yet (Batch 2).
  * Tracks video progress dynamically (`video_progress` table) and updates the overall completion percentage bar.
* **What it doesn't do:**
  * Prevent students from skipping to the end of the video and clicking "Mark Complete" (Relying on the honor system).

## 5. In-Browser Python IDE & Assignments
* **Tech Used:** `@monaco-editor/react`, `Pyodide` (WebAssembly), GitHub Raw Fetching.
* **What it does:**
  * Fetches the assignment `.py` file directly from a GitHub repository.
  * Formats the fetched text securely into Python comments to prevent syntax errors.
  * Runs Python code **entirely in the student's browser** (Zero server costs, zero latency).
  * Saves student code submissions directly into the `assignment_progress` table in Supabase.
* **What it doesn't do:**
  * Auto-grade the code (It doesn't check if the output is "correct", it just executes whatever the student writes).

## 6. The Admin Portal (`/admin`)
* **Tech Used:** Supabase, Clerk, Next.js Hooks.
* **What it does:**
  * Allows the Admin to manually enroll students who paid via offline UPI.
  * Displays a real-time feed of recent student assignment submissions, including their Name, Email, Timestamp, and actual Python code.
* **What it doesn't do:**
  * It does not currently show Financial Data / Total Revenue (That is still viewed via the Razorpay Dashboard).