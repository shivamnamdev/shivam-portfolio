// app/api/coupons/check/route.ts
// Coupon check for the checkout screens when PORTAL_COUPONS=database (the codes then live in the database and never reach the browser).
// Signed-in buyers only: the code is checked for THIS account. It does not hold a one-time code (create-order does); it answers
// { success, coupon } in the shape checkout already uses, or the same refusal text and status the order routes give.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getBasePrice, toCurrencyCode } from "@/lib/pricing";
import { checkCoupon, getSellable } from "@/lib/catalog/commerce";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const { courseId, planId, currency: rawCurrency, couponCode } = body as Record<string, unknown>;
    if (typeof couponCode !== "string" || !couponCode.trim() || couponCode.length > 60) return NextResponse.json({ success: false, error: "Invalid coupon code" }, { status: 400 });

    const { course, source } = await getSellable(String(courseId ?? ""));
    if (!course) return NextResponse.json({ success: false, error: "Course not found" }, { status: 400 });
    const currency = toCurrencyCode(rawCurrency);
    const base = getBasePrice(course, currency, typeof planId === "string" ? planId : null);
    const verdict = await checkCoupon(source, {
      code: couponCode, userId, cohortSlug: course.slug, planId: base.ok ? base.plan?.id ?? null : null, currency, basePrice: base.ok ? base.amount : 0,
    });
    if (!verdict.ok) return NextResponse.json({ success: false, error: verdict.error }, { status: verdict.status });
    return NextResponse.json({ success: true, coupon: verdict.coupon }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Coupon check error:", error);
    return NextResponse.json({ success: false, error: "Could not check the coupon. Please try again." }, { status: 500 });
  }
}
