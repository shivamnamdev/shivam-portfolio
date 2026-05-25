import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "@/lib/supabaseClient";
import nodemailer from "nodemailer";
import { activeCourses } from "@/data/courses"; // 🚨 Imported your courses data!

export async function POST(req: NextRequest) {
  try {
    const { 
      razorpay_order_id, razorpay_payment_id, razorpay_signature, 
      userId, courseSlug, userEmail, userName, courseTitle, amountPaid, couponCode
    } = await req.json();

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) throw new Error("Razorpay secret is missing");

    const generated_signature = crypto
      .createHmac("sha256", secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return NextResponse.json({ success: false, error: "Invalid payment signature" }, { status: 400 });
    }

    // 1. Enroll the user in Supabase
    await supabase.from('user_enrollments').insert([{ 
      user_id: userId, 
      course_slug: courseSlug,
      coupon_used: couponCode || null,
      user_name: userName,
      user_email: userEmail
    }]);

    // Log for the Admin Bell
    await supabase.from('admin_activity_log').insert([{
      type: 'enrollment',
      message: `New Paid Enrollment: ${courseTitle}`,
      user_email: userEmail
    }]);

    // 🚨 2. Fetch the WhatsApp link for this specific course!
    const courseObj = activeCourses.find(c => c.slug === courseSlug);
    const whatsappLink = courseObj?.whatsappLink || "#";

    // 3. Send the Welcome Email with the WhatsApp Link
    if (userEmail && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
        });

        const mailOptions = {
          from: `Shivam Academy <${process.env.GMAIL_USER}>`,
          to: userEmail,
          bcc: process.env.GMAIL_USER,
          subject: `🎉 Welcome to ${courseTitle}! (Action Required)`,
          html: `
            <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; color: #1c1917; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
              <div style="background-color: #f59e0b; padding: 40px 30px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 900;">Welcome to the Cohort! 🚀</h1>
              </div>
              <div style="padding: 40px 30px; background-color: #fdfcf8;">
                <p style="font-size: 18px; margin-bottom: 20px;">Hi <strong>${userName}</strong>,</p>
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">Thank you for enrolling in <strong>${courseTitle}</strong>. Your payment was successful!</p>
                
                <div style="background-color: #ffffff; padding: 25px; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 30px;">
                  <h3 style="margin-top: 0; color: #1c1917; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 15px;">Transaction Receipt</h3>
                  <table style="width: 100%; font-size: 15px;">
                    <tr><td style="padding: 5px 0; color: #78716c;">Order ID:</td><td style="text-align: right; font-family: monospace;">${razorpay_order_id}</td></tr>
                    <tr><td style="padding: 5px 0; color: #78716c;">Amount Paid:</td><td style="text-align: right; font-weight: bold;">${amountPaid}</td></tr>
                    <tr><td style="padding: 5px 0; color: #78716c;">Status:</td><td style="text-align: right; color: #10b981; font-weight: bold;">✔ PAID</td></tr>
                  </table>
                </div>

                <h3 style="color: #1c1917; margin-bottom: 15px;">Your Next Steps (Action Required):</h3>
                <ol style="font-size: 16px; line-height: 1.8; color: #44403c; padding-left: 20px; margin-bottom: 30px;">
                  <li>
                    <strong>Join the Private WhatsApp Group:</strong> This is where class announcements and links will be posted.<br/>
                    👉 <a href="${whatsappLink}" style="color: #d97706; font-weight: bold; text-decoration: underline;">Click here to join the WhatsApp Group</a>
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

    return NextResponse.json({ success: true, message: "Payment verified!" });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}