// app/api/enroll-free/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { activeCourses } from "@/data/courses";
import { activeCoupons } from "@/data/coupons";

export async function POST(req: NextRequest) {
  try {
    const { courseId, currency, couponCode, userId, courseSlug } = await req.json();

    // 1. Securely verify the course and price
    const course = activeCourses.find(c => c.id === courseId);
    if (!course) return NextResponse.json({ success: false, error: "Course not found" }, { status: 400 });

    const activePricing = currency === "USD" ? course.pricing.usd : course.pricing.inr;
    let baseAmount = parseInt(activePricing.currentPrice.replace(/[^0-9]/g, ''));
    let finalAmount = baseAmount;

    // 2. Validate the Coupon Securely
    if (couponCode) {
      const coupon = activeCoupons.find(c => c.code.toUpperCase() === couponCode.toUpperCase());
      
      if (!coupon) return NextResponse.json({ success: false, error: "Invalid coupon" }, { status: 400 });

      if (coupon.allowedUsers && coupon.allowedUsers.length > 0 && !coupon.allowedUsers.includes(userId)) {
        return NextResponse.json({ success: false, error: "Coupon not authorized for your account" }, { status: 403 });
      }

      if (coupon.discountType === 'percentage') {
        finalAmount = baseAmount - (baseAmount * (coupon.discountValue as number / 100));
      } else if (coupon.discountType === 'fixed') {
        const fixedDiscounts = coupon.discountValue as Record<string, number>;
        finalAmount = baseAmount - (fixedDiscounts[currency.toLowerCase()] || 0);
      }
    }

    finalAmount = Math.max(Math.round(finalAmount), 0);

    // 3. SECURITY CHECK: Ensure it is ACTUALLY free!
    if (finalAmount > 0) {
      return NextResponse.json({ success: false, error: "This transaction requires payment." }, { status: 400 });
    }

    // 4. Bypass Razorpay and enroll the student directly!
    const { error: dbError } = await supabase
      .from('user_enrollments')
      .insert([{ 
        user_id: userId, 
        course_slug: courseSlug,
        coupon_used: couponCode || null // 🚨 NEW: Save the coupon!
      }]);

    if (dbError) {
      console.error("Supabase Error:", dbError);
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Enrolled for free successfully!" });
    
  } catch (error) {
    console.error("Free Enrollment Backend Error:", error);
    return NextResponse.json({ success: false, error: "Failed to process enrollment" }, { status: 500 });
  }
}