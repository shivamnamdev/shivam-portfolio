// lib/enrollments.ts
// Server-only. All enrollment grants go through here so they are idempotent and audited.
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type GrantInput = {
  userId: string;
  courseSlug: string;
  userName: string;
  userEmail: string;
  couponUsed?: string | null;
  planId?: string | null; // pricing plan for plan-based courses (needs the plan_id column, see docs/SUPABASE_PLAN_COLUMN.md)
  activityMessage: string;
};

export async function isEnrolled(userId: string, courseSlug: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("user_enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_slug", courseSlug)
    .limit(1);
  if (error) throw error;
  return !!data && data.length > 0;
}

// Returns { created: false } when the user already owns the course (retries, double clicks).
export async function grantEnrollment(input: GrantInput): Promise<{ created: boolean }> {
  if (await isEnrolled(input.userId, input.courseSlug)) return { created: false };

  const row = {
    user_id: input.userId,
    course_slug: input.courseSlug,
    coupon_used: input.couponUsed || null,
    user_name: input.userName,
    user_email: input.userEmail,
  };
  let { error } = await supabaseAdmin.from("user_enrollments").insert([input.planId ? { ...row, plan_id: input.planId } : row]);

  // Until the plan_id migration is applied, PostgREST rejects the unknown column (PGRST204).
  // Never block a paid enrollment on that: store the row without the plan and keep the plan in the activity log.
  if (error && input.planId && error.code === "PGRST204") {
    console.warn("user_enrollments.plan_id is missing — run docs/SUPABASE_PLAN_COLUMN.md. Recording plan in activity log only.");
    ({ error } = await supabaseAdmin.from("user_enrollments").insert([row]));
  }
  if (error) throw error;

  try {
    await supabaseAdmin.from("admin_activity_log").insert([{
      type: "enrollment",
      message: input.activityMessage,
      user_email: input.userEmail,
    }]);
  } catch (logError) {
    console.error("Failed to log enrollment activity:", logError);
  }

  return { created: true };
}
