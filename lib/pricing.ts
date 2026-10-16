// lib/pricing.ts
// Shared pricing + coupon rules. Used by the checkout UI and re-run on the server,
// so the amount a buyer sees is exactly the amount the server charges.
import { activeCoupons } from "@/data/coupons";

export type Coupon = (typeof activeCoupons)[number];
export type CurrencyCode = "INR" | "USD";

export function toCurrencyCode(value: unknown): CurrencyCode {
  return value === "USD" ? "USD" : "INR";
}

// "₹1,999" -> 1999, "$9.99" -> 9.99
export function parsePrice(label: string): number {
  const amount = Number.parseFloat(label.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(amount)) throw new Error(`Unparseable price: ${label}`);
  return amount;
}

// INR is charged in whole rupees, USD in cents.
export function roundForCurrency(amount: number, currency: CurrencyCode): number {
  return currency === "USD" ? Math.round(amount * 100) / 100 : Math.round(amount);
}

export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

export function formatPrice(amount: number, currency: CurrencyCode): string {
  const symbol = currency === "USD" ? "$" : "₹";
  return `${symbol}${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

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

export function applyCoupon(basePrice: number, coupon: Coupon | null, currency: CurrencyCode): number {
  let price = basePrice;
  if (coupon?.discountType === "percentage") {
    price = basePrice - basePrice * ((coupon.discountValue as number) / 100);
  } else if (coupon?.discountType === "fixed") {
    const fixed = coupon.discountValue as Record<string, number>;
    price = basePrice - (fixed[currency.toLowerCase()] || 0);
  }
  return Math.max(roundForCurrency(price, currency), 0);
}
