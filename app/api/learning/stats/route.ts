// POST /api/learning/stats  ->  { success, streak, points }
// Called on every dashboard load: creates the stats row on the first visit and keeps the daily streak.
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getDisplayName, getPrimaryEmail } from "@/lib/serverAuth";
import { fail, readJson, requireLearner } from "@/lib/learnerApi";
import { streakDays } from "@/lib/streakDay";


export async function POST(req: Request) {
  const who = requireLearner();
  if ("response" in who) return who.response;

  try {
    // SCP-60: the day changes at the learner's midnight, not at UTC midnight. The page sends its time zone (optional).
    const body = await readJson(req);
    const { today, yesterday } = streakDays(new Date(), body?.timeZone);

    const user = await currentUser();
    const name = getDisplayName(user);
    const email = getPrimaryEmail(user) ?? "";

    const { data: stats, error } = await supabaseAdmin.from("user_stats").select("*").eq("user_id", who.userId).maybeSingle();
    if (error) throw error;

    if (!stats) {
      const { error: insertError } = await supabaseAdmin.from("user_stats").insert([
        { user_id: who.userId, user_name: name, user_email: email, current_streak: 1, total_points: 0, last_active_date: today },
      ]);
      if (insertError) throw insertError;
      return NextResponse.json({ success: true, streak: 1, points: 0 });
    }

    let streak = stats.current_streak || 0;
    if (stats.last_active_date === yesterday) streak += 1;
    else if (!stats.last_active_date || stats.last_active_date < yesterday) streak = 1;

    if (stats.last_active_date !== today || stats.user_email !== email) {
      const { error: updateError } = await supabaseAdmin.from("user_stats")
        .update({ current_streak: streak, last_active_date: today, user_name: name, user_email: email }).eq("user_id", who.userId);
      if (updateError) throw updateError;
    }
    return NextResponse.json({ success: true, streak, points: stats.total_points || 0 });
  } catch (error) {
    console.error("Load stats failed:", error);
    return fail(500, "Failed to load stats");
  }
}
