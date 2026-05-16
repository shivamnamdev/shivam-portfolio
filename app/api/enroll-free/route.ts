import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { activeCourses } from "@/data/courses";
import { activeCoupons } from "@/data/coupons";

export async function POST(req: NextRequest) {
  try {
    const { courseId, currency, couponCode, userId, courseSlug, userName, userEmail } = await req.json();

    const course = activeCourses.find(c => c.id === courseId);
    if (!course) return NextResponse.json({ success: false, error: "Course not found" }, { status: 400 });

    const activePricing = currency === "USD" ? course.pricing.usd : course.pricing.inr;
    let baseAmount = parseInt(activePricing.currentPrice.replace(/[^0-9]/g, ''));
    let finalAmount = baseAmount;

    if (couponCode) {
      const coupon = activeCoupons.find(c => c.code.toUpperCase() === couponCode.toUpperCase());
      if (!coupon) return NextResponse.json({ success: false, error: "Invalid coupon" }, { status: 400 });
      if (coupon.allowedUsers && coupon.allowedUsers.length > 0 && !coupon.allowedUsers.includes(userId)) {
        return NextResponse.json({ success: false, error: "Coupon not authorized" }, { status: 403 });
      }
      if (coupon.discountType === 'percentage') {
        finalAmount = baseAmount - (baseAmount * (coupon.discountValue as number / 100));
      } else if (coupon.discountType === 'fixed') {
        const fixedDiscounts = coupon.discountValue as Record<string, number>;
        finalAmount = baseAmount - (fixedDiscounts[currency.toLowerCase()] || 0);
      }
    }

    finalAmount = Math.max(Math.round(finalAmount), 0);
    if (finalAmount > 0) return NextResponse.json({ success: false, error: "Payment required." }, { status: 400 });

    // 🚨 UPDATED: Save the Name and Email!
    const { error: dbError } = await supabase
      .from('user_enrollments')
      .insert([{ 
        user_id: userId, 
        course_slug: courseSlug,
        coupon_used: couponCode || null,
        user_name: userName,
        user_email: userEmail
      }]);

    if (dbError) throw dbError;

    // 🚨 NEW: TRIGGER ADMIN NOTIFICATION!
    await supabase.from('admin_activity_log').insert([{
      type: 'enrollment',
      message: `New Free Enrollment (Coupon: ${couponCode}): ${courseSlug}`,
      user_email: userEmail
    }]);
    
    return NextResponse.json({ success: true, message: "Enrolled for free successfully!" });
    
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to process enrollment" }, { status: 500 });
  }
}