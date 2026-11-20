# Coupon codes out of the browser (SCP-53)

## Problem
`lib/pricing.ts` imported `data/coupons.ts` (the codes) and the checkout boxes imported `lib/pricing.ts`, so every code, its type and its value shipped in the public JavaScript of `/courses/*`. Checked on production on 2026-11-20: all four codes readable. `PORTAL_COUPONS=database` did not help, because the file was still bundled.

## Decision (owner approved 2026-11-20)
The browser never holds a coupon code, whatever the flag says.

- `lib/pricing.ts` keeps only price maths and the `Coupon` **type** (an explicit shape now, no longer `typeof activeCoupons`). `applyCoupon` stays, it takes a coupon object the server gave back.
- `lib/couponFiles.ts` (new, server only) holds `resolveCoupon` and the file codes. Used by `lib/catalog/commerce.ts` (`checkCoupon` in files mode), so `POST /api/coupons/check` and the order routes answer from the files exactly as before.
- `ActiveCohorts` and `CoursePricing` always call `POST /api/coupons/check` (`lib/couponClient.ts`). The `couponCheck` prop is gone. Texts and statuses are unchanged (`boxText`).
- API-docs examples use `SAMPLE20`, not a real code.

## Data shapes
`POST /api/coupons/check` request `{ courseId, planId?, currency, couponCode }` and reply `{ success, coupon }` or `{ success: false, error }` are unchanged (signed-in buyers only, 401 otherwise).

## Guards
`tests/unit/coupon-not-in-browser.spec.ts`: PRC-UNIT-020 (no `'use client'` file can reach `data/coupons.ts` or `lib/couponFiles.ts`), 021 (the walker sees a real chain), 022 (it catches a leak), 023 (no real code written in `app/` or `components/`). Production check: build, then search `.next*/static` for the codes (0 files expected).

## Consequences
A visitor must sign in to try a code (they already had to: "Please log in first to apply a coupon"). Codes that were public until now should be treated as known: rotate the ones still in use.
