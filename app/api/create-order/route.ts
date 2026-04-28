// app/api/create-order/route.ts
import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

export async function POST(req: NextRequest) {
  try {
    // 1. Check for Keys
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error("Missing Razorpay Keys");
      return NextResponse.json({ success: false, error: "Missing Keys" }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // 2. Extract amount and currency from the frontend request
    const { amount, courseId, currency } = await req.json();

    if (!amount || isNaN(amount)) {
      console.error("Invalid Amount Received:", amount);
      return NextResponse.json({ success: false, error: "Invalid Amount" }, { status: 400 });
    }

    const shortReceiptId = `rcpt_${Date.now().toString().slice(-8)}`;

    // 3. Create the Order
    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise/cents
      currency: currency || "INR", // 🚨 Crucial for the USD/INR toggle
      receipt: shortReceiptId,
    });

    console.log(`Razorpay Order Created: ${order.id} (${order.currency})`);
    return NextResponse.json({ success: true, order });
    
  } catch (error) {
    // 🚨 THIS WILL PRINT THE EXACT REASON RAZORPAY BLOCKED IT
    console.error("Razorpay Backend Error Details:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create order" },
      { status: 500 }
    );
  }
}