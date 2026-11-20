// lib/couponFiles.ts
// The coupon codes of data/coupons.ts and the rules that match one. SERVER ONLY: never import this file (or data/coupons.ts) from a browser
// component, or every code is shipped in the public JavaScript (SCP-53). The browser asks POST /api/coupons/check instead; this file answers
// for that route and the order routes when PORTAL_COUPONS is not "database". tests/unit/coupon-not-in-browser.spec.ts guards the import graph.
import { activeCoupons } from "@/data/coupons";
import type { Coupon } from "@/lib/pricing";

export type CouponResult =
  | { ok: true; coupon: Coupon | null }
  | { ok: false; status: 400 | 403; error: string };

// Messages are part of the API contract (asserted by tests/api).
export function resolveCoupon(code: string | null | undefined, userId: string | null | undefined): CouponResult {
  if (!code) return { ok: true, coupon: null };
  const coupon = activeCoupons.find((c) => c.code.toUpperCase() === code.trim().toUpperCase());
  if (!coupon) return { ok: false, status: 400, error: "Invalid coupon code" };
  if (coupon.allowedUsers.length > 0 && (!userId || !coupon.allowedUsers.includes(userId))) {
    return { ok: false, status: 403, error: "This coupon is not valid for your account." };
  }
  return { ok: true, coupon };
}

