// Browser side of the coupon check when PORTAL_COUPONS=database: asks the server (the codes never reach the page). Same refusal texts as the order routes.
import type { Coupon } from "@/lib/pricing";

export type CouponCheck = { ok: true; coupon: Coupon } | { ok: false; status: number; error: string };

// The coupon box keeps the site's existing wording for the two common refusals; any other server text (expired, wrong plan, used...) is shown as it is.
export function boxText(status: number, serverText: unknown): string {
  if (status === 403) return "This coupon is restricted to specific accounts.";
  if (serverText === "Invalid coupon code") return "Invalid coupon code.";
  return typeof serverText === "string" && serverText ? serverText : "Could not check the coupon. Please try again.";
}

export async function checkCouponOnServer(body: { courseId: string; planId?: string; currency: string; couponCode: string }): Promise<CouponCheck> {
  try {
    const res = await fetch("/api/coupons/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.success && data.coupon) return { ok: true, coupon: data.coupon as Coupon };
    return { ok: false, status: res.status, error: boxText(res.status, data?.error) };
  } catch {
    return { ok: false, status: 0, error: "Could not check the coupon. Please check your connection." };
  }
}
