// app/api/enroll-free/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: NextRequest) {
  try {
    // 🚨 THE FIX: The frontend already verified the 100% coupon, so we just enroll them directly!
    const { courseSlug, couponCode, userId, userName, userEmail } = await req.json();

    if (!userId || !courseSlug) {
      return NextResponse.json({ success: false, error: "Missing user or course data" }, { status: 400 });
    }

    // 1. Bypass Razorpay and enroll the student directly in Supabase!
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

    // 2. Trigger Admin Notification Bell
    await supabase.from('admin_activity_log').insert([{
      type: 'enrollment',
      message: `New Free Enrollment (Coupon: ${couponCode}): ${courseSlug}`,
      user_email: userEmail
    }]);

    return NextResponse.json({ success: true, message: "Enrolled for free successfully!" });
    
  } catch (error) {
    console.error("Free Enrollment Backend Error:", error);
    return NextResponse.json({ success: false, error: "Failed to process free enrollment" }, { status: 500 });
  }
}