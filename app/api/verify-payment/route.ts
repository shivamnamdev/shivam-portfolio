import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import Razorpay from "razorpay";
import nodemailer from "nodemailer";
import { auth, currentUser } from "@clerk/nextjs/server";
import { activeCourses } from "@/data/courses";
import { grantEnrollment } from "@/lib/enrollments";
import { getDisplayName, getPrimaryEmail } from "@/lib/serverAuth";
import { escapeHtml } from "@/lib/escapeHtml";
import { formatPrice, toCurrencyCode } from "@/lib/pricing";

function isValidSignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    const { userId } = auth();
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const keyId = process.env.RAZORPAY_KEY_ID;
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !secret) throw new Error("Razorpay keys are missing");

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature ||
        !isValidSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, secret)) {
      return NextResponse.json({ success: false, error: "Invalid payment signature" }, { status: 400 });
    }

    // 1. Re-fetch the order from Razorpay: the course and buyer come from the order created
    //    server-side in /api/create-order, never from the client request.
    const razorpay = new Razorpay({ key_id: keyId, key_secret: secret });
    const order = await razorpay.orders.fetch(razorpay_order_id);
    const notes = (order.notes || {}) as Record<string, string>;

    if (!notes.courseSlug || !notes.userId) {
      return NextResponse.json({ success: false, error: "Order is missing course details. Please contact support." }, { status: 400 });
    }
    if (notes.userId !== userId) {
      return NextResponse.json({ success: false, error: "This order belongs to a different account." }, { status: 403 });
    }

    const courseObj = activeCourses.find(c => c.slug === notes.courseSlug);
    if (!courseObj) return NextResponse.json({ success: false, error: "Course not found" }, { status: 400 });

    const user = await currentUser();
    const userEmail = getPrimaryEmail(user) || "Unknown Email";
    const userName = getDisplayName(user);
    const amountPaid = formatPrice(Number(order.amount) / 100, toCurrencyCode(order.currency));

    // 2. Enroll the user (idempotent — a retried verification does not create a second row or email)
    const { created } = await grantEnrollment({
      userId,
      courseSlug: courseObj.slug,
      userName,
      userEmail,
      couponUsed: notes.couponCode || null,
      activityMessage: `New Paid Enrollment: ${courseObj.title}`,
    });

    // 3. Send the Welcome Email with the WhatsApp Link
    const whatsappLink = courseObj.whatsappLink || "#";
    if (created && user && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
        });

        const mailOptions = {
          from: `Shivam Academy <${process.env.GMAIL_USER}>`,
          to: userEmail,
          bcc: process.env.GMAIL_USER,
          subject: `🎉 Welcome to ${courseObj.title}! (Action Required)`,
          html: `
            <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; color: #1c1917; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
              <div style="background-color: #f59e0b; padding: 40px 30px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 900;">Welcome to the Cohort! 🚀</h1>
              </div>
              <div style="padding: 40px 30px; background-color: #fdfcf8;">
                <p style="font-size: 18px; margin-bottom: 20px;">Hi <strong>${escapeHtml(userName)}</strong>,</p>
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">Thank you for enrolling in <strong>${escapeHtml(courseObj.title)}</strong>. Your payment was successful!</p>

                <div style="background-color: #ffffff; padding: 25px; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 30px;">
                  <h3 style="margin-top: 0; color: #1c1917; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 15px;">Transaction Receipt</h3>
                  <table style="width: 100%; font-size: 15px;">
                    <tr><td style="padding: 5px 0; color: #78716c;">Order ID:</td><td style="text-align: right; font-family: monospace;">${escapeHtml(razorpay_order_id)}</td></tr>
                    <tr><td style="padding: 5px 0; color: #78716c;">Amount Paid:</td><td style="text-align: right; font-weight: bold;">${escapeHtml(amountPaid)}</td></tr>
                    <tr><td style="padding: 5px 0; color: #78716c;">Status:</td><td style="text-align: right; color: #10b981; font-weight: bold;">✔ PAID</td></tr>
                  </table>
                </div>

                <h3 style="color: #1c1917; margin-bottom: 15px;">Your Next Steps (Action Required):</h3>
                <ol style="font-size: 16px; line-height: 1.8; color: #44403c; padding-left: 20px; margin-bottom: 30px;">
                  <li>
                    <strong>Join the Private WhatsApp Group:</strong> This is where class announcements and links will be posted.<br/>
                    👉 <a href="${escapeHtml(whatsappLink)}" style="color: #d97706; font-weight: bold; text-decoration: underline;">Click here to join the WhatsApp Group</a>
                  </li>
                  <li>
                    <strong>Access Your Dashboard:</strong> Go to <a href="https://shivamnamdev.com/learning" style="color: #d97706; font-weight: bold;">shivamnamdev.com/learning</a> to start!
                  </li>
                </ol>

                <p style="font-size: 16px; color: #44403c;">Let's write some code!</p>
              </div>
            </div>
          `,
        };
        await transporter.sendMail(mailOptions);
      } catch (err) {
        console.error("Failed to send welcome email:", err);
      }
    }

    return NextResponse.json({ success: true, message: "Payment verified!", whatsappLink });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
