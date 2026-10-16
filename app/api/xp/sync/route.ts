// app/api/xp/sync/route.ts
// Recomputes a student's XP from their progress rows. Idempotent: safe to call after every
// completion/submission and on dashboard load (which also backfills existing students).
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const XP_PER_VIDEO = 10;
const XP_PER_ASSIGNMENT = 50;

export async function POST() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const [videos, assignments] = await Promise.all([
      supabaseAdmin.from("video_progress").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabaseAdmin.from("assignment_progress").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);
    if (videos.error) throw videos.error;
    if (assignments.error) throw assignments.error;

    const points = (videos.count ?? 0) * XP_PER_VIDEO + (assignments.count ?? 0) * XP_PER_ASSIGNMENT;

    // The stats row is created on the first dashboard visit; nothing to update before that.
    const { error } = await supabaseAdmin.from("user_stats").update({ total_points: points }).eq("user_id", userId);
    if (error) throw error;

    return NextResponse.json({ success: true, points });
  } catch (error) {
    console.error("XP sync failed:", error);
    return NextResponse.json({ success: false, error: "Failed to sync XP" }, { status: 500 });
  }
}
