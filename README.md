# Shivam Academy & Portfolio 🚀

A high-converting, enterprise-grade EdTech platform and personal portfolio built for Shivam Namdev. It features a Video Sales Letter (VSL) funnel, an interactive Python Learning Management System (LMS), secure payments, and a backdoor admin portal.

## 🛠 Tech Stack Overview
* **Framework:** Next.js 14 (App Router) + React + TypeScript
* **Styling & UI:** Tailwind CSS, Framer Motion, Lucide React (Icons)
* **Authentication:** Clerk
* **Database & BaaS:** Supabase (PostgreSQL)
* **Payment Gateway:** Razorpay (Dual Currency: INR/USD)
* **Emails:** Custom API using `nodemailer` (Gmail SMTP)
* **Video Hosting:** YouTube (Unlisted Embedded Iframes)
* **Interactive IDE:** `@monaco-editor/react` (VS Code) + Pyodide (In-Browser WebAssembly Python)
* **Assignment Management:** Raw GitHub File Fetching

## 🔑 Environment Variables Required (`.env.local`)
To run this project, you need the following keys:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY` (Auth)
- `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Database)
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` (Payments)
- `NEXT_PUBLIC_YOUTUBE_API_KEY` (Video Meta-data Fetching)
- `GMAIL_USER` & `GMAIL_APP_PASSWORD` (Automated Emails)