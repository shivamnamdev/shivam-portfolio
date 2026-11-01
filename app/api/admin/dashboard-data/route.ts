// GET /api/admin/dashboard-data  ->  { success, enrollments, submissions, videoProgress, userStats, failed: string[] }
// Admin only (checked on the server). The progress and stats tables are not readable from the browser.
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/serverAuth";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  // One failing list must not hide the others (the portal shows what it can): a failed list comes back empty and is named in `failed`.
  const queries = {
    enrollments: supabaseAdmin.from("user_enrollments").select("*").order("enrolled_at", { ascending: false }),
    submissions: supabaseAdmin.from("assignment_progress").select("*").order("completed_at", { ascending: false }),
    videoProgress: supabaseAdmin.from("video_progress").select("*"),
    userStats: supabaseAdmin.from("user_stats").select("*").order("total_time_seconds", { ascending: false }),
  };
  const names = Object.keys(queries) as (keyof typeof queries)[];
  const results = await Promise.all(names.map((n) => queries[n]));
  const body: Record<string, unknown> = { success: true, failed: [] as string[] };
  results.forEach((res, i) => {
    if (res.error) {
      console.error(`Admin dashboard data: ${names[i]} failed:`, res.error);
      (body.failed as string[]).push(names[i]);
    }
    body[names[i]] = res.data ?? [];
  });
  return NextResponse.json(body);
}
