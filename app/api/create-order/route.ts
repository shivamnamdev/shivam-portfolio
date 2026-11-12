// app/api/create-order/route.ts
import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { auth } from "@clerk/nextjs/server";
import { applyCoupon, getBasePrice, toCurrencyCode, toMinorUnits } from "@/lib/pricing";
import { checkCoupon, getSellable, holdCoupon, settleCoupon } from "@/lib/catalog/commerce";

// Playwright API tests authenticate with x-api-key instead of a Clerk session.
// The bypass is disabled in production so it can never be used against live payments.
function isTestApiKey(req: NextRequest): boolean {
  const expected = process.env.ADMIN_API_KEY;
  return process.env.NODE_ENV !== "production" && !!expected && req.headers.get("x-api-key") === expected;
}

export async function POST(req: NextRequest) {
  try {
    const { courseId, planId, currency: rawCurrency, couponCode } = await req.json();

    // 1. SECURITY CHECK: identity comes from the Clerk session, never from the request body.
    const { userId: sessionUserId } = await auth();
    const userId = sessionUserId ?? (isTestApiKey(req) ? "api-test-user" : null);
    if (!userId) {
      return NextResponse.json({ success: false, error: "401 Unauthorized: Invalid Request" }, { status: 401 });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ success: false, error: "Missing Keys" }, { status: 500 });
    }

    const { course, source } = await getSellable(String(courseId ?? ""));
    if (!course) return NextResponse.json({ success: false, error: "Course not found" }, { status: 400 });
    if (course.enrollmentClosed) {
      return NextResponse.json({ success: false, error: "Enrollment is closed for this course" }, { status: 400 });
    }

    const currency = toCurrencyCode(rawCurrency);
    // The base price comes first because a portal coupon is checked against it (scope, plan, payment minimum); a coupon refusal still wins over a price refusal.
    const base = getBasePrice(course, currency, planId);
    const couponResult = await checkCoupon(source, {
      code: couponCode, userId, cohortSlug: course.slug, planId: base.ok ? base.plan?.id ?? null : null, currency, basePrice: base.ok ? base.amount : 0,
    });
    if (!couponResult.ok) {
      return NextResponse.json({ success: false, error: couponResult.error }, { status: couponResult.status });
    }
    if (!base.ok) return NextResponse.json({ success: false, error: base.error }, { status: 400 });
    const hold = await holdCoupon(couponResult, userId);   // a one-time code is held for this buyer while they pay
    if (!hold.ok) return NextResponse.json({ success: false, error: hold.error }, { status: hold.status });
    const basePrice = base.amount;
    // Free (100% off) checkouts go through /api/enroll-free; a paid order is never below 1 unit.
    const finalAmount = Math.max(applyCoupon(basePrice, couponResult.coupon, currency), 1);

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const shortReceiptId = `rcpt_${Date.now().toString().slice(-8)}`;
    let order;
    try {
    order = await razorpay.orders.create({
      amount: toMinorUnits(finalAmount),
      currency,
      receipt: shortReceiptId,
      // 2. Bind the order to the buyer and course; /api/verify-payment reads these back from Razorpay.
      notes: {
        userId,
        courseId: course.id,
        courseSlug: course.slug,
        couponCode: couponResult.coupon?.code ?? "",
        planId: base.plan?.id ?? "",
      },
    });
    } catch (e) {
      await settleCoupon(couponResult.coupon?.code, userId, "release");   // no order exists: free the held code
      throw e;
    }

    return NextResponse.json({ success: true, order });

  } catch (error) {
    console.error("Razorpay Backend Error:", error);
    return NextResponse.json({ success: false, error: "Failed to create order" }, { status: 500 });
  }
}
