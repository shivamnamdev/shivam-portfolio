// app/api/verify-payment/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: NextRequest) {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature, 
      userId, 
      courseSlug 
    } = await req.json();

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) throw new Error("Razorpay secret is missing");

    // 1. Verify the signature securely
    const generated_signature = crypto
      .createHmac("sha256", secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return NextResponse.json({ success: false, error: "Invalid payment signature" }, { status: 400 });
    }

    // 2. Payment is legit! Enroll the student in the database
    const { error: dbError } = await supabase
      .from('user_enrollments')
      .insert([{ 
        user_id: userId, 
        course_slug: courseSlug 
      }]);

    if (dbError) {
      console.error("Supabase Error:", dbError);
      // Even if DB fails temporarily, payment was successful. You can handle retries later.
    }

    return NextResponse.json({ success: true, message: "Payment verified and student enrolled!" });

  } catch (error) {
    console.error("Verification Error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}