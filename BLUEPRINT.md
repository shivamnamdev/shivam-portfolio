# QA Automation Blueprint

## 1. PLATFORM ARCHITECTURE & TECH STACK

- **Framework**: Next.js 14 with App Router (`app/` directory).
- **Authentication**: Clerk Auth via `@clerk/nextjs` and middleware-protected routes.
- **Database**: Supabase via `lib/supabaseClient.ts`.
- **Payment Gateway**: Razorpay checkout integration with server-side order creation and payment verification.
- **Browser Python Runtime**: Pyodide loaded dynamically in `app/learning/[slug]/page.tsx`.
- **Editor**: Monaco Editor via `@monaco-editor/react` with custom Python completion support.
- **Email & Notifications**: Nodemailer for contact messages, welcome mails, and webhook-triggered notifications.
- **PDF Certificate**: `pdf-lib` to generate downloadable certificate PDFs.
- **Webhooks**: Clerk webhook verification using Svix in `/api/webhooks/clerk`.
- **Animation / UI Effects**: Framer Motion across the product experience.

## 2. AUTHENTICATION & ROLES

### User Roles
- **Unauthenticated visitor**: anonymous user browsing landing pages and public course sales pages.
- **Authenticated Clerk user**: signed-in user via Clerk.
- **Enrolled Student**: authenticated user with a matching record in Supabase `user_enrollments` for a course.
- **Admin**: hardcoded admin email `shivamnamdev.corp@gmail.com`.

### How Auth is Handled
- `middleware.ts` uses `authMiddleware` from Clerk and whitelists public routes.
- Public routes include root pages, course sales pages, `/share`, and API endpoints for checkout, verification, free enrollment, email, AI tutor, and user lookup.
- `/api/webhooks/clerk` is explicitly ignored by Clerk auth.
- Protected content includes `/learning`, `/admin`, `/live`, and any non-whitelisted routes.
- UI components also guard role access:
  - Admin-only access is enforced in `app/admin/page.tsx` and `app/learning/[slug]/page.tsx`.
  - Course access verification is performed before rendering learning content.

## 3. COMPLETE API INVENTORY

### `POST /api/create-order`
- File: `app/api/create-order/route.ts`
- Purpose: generate a Razorpay order for checkout.
- Required Headers:
  - `Content-Type: application/json`
  - `x-api-key` if no frontend `userId` is present.
- Expected Request JSON:
  - `courseId` (string)
  - `currency` (string, `INR` or `USD`)
  - `couponCode` (string, optional)
  - `userId` (string, optional)
- Expected Response Codes:
  - `200`: `{ success: true, order }`
  - `401`: unauthorized when missing `userId` and invalid `x-api-key`
  - `400`: invalid course or invalid coupon code
  - `403`: coupon not allowed for this user
  - `500`: Razorpay or server error

### `POST /api/verify-payment`
- File: `app/api/verify-payment/route.ts`
- Purpose: verify Razorpay payment signature, enroll the user, log admin activity, and optionally send email.
- Required Headers:
  - `Content-Type: application/json`
- Expected Request JSON:
  - `razorpay_order_id`
  - `razorpay_payment_id`
  - `razorpay_signature`
  - `userId`
  - `courseSlug`
  - `userEmail`
  - `userName`
  - `courseTitle`
  - `amountPaid`
  - `couponCode`
- Expected Response Codes:
  - `200`: success with payment verified
  - `400`: invalid payment signature
  - `500`: server or configuration error

### `POST /api/enroll-free`
- File: `app/api/enroll-free/route.ts`
- Purpose: bypass Razorpay for 100% discounted enrollments and insert enrollment record.
- Required Headers:
  - `Content-Type: application/json`
- Expected Request JSON:
  - `courseId`
  - `currency`
  - `couponCode`
  - `userId`
  - `courseSlug`
  - `userName`
  - `userEmail`
- Expected Response Codes:
  - `200`: success and free enrollment completed
  - `400`: invalid coupon or payment required when amount is not zero
  - `403`: coupon not authorized for user
  - `500`: server error

### `POST /api/ai-tutor`
- File: `app/api/ai-tutor/route.ts`
- Purpose: return AI tutor hint responses for Python or Git labs.
- Required Headers:
  - `Content-Type: application/json`
- Expected Request JSON:
  - `labType`
  - `code`
  - `assignment`
  - `output`
  - `gitContext`
- Expected Response Codes:
  - `200`: AI tutor message
  - `500`: server error

### `GET /api/get-all-users`
- File: `app/api/get-all-users/route.ts`
- Purpose: fetch Clerk users for admin CRM display.
- Required Headers: none
- Expected Request JSON: none
- Expected Response Codes:
  - `200`: `{ success: true, users: [...] }`
  - `500`: server error

### `POST /api/get-clerk-users`
- File: `app/api/get-clerk-users/route.ts`
- Purpose: look up Clerk user details by IDs.
- Required Headers:
  - `Content-Type: application/json`
- Expected Request JSON:
  - `userIds` (string[])
- Expected Response Codes:
  - `200`: `{ success: true, users: {...} }`
  - `500`: server error

### `POST /api/send-email`
- File: `app/api/send-email/route.ts`
- Purpose: send contact form email to the platform owner.
- Required Headers:
  - `Content-Type: application/json`
- Expected Request JSON:
  - `name`
  - `email`
  - `message`
  - `subject`
- Expected Response Codes:
  - `200`: success
  - `500`: missing Gmail config or sending failure

### `POST /api/webhooks/clerk`
- File: `app/api/webhooks/clerk/route.ts`
- Purpose: validate Clerk webhook, log signups to Supabase, and send emails.
- Required Headers:
  - `svix-id`
  - `svix-timestamp`
  - `svix-signature`
- Expected Request JSON: Clerk webhook payload
- Expected Response Codes:
  - `200`: success
  - `400`: invalid or missing Svix headers
  - `500`: missing webhook secret or server error

### `POST /api/generate-certificate`
- File: `app/api/generate-certificate/route.ts`
- Purpose: generate a PDF certificate for a student.
- Required Headers:
  - `Content-Type: application/json`
- Expected Request JSON:
  - `studentName`
  - `courseTitle`
- Expected Response Codes:
  - `200`: PDF bytes returned with `Content-Type: application/pdf`
  - `400`: missing data
  - `500`: server error

## 4. CORE USER JOURNEYS

### A. Checkout Flow
1. Open the course page at `/courses/[slug]`.
2. Confirm `ActiveCohorts` checkout section is visible.
3. Toggle currency using buttons:
   - `🇮🇳 India`
   - `🌎 International`
4. Enter coupon code in input and click `Apply`.
5. Validate coupon feedback text:
   - `Coupon applied successfully!`
   - `Invalid coupon code.`
   - `This coupon is restricted to specific accounts.`
6. Click the primary purchase button:
   - `Buy Now (INR)` or `Buy Now (USD)`.
7. Verify `POST /api/create-order` is called with the correct JSON.
8. Razorpay popup should open.
9. On successful payment, verify `POST /api/verify-payment`.
10. Confirm success modal appears with:
    - `Join WhatsApp Group`
    - `Go to Dashboard`
11. Click `Go to Dashboard` and confirm redirect to `/learning`.

### B. Free Enrollment Flow
1. Enter a coupon that reduces the final price to zero.
2. Confirm button text changes to `Enroll for Free`.
3. Click `Enroll for Free`.
4. Verify no Razorpay popup is opened.
5. Confirm `POST /api/enroll-free` is called with correct payload.
6. Confirm success UI modal appears and dashboard access is granted.

### C. Learning Lab Flow
1. Open `/learning` as an enrolled user.
2. Select a video from the playlist sidebar.
3. Ensure active video loads and description is visible.
4. Click `Practice` tab for assignment content.
5. Confirm code editor loads with `main.py` or multiple files.
6. Use AI tutor:
   - click `Ask AI`
   - verify response appears in AI assistant panel
7. Execute code:
   - click `Run`
   - verify output updates in the terminal panel
8. Submit assignment:
   - click `Submit` or `Submit Exam (x/5)` for exams
   - verify appropriate save/submit path
9. For Git labs, verify terminal command flow using `git status`, `git add`, `git commit -m`, and `Run`.

### D. Admin Flow
1. Open `/admin` as admin user.
2. Confirm the heading `Admin Command Center` is visible.
3. Verify tabs:
   - `User Directory (CRM)`
   - `Enrollments`
   - `Student Progress`
   - `Code Submissions`
   - `Engagement ⏱️`
4. Confirm the CRM list loads via `GET /api/get-all-users`.
5. Enter a Clerk user ID and click `Grant Access`.
6. Verify success message `Access Granted Successfully!`.
7. Confirm user enrollment is added to Supabase and admin activity log is created.
8. Verify `View Code` opens the code modal with assignment content.

## 5. KEY UI SELECTORS & LOCATORS

### Global / Navigation
- `Home`
- `Courses`
- `About`
- `Contact`
- `Log In`
- `Dashboard`
- `My Dashboard`

### Course Sales / Checkout
- `View Course Details`
- `Apply`
- `Buy Now (INR)`
- `Buy Now (USD)`
- `Enroll for Free`
- `Join WhatsApp Group`
- `Go to Dashboard`
- `Coupon applied successfully!`
- `Invalid coupon code.`
- `This coupon is restricted to specific accounts.`

### Learning / Lab
- `Details`
- `Q&A`
- `Practice`
- `Visualize`
- `Materials`
- `Ask AI`
- `Run`
- `Submit`
- `Update`
- `Submit Exam`
- `Expected Outcome`
- `View Solution`
- `Prev`
- `Next`
- `Post Question`
- Terminal placeholder: `shivam@academy:~$ _`
- `Join WhatsApp Group` (post-payment modal)
- `Certificate`

### Admin
- `Admin Command Center`
- `User Directory (CRM)`
- `Enrollments`
- `Student Progress`
- `Code Submissions`
- `Engagement ⏱️`
- `Grant Access`
- `Access Granted Successfully!`
- `Please enter a valid Clerk User ID.`
- `Student is already enrolled!`
- `View Code`

### Dashboard
- `Welcome back,`
- `My Enrolled Courses`
- `No courses yet!`
- `Browse Catalog`
- `Join Live Class`
- `View Recordings`

## 6. TIERED TEST CASE STRATEGY

### CRITICAL (P0)
- Payment flows: `/api/create-order`, Razorpay checkout, `/api/verify-payment`.
- Authentication: Clerk auth, protected middleware routes, admin gating.
- Enrollment writing: Supabase `user_enrollments` inserts.
- Code execution: Pyodide run flow and terminal output.

### MAJOR (P1)
- Coupon validation and restricted coupon behavior.
- Video progression and playlist selection.
- AI Tutor response flow.
- Admin CRM and manual enrollment/backdoor access.

### MINOR (P2)
- Dashboard rendering and enrolled course card UI.
- Gamification: streak/points leaderboard.
- Certificate generation endpoint and UI trigger.

### TRIVIAL (P3)
- Animations, hover effects, and visual transitions.
- Notification bell open/close.
- Mobile menu toggle and layout polishing.
- UI theme/fade effects.
