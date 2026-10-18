// app/api/send-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { escapeHtml } from '@/lib/escapeHtml';

const LIMITS = { name: 100, email: 254, subject: 200, message: 5000 };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Honeypot: real users never see or fill the hidden "website" field.
    if (clean(body.website, 200)) {
      return NextResponse.json({ success: true, message: "Email sent successfully!" });
    }

    const name = clean(body.name, LIMITS.name);
    const email = clean(body.email, LIMITS.email);
    const message = clean(body.message, LIMITS.message);
    const subject = clean(body.subject, LIMITS.subject).replace(/[\r\n]+/g, ' ') || 'New Website Inquiry';

    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ success: false, error: "Please provide a valid email address." }, { status: 400 });
    }

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

    // 3. Format the email (all user-supplied values are escaped)
    const mailOptions = {
      from: `Shivam Academy <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      replyTo: email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #d97706;">${escapeHtml(subject)}</h2>
          <p><strong>From:</strong> ${escapeHtml(name || 'New Lead')}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p><strong>Message / Request:</strong></p>
          <p style="white-space: pre-wrap;">${escapeHtml(message || 'No message provided.')}</p>
        </div>
      `,
    };

    // 4. Send it and log success
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully! Message ID:", info.messageId);

    return NextResponse.json({ success: true, message: "Email sent successfully!" });

  } catch (error: any) {
    console.error("🚨 Nodemailer Error Details:", error.message || error);
    return NextResponse.json({ success: false, error: "Failed to send email" }, { status: 500 });
  }
}
