// app/api/send-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { name, email, message, subject } = await req.json();

    // 1. Configure the email transporter using your Gmail account
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    // 2. Format the email beautifully
    const mailOptions = {
      from: `Shivam Academy <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER, // Send the email to yourself
      replyTo: email, // When you click "Reply" in Gmail, it emails the student!
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #d97706;">${subject}</h2>
          <p><strong>From:</strong> ${name || 'New Lead'}</p>
          <p><strong>Email:</strong> ${email}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p><strong>Message / Request:</strong></p>
          <p style="white-space: pre-wrap;">${message || 'Requested Python Cheat Sheet / Priority Access'}</p>
        </div>
      `,
    };

    // 3. Send it!
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: "Email sent successfully!" });
  } catch (error) {
    console.error("Email API Error:", error);
    return NextResponse.json({ success: false, error: "Failed to send email" }, { status: 500 });
  }
}