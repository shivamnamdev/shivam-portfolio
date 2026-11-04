// lib/adminApi/payMinimum.ts
// Owner decision Q7 (2026-11-04): a price, or the result of a discount, that is above zero and below the payment minimum is refused
// when it is saved, so no learner can ever hit it. The server's one-unit floor in create-order stays as the last guard (SCP-51).
// The minimum is one major unit of the currency (1 rupee, 1 dollar), the same floor create-order applies today.
export const PAYMENT_MINIMUM_MAJOR = { INR: 1, USD: 1 } as const;
export type PayCurrency = keyof typeof PAYMENT_MINIMUM_MAJOR;

// true when the amount can be charged (zero goes through free enrolment, anything else must reach the minimum).
export function amountIsAllowed(amountMajor: number, currency: PayCurrency): boolean {
  if (!Number.isFinite(amountMajor) || amountMajor < 0) return false;
  return amountMajor === 0 || amountMajor >= PAYMENT_MINIMUM_MAJOR[currency];
}

// Price after a coupon, in major units, rounded to 2 decimals and never below zero. Same arithmetic as create-order (percentage or fixed per currency).
export type Discount = { type: "percentage"; percent: number } | { type: "fixed"; inr?: number; usd?: number };
export function discountedAmount(price: number, discount: Discount, currency: PayCurrency): number {
  const off = discount.type === "percentage" ? (price * discount.percent) / 100 : (currency === "INR" ? discount.inr : discount.usd) ?? 0;
  return Math.max(0, Math.round((price - off) * 100) / 100);
}
