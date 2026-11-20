// lib/pricing.ts
// Shared pricing + coupon rules. Used by the checkout UI and re-run on the server,
// so the amount a buyer sees is exactly the amount the server charges.
// A coupon as checkout reads it (the server answers with this shape). The codes themselves never live in a module the browser imports (SCP-53).
export type Coupon = { code: string; discountType: string; discountValue: number | Record<string, number>; allowedUsers: string[] };
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

// The smallest amount a paid order can have, in rupees or dollars (SCP-51, owner's decision 2026-11-17): a coupon that takes a price above 0 below this
// charges this. A price of exactly 0 is a free enrolment (/api/enroll-free), not a paid order, so it stays 0.
export const MIN_CHARGE = 1;
export function minimumCharge(price: number): number {
  return price > 0 && price < MIN_CHARGE ? MIN_CHARGE : price;
}

export function formatPrice(amount: number, currency: CurrencyCode): string {
  const symbol = currency === "USD" ? "$" : "₹";
  return `${symbol}${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

export type PricingPlan = {
  id: string;
  name: string;
  subtitle?: string;
  price: string;
  originalPrice?: string;
  features: string[];
  isPopular?: boolean;
};

type PricedCourse = {
  pricing: { inr: { currentPrice: string }; usd?: { currentPrice: string } };
  pricingPlans?: PricingPlan[];
};

export type BasePriceResult =
  | { ok: true; amount: number; plan: PricingPlan | null }
  | { ok: false; error: string };

// Plan-based courses are priced from the chosen plan (INR only); other courses from `pricing`.
export function getBasePrice(course: PricedCourse, currency: CurrencyCode, planId?: string | null): BasePriceResult {
  if (course.pricingPlans && course.pricingPlans.length > 0) {
    const plan = course.pricingPlans.find((p) => p.id === planId);
    if (!plan) return { ok: false, error: "Please choose a valid plan" };
    if (currency !== "INR") return { ok: false, error: "This course is priced in INR only" };
    return { ok: true, amount: parsePrice(plan.price), plan };
  }
  const label = currency === "USD" ? course.pricing.usd?.currentPrice : course.pricing.inr.currentPrice;
  if (!label) return { ok: false, error: "This course is priced in INR only" };   // a portal cohort may have no USD price
  return { ok: true, amount: parsePrice(label), plan: null };
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
