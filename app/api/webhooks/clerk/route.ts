// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; // 🚨 NEW: Imported Supabase

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local' }, { status: 500 });
  }

  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: 'Error occurred -- no svix headers' }, { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return NextResponse.json({ error: 'Error verifying' }, { status: 400 });
  }

  // If a NEW USER just signed up!
  if (evt.type === 'user.created') {
    const { id, first_name, last_name, email_addresses } = evt.data;
    
    const email = email_addresses[0]?.email_address;
    const firstName = first_name || "Student";
    const fullName = `${first_name || ''} ${last_name || ''}`.trim() || "A New Student";

    // 🚨 NEW: Log the signup to Supabase so it appears in your Admin Bell!
    try {
      await supabase.from('admin_activity_log').insert([{
        type: 'signup',
        message: `New Account Created: ${fullName}`,
        user_email: email || "No email"
      }]);
    } catch (dbError) {
      console.error("Failed to log signup to Supabase:", dbError);
    }

    if (email && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
        });

        const studentMailOptions = {
          from: `Shivam Academy <${process.env.GMAIL_USER}>`,
          to: email,
          subject: `Welcome to Shivam Academy! 🚀`,
          html: `
            <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; color: #1c1917; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
              <div style="background-color: #f59e0b; padding: 40px 30px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 900;">Welcome to the Academy!</h1>
              </div>
              <div style="padding: 40px 30px; background-color: #fdfcf8;">
                <p style="font-size: 18px; margin-bottom: 20px;">Hi <strong>${firstName}</strong>,</p>
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                  I am thrilled to see you join the platform. My goal is to help you achieve absolute Tech Mastery, step-by-step.
                </p>
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                  You can browse the available courses, and whenever you enroll, your Learning Dashboard will instantly unlock with your videos, interactive practice labs, and the AI code tutor.
                </p>
                <a href="https://shivamnamdev.com/courses" style="display: inline-block; padding: 14px 28px; background-color: #d97706; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 8px; margin-bottom: 30px;">Browse Courses</a>
                <p style="font-size: 16px; color: #44403c;">Let's write some code!</p>
                <p style="font-size: 16px; color: #44403c; margin-top: 30px;">Best regards,<br/><strong style="color: #1c1917; font-size: 18px;">Shivam Namdev</strong></p>
              </div>
            </div>
          `,
        };

        const adminMailOptions = {
          from: `Academy Bot <${process.env.GMAIL_USER}>`,
          to: process.env.GMAIL_USER,
          subject: `🚨 NEW USER SIGNUP: ${fullName}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2 style="color: #059669;">New Student Joined!</h2>
              <p><strong>Name:</strong> ${fullName}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Clerk ID:</strong> ${id}</p>
            </div>
          `,
        };

        await Promise.all([
          transporter.sendMail(studentMailOptions),
          transporter.sendMail(adminMailOptions)
        ]);

      } catch (err) {
        console.error("Failed to send welcome emails:", err);
      }
    }
  }

  return NextResponse.json({ success: true }, { status: 200 });
}