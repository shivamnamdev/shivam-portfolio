// app/api/create-order/route.ts
import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

export async function POST(req: NextRequest) {
  try {
    // Check if keys are present
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error("Missing Razorpay Environment Variables");
      return NextResponse.json({ success: false, error: "Missing Keys" }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const { amount } = await req.json();

    // Create a safe, short receipt ID (under 40 characters)
    const shortReceiptId = `rcpt_${Date.now().toString().slice(-10)}`;

    // Create an order in Razorpay
    const order = await razorpay.orders.create({
      amount: amount * 100, // Razorpay takes amount in paise (multiply by 100)
      currency: "INR",
      receipt: shortReceiptId,
    });

    console.log("Razorpay Order Created Successfully:", order.id);
    return NextResponse.json({ success: true, order });
    
  } catch (error) {
    console.error("Razorpay Backend Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create order" },
      { status: 500 }
    );
  }
}