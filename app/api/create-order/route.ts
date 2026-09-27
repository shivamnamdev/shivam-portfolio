// app/api/create-order/route.ts
import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { auth } from "@clerk/nextjs"; 

export async function POST(req: NextRequest) {
  try {
    // 1. SECURITY CHECK (Clerk Session OR API Key)
    let clerkUserId: string | null = null;
    try {
      const authResult = auth();
      clerkUserId = authResult.userId;
    } catch {
      clerkUserId = null;
    }
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

    // 2. 🚨 THE FIX: Just grab the final calculated amount from the frontend!
    const { amount, currency } = await req.json();

    // Ensure amount is at least 1 (Razorpay requirement)
    let finalAmount = Math.max(Math.round(amount), 1);

    // 3. Create the Order
    const shortReceiptId = `rcpt_${Date.now().toString().slice(-8)}`;
    const order = await razorpay.orders.create({
      amount: finalAmount * 100, // Convert to paise/cents
      currency: currency || "INR", 
      receipt: shortReceiptId,
    });

    return NextResponse.json({ success: true, order });
    
  } catch (error) {
    console.error("Razorpay Backend Error:", error);
    return NextResponse.json({ success: false, error: "Failed to create order" }, { status: 500 });
  }
}