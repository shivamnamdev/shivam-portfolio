# Plan: course links and coupons off the public JavaScript (SCP-45, SCP-53)

Status: **proposed, not approved. No code changed.** Date: 2026-11-04. Written so the owner can decide whether this is needed on its own or is covered by the admin Course Manager.

## 1. The problem today

| | SCP-45 links | SCP-53 coupons |
|---|---|---|
| What leaks | `whatsappLink` (3 courses) and `liveLink` in `data/courses.ts` | every code in `data/coupons.ts`: type, value, and for restricted coupons the **real Clerk ids** of the allowed learners |
| Why | `data/courses.ts` and `lib/pricing.ts` (which imports `data/coupons.ts`) are imported by client components, so webpack bundles them for every visitor | same |
| Client files involved | `components/ActiveCohorts.tsx` (post-purchase WhatsApp button, coupon box), `app/live/[slug]/page.tsx` and `app/learning/[slug]/page.tsx` (live link) | `components/ActiveCohorts.tsx` (`resolveCoupon`, `applyCoupon`) |
| Server files that already do it right | `app/api/verify-payment/route.ts` returns `whatsappLink` after the payment is verified, and e-mails it | `create-order`, `enroll-free` re-check the coupon on the server |
| Missing rules | none for links | no expiry date, no usage limit |

Impact: anyone can read the WhatsApp group and class links without enrolling (the "Secure Lobby" is only a screen) and can use `BIRTHDAY20`, `EXISTINGSTUDENT_BATCH03` and others without being a student, forever. The Clerk ids of the learners on `BATCH002` and `SHIVAMSPECIAL` are also public.

## 2. Is it covered by the Course Manager?

The branch `admin-course-manager` only adds a write route for `cms_courses`, `cms_curriculum` and `cms_coupons`. Nothing reads those tables yet, and they do not exist on production. So it **does not fix** SCP-45 or SCP-53 by itself. It does give the right place to keep the data: if the Course Manager stores links and coupons in the database and the app reads them **on the server only**, both tickets are closed as a side effect. If it stores them in the database but the pages still fetch the full row in the browser, the leak just moves.

**Recommendation:** treat this plan as the **requirements for the Course Manager** (section 5) and do the small interim split (section 4, stages 1 and 2) first, because it does not depend on the CMS and gives the CMS a stable contract to plug into: only the data source behind the routes changes later.

## 3. Target design

Public (may ship to the browser): course title, price, content, syllabus, `slug`, cohort dates. Private (server only): `whatsappLink`, `liveLink`, the coupon list and its rules, `allowedUsers`.

### Data shapes (define before coding, per the constitution)

```ts
// Server only: lib/courseSecrets.ts (later: table course_private)
type CoursePrivate = { slug: string; whatsappLink: string; liveLink: string };

// Server only: lib/coupons.server.ts (later: table coupons)
type Coupon = {
  code: string;                       // stored upper case
  discountType: 'percentage' | 'fixed';
  discountValue: number | { inr: number; usd: number };
  allowedUsers: string[];             // empty = anyone
  expiresAt: string | null;           // ISO date, null = never   (NEW, needs owner decision)
  maxRedemptions: number | null;      // null = unlimited          (NEW, needs owner decision)
  redemptions: number;                // counted when an order is paid or a free enrolment is created
};

// GET /api/learning/course-links?courseSlug=<slug>      (enrolled learner or admin; 401 / 403 otherwise)
type CourseLinksResponse = { success: true; whatsappLink: string; liveLink: string };

// POST /api/coupons/validate   body { courseId, currency, couponCode }   (signed in)
type CouponValidateResponse =
  | { success: true; code: string; discountType: string; finalPrice: number; display: string }   // only the result for this code
  | { success: false; error: 'Invalid coupon code' | 'This coupon is not available for your account' | 'This coupon has expired' | 'This coupon has been fully used' };
```

The validate route never lists coupons: a visitor learns about a coupon only by already knowing its code, and gets only the price for that code.

## 4. Stages (each its own branch and PR, lowest risk first)

| # | Stage | Change | Tests | Risk |
|---|---|---|---|---|
| 0 | Approval | Owner answers section 6 | none | none |
| 1 | Links to the server | New server-only `lib/courseSecrets.ts` holds the 3 links plus the QA fixture links; remove the fields from `data/courses.ts`; new route `GET /api/learning/course-links`; `app/live/[slug]` and `app/learning/[slug]` fetch the live link after the access check; `ActiveCohorts` takes the WhatsApp link from the `verify-payment` / `enroll-free` response (verify-payment already returns it, enroll-free must too) | new API tests: visitor 401, not enrolled 403, enrolled and admin 200; build output check (a test that fetches the built JS chunks and asserts no `chat.whatsapp.com` / `meet.google.com`); existing PRD 05/06/07 specs | medium: three screens change |
| 2 | Coupons to the server | `lib/pricing.ts` splits into a pure part (price maths, safe for the browser) and `lib/coupons.server.ts` (list and `resolveCoupon`); `create-order`, `enroll-free`, `verify-payment` import the server one; new `POST /api/coupons/validate`; `ActiveCohorts` calls it when the learner clicks Apply and shows the returned price | existing PRD 03/04/05/09/10 specs (coupon cases), new validate API tests, bundle check for `BIRTHDAY20` and a Clerk id | medium: the sales-page coupon box changes |
| 3 | Expiry and usage limit | Add `expiresAt`, `maxRedemptions`, `redemptions`; count a redemption exactly once per paid order or free enrolment (inside `grantEnrollment`, so retries do not double count); refuse expired or used-up codes in validate, create-order and enroll-free | new tests for expired, last use, two parallel uses | medium: needs a counter (SQL) once coupons live in the database |
| 4 | Plug in the Course Manager | The CMS writes `course_private` and `coupons`; the two modules from stages 1 and 2 read the tables instead of the files. No page or route changes | the same API tests, run again | low if stages 1 and 2 are done |

Rollback: each stage is one PR revert. Stage 3 adds a table: a rollback script goes with the SQL, run on QA first.

## 5. Requirements for the Course Manager (so it closes SCP-45 and SCP-53)

1. Links and coupons live in tables with RLS on and **no** anon or authenticated access; only server routes (service role) read them.
2. The admin write routes use `requireAdmin()` (401 visitor, 403 non-admin), with API tests for both (this is also SCP-40).
3. The public course read returns only public fields (a column list, never `select *`).
4. Pricing and coupon checks stay on the server (constitution section 6).
5. Anything admin-entered that reaches HTML or e-mail is escaped (the WhatsApp link is placed in the welcome e-mail).
6. Coupons carry `expiresAt`, `maxRedemptions` and a redemption counter from the start.
7. Existing learners keep their access: moving data must not change enrolments.

## 6. Decisions needed from the owner

1. **Expiry and usage limits:** which coupons expire, when, and how many uses each may have. (Not invented here: `NULL` means never / unlimited until you decide.)
2. **Restricted coupons:** `BATCH002` and `SHIVAMSPECIAL` list Clerk ids. Keep id lists, or switch to e-mail addresses (easier to maintain in the Course Manager)? Either way the list stays private.
3. **The leaked links:** the three WhatsApp group links are already public. If a group should be closed to non-students, **rotate the invite links** in WhatsApp now; this plan only stops further exposure.
4. **Order:** stages 1 and 2 now, then the Course Manager reads from the same modules (recommended), or wait and do everything in the Course Manager.
5. **Who sees the live link:** enrolled learners and the admin only (as in the ticket), or also a short window before the class?

## 7. Not in scope

SCP-39 (server-side page gating) is separate; it moves with the Next/Clerk upgrade (SCP-87). The Razorpay price floor (SCP-51) is separate.

## 8. Effort (estimates, not measured)

Stage 1 about 1 day, stage 2 about 1 day, stage 3 about 1 day plus the SQL run, stage 4 depends on the Course Manager.
