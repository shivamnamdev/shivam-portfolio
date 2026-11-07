// lib/catalog/couponRules.ts
// Pure coupon rules for PORTAL_COUPONS=database (slice 5d): one coupon row from the admin portal's `coupons` table, one buyer and one price in,
// either the coupon in the shape checkout already uses (`Coupon` of lib/pricing.ts) or the refusal. No database, no network, no clock but `now`.
// Messages and statuses keep the contract of the file-based rules (400 "Invalid coupon code", 403 "This coupon is not valid for your account.").
import { amountIsAllowed, discountedAmount, type Discount, type PayCurrency } from "@/lib/adminApi/payMinimum";
import type { Coupon } from "@/lib/pricing";

export type CouponRow = {
  code: string; kind: "everyone" | "selected" | "single-use"; discount: Discount; expires_at: string; active: boolean; user_ids: string[];
  applies_to: { cohortSlugs?: string[]; planIds?: string[] } | null; max_redemptions: number | null; redemptions: number;
  reserved_by: string | null; reserved_until: string | null; redeemed_by: string | null; redeemed_at: string | null;
};
export type CouponContext = { userId: string; cohortSlug: string; planId: string | null; currency: PayCurrency; basePrice: number; now?: number };
export type CouponVerdict = { ok: true; coupon: Coupon; kind: CouponRow["kind"] } | { ok: false; status: 400 | 403; error: string };

export const MESSAGES = {
  invalid: "Invalid coupon code",
  notYours: "This coupon is not valid for your account.",
  expired: "This coupon has expired.",
  wrongCourse: "This coupon does not apply to this course.",
  wrongPlan: "This coupon does not apply to this plan.",
  fullyUsed: "This coupon has been fully used.",
  alreadyUsed: "This coupon has already been used.",
  busy: "This coupon is being used right now. Try again in a few minutes.",
  priceTooLow: "This coupon cannot be applied to this price.",
} as const;

const refuse = (status: 400 | 403, error: string): CouponVerdict => ({ ok: false, status, error });

// The portal's discount in the shape the checkout code (applyCoupon) reads: a fixed discount lacking a currency takes nothing off in that currency.
export function toCheckoutCoupon(row: Pick<CouponRow, "code" | "discount" | "user_ids">): Coupon {
  const d = row.discount;
  return (d.type === "percentage"
    ? { code: row.code, discountType: "percentage", discountValue: d.percent, allowedUsers: [] }
    : { code: row.code, discountType: "fixed", discountValue: { inr: d.inr ?? 0, usd: d.usd ?? 0 }, allowedUsers: [] }) as Coupon;
}

export function evaluateCoupon(row: CouponRow | null | undefined, ctx: CouponContext): CouponVerdict {
  const now = ctx.now ?? Date.now();
  if (!row) return refuse(400, MESSAGES.invalid);
  if (row.kind === "single-use" && row.redeemed_at) return refuse(400, MESSAGES.alreadyUsed);
  if (!row.active) return refuse(400, MESSAGES.invalid);   // switched off or voided: the same answer as a code that never existed
  if (Date.parse(row.expires_at) <= now) return refuse(400, MESSAGES.expired);
  if (row.kind === "selected" && !row.user_ids.includes(ctx.userId)) return refuse(403, MESSAGES.notYours);
  const scope = row.applies_to;
  if (scope?.cohortSlugs?.length && !scope.cohortSlugs.includes(ctx.cohortSlug)) return refuse(400, MESSAGES.wrongCourse);
  if (scope?.planIds?.length && (!ctx.planId || !scope.planIds.includes(ctx.planId))) return refuse(400, MESSAGES.wrongPlan);
  if (row.kind !== "single-use" && row.max_redemptions !== null && row.redemptions >= row.max_redemptions) return refuse(400, MESSAGES.fullyUsed);
  if (row.kind === "single-use" && row.reserved_by && row.reserved_by !== ctx.userId && row.reserved_until && Date.parse(row.reserved_until) > now) return refuse(400, MESSAGES.busy);
  // Saved discounts are checked against the prices when the admin saves them; prices can change later, so the floor is re-checked here.
  if (!amountIsAllowed(discountedAmount(ctx.basePrice, row.discount, ctx.currency), ctx.currency)) return refuse(400, MESSAGES.priceTooLow);
  return { ok: true, coupon: toCheckoutCoupon(row), kind: row.kind };
}
