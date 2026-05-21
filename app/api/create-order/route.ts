// app/api/create-order/route.ts
import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { activeCourses } from "@/data/courses";
import { activeCoupons } from "@/data/coupons";
import { auth } from "@clerk/nextjs"; // 🚨 Import Clerk Auth

export async function POST(req: NextRequest) {
  try {
    // 1. 🚨 ENTERPRISE SECURITY CHECK (Clerk Session OR API Key)
    const { userId: clerkUserId } = auth();
    const apiKey = req.headers.get("x-api-key");

    if (!clerkUserId && apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ success: false, error: "401 Unauthorized: Invalid API Key or Session" }, { status: 401 });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ success: false, error: "Missing Keys" }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const { courseId, currency, couponCode, userId } = await req.json();

    const course = activeCourses.find(c => c.id === courseId);
    if (!course) return NextResponse.json({ success: false, error: "Course not found" }, { status: 400 });

    const activePricing = currency === "USD" ? course.pricing.usd : course.pricing.inr;
    let baseAmount = parseInt(activePricing.currentPrice.replace(/[^0-9]/g, ''));
    let finalAmount = baseAmount;

    if (couponCode) {
      const coupon = activeCoupons.find(c => c.code.toUpperCase() === couponCode.toUpperCase());
      if (!coupon) return NextResponse.json({ success: false, error: "Invalid coupon code" }, { status: 400 });

      if (coupon.allowedUsers && coupon.allowedUsers.length > 0 && !coupon.allowedUsers.includes(userId)) {
        return NextResponse.json({ success: false, error: "This coupon is not valid for your account." }, { status: 403 });
      }

      if (coupon.discountType === 'percentage') {
        finalAmount = baseAmount - (baseAmount * (coupon.discountValue as number / 100));
      } else if (coupon.discountType === 'fixed') {
        const fixedDiscounts = coupon.discountValue as Record<string, number>;
        finalAmount = baseAmount - (fixedDiscounts[currency.toLowerCase()] || 0);
      }
      finalAmount = Math.max(Math.round(finalAmount), 1);
    }

    const shortReceiptId = `rcpt_${Date.now().toString().slice(-8)}`;
    const order = await razorpay.orders.create({
      amount: finalAmount * 100, 
      currency: currency || "INR", 
      receipt: shortReceiptId,
    });

    return NextResponse.json({ success: true, order });
    
  } catch (error) {
    console.error("Razorpay Backend Error:", error);
    return NextResponse.json({ success: false, error: "Failed to create order" }, { status: 500 });
  }
}