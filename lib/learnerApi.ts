// lib/learnerApi.ts
// Shared guards for the /api/learning/* routes. Identity comes from the Clerk session only; the learner tables
// are written with the service role because the browser has no access to them (PRD 14, SCP-74 to SCP-76).
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getPrimaryEmail } from "@/lib/serverAuth";
import { isAdminEmail } from "@/lib/admin";

const SLUG = /^[a-z0-9-]{1,100}$/;
const ITEM_ID = /^[\w-]{1,100}$/;

export const isSlug = (v: unknown): v is string => typeof v === "string" && SLUG.test(v);
export const isItemId = (v: unknown): v is string => typeof v === "string" && ITEM_ID.test(v);

export const fail = (status: number, error: string) => NextResponse.json({ success: false, error }, { status });

// Postgres error code for a unique constraint violation (a repeated request is not an error).
export const UNIQUE_VIOLATION = "23505";

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// Returns the signed-in user id, or a 401 response.
export function requireLearner(): { userId: string } | { response: NextResponse } {
  const { userId } = auth();
  return userId ? { userId } : { response: fail(401, "Unauthorized") };
}

// A learner may use a course when enrolled in it; the admin may use every course.
export async function hasCourseAccess(userId: string, courseSlug: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("user_enrollments").select("id").eq("user_id", userId).eq("course_slug", courseSlug).limit(1);
  if (error) throw error;
  if (data && data.length > 0) return true;
  return isAdminEmail(getPrimaryEmail(await currentUser()));
}
