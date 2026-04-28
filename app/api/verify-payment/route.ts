// app/api/verify-payment/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "@/lib/supabaseClient";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature, 
      userId, 
      courseSlug,
      userEmail,
      userName,
      courseTitle,
      amountPaid
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
      .insert([{ user_id: userId, course_slug: courseSlug }]);

    if (dbError) {
      console.error("Supabase Error:", dbError);
    }

    // 3. 🚨 SEND THE AUTOMATED WELCOME EMAIL & INVOICE
    if (userEmail && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        });

        const mailOptions = {
          from: `Shivam Academy <${process.env.GMAIL_USER}>`,
          to: userEmail, // Sending TO the student
          bcc: process.env.GMAIL_USER, // BCC yourself so you get a copy of every sale!
          subject: `🎉 Welcome to ${courseTitle}! (Receipt Enclosed)`,
          html: `
            <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; color: #1c1917; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
              <div style="background-color: #f59e0b; padding: 40px 30px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 900;">Welcome to the Cohort! 🚀</h1>
              </div>
              
              <div style="padding: 40px 30px; background-color: #fdfcf8;">
                <p style="font-size: 18px; margin-bottom: 20px;">Hi <strong>${userName}</strong>,</p>
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                  Thank you for enrolling in <strong>${courseTitle}</strong>. Your payment was successful, and your learning dashboard is officially unlocked!
                </p>
                
                <div style="background-color: #ffffff; padding: 25px; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 30px;">
                  <h3 style="margin-top: 0; color: #1c1917; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 15px;">Transaction Receipt</h3>
                  <table style="width: 100%; font-size: 15px;">
                    <tr><td style="padding: 5px 0; color: #78716c;">Order ID:</td><td style="text-align: right; font-family: monospace;">${razorpay_order_id}</td></tr>
                    <tr><td style="padding: 5px 0; color: #78716c;">Payment ID:</td><td style="text-align: right; font-family: monospace;">${razorpay_payment_id}</td></tr>
                    <tr><td style="padding: 5px 0; color: #78716c;">Amount Paid:</td><td style="text-align: right; font-weight: bold;">${amountPaid}</td></tr>
                    <tr><td style="padding: 5px 0; color: #78716c;">Status:</td><td style="text-align: right; color: #10b981; font-weight: bold;">✔ PAID</td></tr>
                  </table>
                </div>

                <h3 style="color: #1c1917; margin-bottom: 15px;">Your Next Steps:</h3>
                <ol style="font-size: 16px; line-height: 1.8; color: #44403c; padding-left: 20px; margin-bottom: 30px;">
                  <li><strong>Join the Community:</strong> <a href="#" style="color: #d97706; font-weight: bold; text-decoration: none;">Click here to join our Private Discord</a>.</li>
                  <li><strong>Access Your Dashboard:</strong> Go to <a href="https://shivamnamdev.com/learning" style="color: #d97706; font-weight: bold; text-decoration: none;">shivamnamdev.com/learning</a> to view your syllabus and live class links.</li>
                </ol>
                
                <p style="font-size: 16px; color: #44403c;">I'm excited to have you on board. Let's write some code!</p>
                <p style="font-size: 16px; color: #44403c; margin-top: 30px;">Best regards,<br/><strong style="color: #1c1917; font-size: 18px;">Shivam Namdev</strong></p>
              </div>
            </div>
          `,
        };

        await transporter.sendMail(mailOptions);
        console.log("Welcome email sent to:", userEmail);
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
      }
    }

    return NextResponse.json({ success: true, message: "Payment verified, enrolled, and email sent!" });

  } catch (error) {
    console.error("Verification Error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}