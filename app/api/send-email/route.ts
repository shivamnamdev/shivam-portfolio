// app/api/send-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { name, email, message, subject } = await req.json();

    // 1. Safety Check: Are the environment variables loaded?
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error("CRITICAL: Missing GMAIL_USER or GMAIL_APP_PASSWORD in environment variables.");
      return NextResponse.json({ success: false, error: "Server Configuration Error: Missing Keys" }, { status: 500 });
    }

    // 2. Configure the email transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, ''), // Safely strips accidental spaces
      },
    });

    // 3. Format the email
    const mailOptions = {
      from: `Shivam Academy <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER, 
      replyTo: email, 
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #d97706;">${subject}</h2>
          <p><strong>From:</strong> ${name || 'New Lead'}</p>
          <p><strong>Email:</strong> ${email}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p><strong>Message / Request:</strong></p>
          <p style="white-space: pre-wrap;">${message || 'No message provided.'}</p>
        </div>
      `,
    };

    // 4. Send it and log success
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully! Message ID:", info.messageId);

    return NextResponse.json({ success: true, message: "Email sent successfully!" });

  } catch (error: any) {
    // 🚨 THIS PRINTS THE EXACT REASON GMAIL FAILED
    console.error("🚨 Nodemailer Error Details:", error.message || error);
    return NextResponse.json({ success: false, error: error.message || "Failed to send email" }, { status: 500 });
  }
}