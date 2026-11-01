// GET /api/learning/leaderboard  ->  { success, leaders: [{ user_name, total_points }] }  (top 5, no e-mail addresses)
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fail, requireLearner } from "@/lib/learnerApi";

// Owner and test accounts never show on the public board.
const HIDDEN_EMAILS = ["financetrail.bazar@gmail.com", "mavish.ps8@gmail.com", "shivamnamdev.edu@gmail.com", "shivamnamdev.corp@gmail.com"];

export async function GET() {
  const who = requireLearner();
  if ("response" in who) return who.response;

  try {
    const { data, error } = await supabaseAdmin.from("user_stats").select("user_name, total_points, user_email")
      .order("total_points", { ascending: false }).limit(15);
    if (error) throw error;
    const leaders = (data ?? []).filter((r) => !HIDDEN_EMAILS.includes(r.user_email)).slice(0, 5)
      .map((r) => ({ user_name: r.user_name, total_points: r.total_points }));
    return NextResponse.json({ success: true, leaders });
  } catch (error) {
    console.error("Load leaderboard failed:", error);
    return fail(500, "Failed to load leaderboard");
  }
}
