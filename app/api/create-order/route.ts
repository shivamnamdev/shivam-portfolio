// app/api/create-order/route.ts
import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { auth } from "@clerk/nextjs/server";
import { activeCourses } from "@/data/courses";
import { applyCoupon, parsePrice, resolveCoupon, toCurrencyCode, toMinorUnits } from "@/lib/pricing";

// Playwright API tests authenticate with x-api-key instead of a Clerk session.
// The bypass is disabled in production so it can never be used against live payments.
function isTestApiKey(req: NextRequest): boolean {
  const expected = process.env.ADMIN_API_KEY;
  return process.env.NODE_ENV !== "production" && !!expected && req.headers.get("x-api-key") === expected;
}

export async function POST(req: NextRequest) {
  try {
    const { courseId, currency: rawCurrency, couponCode } = await req.json();

    // 1. SECURITY CHECK: identity comes from the Clerk session, never from the request body.
    const { userId: sessionUserId } = auth();
    const userId = sessionUserId ?? (isTestApiKey(req) ? "api-test-user" : null);
    if (!userId) {
      return NextResponse.json({ success: false, error: "401 Unauthorized: Invalid Request" }, { status: 401 });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ success: false, error: "Missing Keys" }, { status: 500 });
    }

    const course = activeCourses.find(c => c.id === courseId);
    if (!course) return NextResponse.json({ success: false, error: "Course not found" }, { status: 400 });
    if (course.enrollmentClosed) {
      return NextResponse.json({ success: false, error: "Enrollment is closed for this course" }, { status: 400 });
    }

    const currency = toCurrencyCode(rawCurrency);
    const couponResult = resolveCoupon(couponCode, userId);
    if (!couponResult.ok) {
      return NextResponse.json({ success: false, error: couponResult.error }, { status: couponResult.status });
    }

    const basePrice = parsePrice(currency === "USD" ? course.pricing.usd.currentPrice : course.pricing.inr.currentPrice);
    // Free (100% off) checkouts go through /api/enroll-free; a paid order is never below 1 unit.
    const finalAmount = Math.max(applyCoupon(basePrice, couponResult.coupon, currency), 1);

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const shortReceiptId = `rcpt_${Date.now().toString().slice(-8)}`;
    const order = await razorpay.orders.create({
      amount: toMinorUnits(finalAmount),
      currency,
      receipt: shortReceiptId,
      // 2. Bind the order to the buyer and course; /api/verify-payment reads these back from Razorpay.
      notes: {
        userId,
        courseId: course.id,
        courseSlug: course.slug,
        couponCode: couponResult.coupon?.code ?? "",
      },
    });

    return NextResponse.json({ success: true, order });

  } catch (error) {
    console.error("Razorpay Backend Error:", error);
    return NextResponse.json({ success: false, error: "Failed to create order" }, { status: 500 });
  }
}
