import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { activeCourses } from "@/data/courses";
import { applyCoupon, getBasePrice, resolveCoupon, toCurrencyCode } from "@/lib/pricing";
import { grantEnrollment } from "@/lib/enrollments";
import { getDisplayName, getPrimaryEmail } from "@/lib/serverAuth";

export async function POST(req: NextRequest) {
  try {
    const { courseId, planId, currency: rawCurrency, couponCode } = await req.json();

    const { userId } = auth();
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const course = activeCourses.find(c => c.id === courseId);
    if (!course) return NextResponse.json({ success: false, error: "Course not found" }, { status: 400 });
    if (course.enrollmentClosed) {
      return NextResponse.json({ success: false, error: "Enrollment is closed for this course" }, { status: 400 });
    }

    const currency = toCurrencyCode(rawCurrency);
    const couponResult = resolveCoupon(couponCode, userId);
    if (!couponResult.ok) {
      return NextResponse.json({ success: false, error: couponResult.error }, { status: couponResult.status });
    }

    const base = getBasePrice(course, currency, planId);
    if (!base.ok) return NextResponse.json({ success: false, error: base.error }, { status: 400 });
    if (applyCoupon(base.amount, couponResult.coupon, currency) > 0) {
      return NextResponse.json({ success: false, error: "Payment required." }, { status: 400 });
    }

    const user = await currentUser();
    const userEmail = getPrimaryEmail(user) || "Unknown Email";

    // The enrolled course is derived from courseId on the server — never a client-supplied slug.
    const { created } = await grantEnrollment({
      userId,
      courseSlug: course.slug,
      userName: getDisplayName(user),
      userEmail,
      couponUsed: couponResult.coupon?.code,
      planId: base.plan?.id,
      activityMessage: `New Free Enrollment (Coupon: ${couponResult.coupon?.code}): ${course.slug}${base.plan ? ` — ${base.plan.name}` : ""}`,
    });

    return NextResponse.json({
      success: true,
      message: created ? "Enrolled for free successfully!" : "You are already enrolled in this course.",
    });

  } catch (error) {
    console.error("Free enrollment error:", error);
    return NextResponse.json({ success: false, error: "Failed to process enrollment" }, { status: 500 });
  }
}
