# 🚀 Shivam Academy | EdTech Platform & LMS

A high-converting, enterprise-grade EdTech platform built for Shivam Namdev. It features a complete Video Sales Letter (VSL) funnel, an interactive Python Learning Management System (LMS) with in-browser execution, secure payments, AI-assisted tutoring, and a fully functional CRM/Admin portal.

## 🛠 Tech Stack Overview

* **Framework:** Next.js 14 (App Router) + React + TypeScript
* **Styling:** Tailwind CSS, Framer Motion, Lucide React (Icons)
* **Authentication:** Clerk
* **Database & BaaS:** Supabase (PostgreSQL)
* **Payment Gateway:** Razorpay (Dual Currency: INR/USD)
* **Emails:** Custom API using `nodemailer` (Gmail SMTP)
* **Video Hosting:** YouTube (Unlisted Embedded Iframes)
* **Interactive IDE:** `@monaco-editor/react` (VS Code engine) 
* **Code Execution:** `Pyodide` (In-Browser WebAssembly Python)
* **AI Integration:** OpenAI API (`gpt-4o-mini`)
* **Code Visualizer:** PythonTutor (Iframe with custom CSS blend modes)

---

## 🌟 Core Features & Modules

### 1. Marketing & Sales Funnel
* **Dynamic Course Pages:** Automatically generates high-converting sales pages (`/courses/[slug]`) based on JSON data.
* **Dual Pricing & Coupons:** Toggle between 🇮🇳 INR and 🌎 USD. Real-time coupon validation with percentage or fixed discounts.
* **100% Free Enrollment Bypass:** If a coupon reduces the price to 0, the system intelligently bypasses Razorpay and enrolls the user instantly.
* **Lead Generation:** Integrated "Cheat Sheet" capture form linked directly to the custom email API.
* **SEO & OpenGraph:** Fully optimized metadata for rich link previews on LinkedIn and WhatsApp.
* **Floating WhatsApp Widget:** Animated, pulse-effect widget for direct sales inquiries.

### 2. User Authentication & Security
* **Clerk Integration:** Google OAuth & Email/Password login.
* **Middleware Protection:** Locks down `/learning`, `/admin`, and `/live` routes. Unauthenticated users are securely redirected to the homepage.
* **Webhooks:** Secure Clerk webhook (`/api/webhooks/clerk`) catches new signups, alerts the Admin, and sends an automated HTML welcome email to the student.

### 3. The Interactive Learning Dashboard (LMS)
* **Gamification:** Daily streak tracker (🔥) and Global Top 5 Leaderboard based on XP points. (Test accounts filtered out by email).
* **Progress Tracking:** Dynamic progress bars based on Video Views (10 XP) and Assignment Submissions (50 XP).
* **Automated Certificates:** Generates a personalized, downloadable PDF Certificate via `jspdf` upon 100% course completion.
* **Secure Live Lobby:** A protected gateway (`/live/[slug]`) verifying course access before revealing private Google Meet links.

### 4. The "KodeKloud" Style Practice Lab
* **Multi-Step Assignments:** Automatically fetches Markdown instructions from GitHub and parses them into paginated steps.
* **In-Browser Python Execution:** Uses Pyodide to run Python entirely in the browser (Zero server cost/latency). Supports overriding `input()` to use native browser prompts.
* **Virtual File System (VFS):** Supports creating, editing, and deleting multiple files (e.g., `main.py`, `utils.py`, `data.csv`) simultaneously.
* **Automated Grading:** Runs hidden `assert` tests against the student's code to automatically verify the output.
* **Code Visualizer:** Embedded PythonTutor visualizer to step through memory execution line-by-line.
* **Master Solution Comparison:** "View Solution" opens a dark-mode modal comparing the student's code side-by-side with the Instructor's official GitHub solution.

### 5. AI Code Tutor
* **Context-Aware Assistance:** A secure backend route (`/api/ai-tutor`) connects to OpenAI.
* **Prompt Engineering:** Instructed to act as a "Senior QA Lead," providing subtle hints based on the student's exact code, the specific assignment, and the terminal error without giving away the final answer.

### 6. Admin Command Center (`/admin`)
* **Security Clearance:** Hardcoded to lock out anyone except the authorized Admin email.
* **Live Analytics:** KPI cards displaying Total Leads, Total Enrollments, and Coupon Usage.
* **Built-in CRM:** Fetches the complete user directory directly from the Clerk backend API.
* **Cross-Referenced Tables:** Displays Enrollments, Student Progress, and Code Submissions with real names, emails, and profile pictures.
* **Code Reviewer:** Admin can click "View Code" to open an embedded Monaco Editor showing the student's submitted assignment.
* **Backdoor Enrollment:** Allows the Admin to manually bypass Razorpay and grant access using a Clerk User ID.
* **Global Activity Logs:** A persistent notification bell tracking Signups, Enrollments, and Code Submissions in real-time.

---

## 🗄 Database Architecture (Supabase)

* `user_enrollments`: Tracks `user_id`, `course_slug`, `coupon_used`, `user_name`, `user_email`.
* `video_progress`: Tracks which `video_id` a student has completed.
* `assignment_progress`: Tracks submitted Python code per `video_id`.
* `video_comments`: Global Q&A discussion board entries.
* `user_stats`: Gamification data (`current_streak`, `total_points`, `last_active_date`).
* `admin_activity_log`: Triggers notifications for the Admin bell.

---

## 🧪 Testing & QA Status (Upcoming)
* **E2E Testing:** Playwright (Pending Implementation)
* **API Testing:** Playwright (Pending Implementation)
* **Target Flows:** User Authentication, Checkout/Coupon bypass, IDE execution, Admin Backend routes.