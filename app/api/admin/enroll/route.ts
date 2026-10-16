// app/api/admin/enroll/route.ts
// Manual ("backdoor") enrollment for offline payments. Admin-only, enforced on the server.
import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { activeCourses } from "@/data/courses";
import { grantEnrollment } from "@/lib/enrollments";
import { requireAdmin, getDisplayName, getPrimaryEmail } from "@/lib/serverAuth";

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { userId, courseSlug } = await req.json();
    const studentId = typeof userId === "string" ? userId.trim() : "";
    if (!studentId) return NextResponse.json({ success: false, error: "Please enter a valid Clerk User ID." }, { status: 400 });

    const course = activeCourses.find(c => c.slug === courseSlug);
    if (!course) return NextResponse.json({ success: false, error: "Course not found." }, { status: 400 });

    // Confirms the Clerk user exists and gives us the real name/email for the record.
    let student;
    try {
      student = await clerkClient.users.getUser(studentId);
    } catch {
      return NextResponse.json({ success: false, error: "No Clerk user found with that ID." }, { status: 404 });
    }

    const userEmail = getPrimaryEmail(student) || "Unknown Email";
    const { created } = await grantEnrollment({
      userId: studentId,
      courseSlug: course.slug,
      userName: getDisplayName(student, "Manual Enrollment"),
      userEmail,
      activityMessage: `Backdoor access granted to ${course.slug}`,
    });

    if (!created) return NextResponse.json({ success: false, error: "Student is already enrolled!" }, { status: 409 });

    return NextResponse.json({
      success: true,
      enrollment: { user_id: studentId, course_slug: course.slug, user_email: userEmail, enrolled_at: new Date().toISOString() },
    });
  } catch (error) {
    console.error("Manual enrollment error:", error);
    return NextResponse.json({ success: false, error: "Database Error." }, { status: 500 });
  }
}
