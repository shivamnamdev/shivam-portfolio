// POST /api/learning/like  { videoId }  ->  { success, liked, likesCount }   (toggles the caller's like)
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fail, isItemId, readJson, requireLearner, UNIQUE_VIOLATION } from "@/lib/learnerApi";

export async function POST(req: Request) {
  const who = requireLearner();
  if ("response" in who) return who.response;
  const body = await readJson(req);
  if (!body || !isItemId(body.videoId)) return fail(400, "Invalid request");

  try {
    const existing = await supabaseAdmin.from("video_likes").select("id").eq("video_id", body.videoId).eq("user_id", who.userId).limit(1);
    if (existing.error) throw existing.error;
    const liked = (existing.data ?? []).length === 0;
    if (liked) {
      const { error } = await supabaseAdmin.from("video_likes").insert([{ video_id: body.videoId, user_id: who.userId }]);
      if (error && error.code !== UNIQUE_VIOLATION) throw error;
    } else {
      const { error } = await supabaseAdmin.from("video_likes").delete().eq("video_id", body.videoId).eq("user_id", who.userId);
      if (error) throw error;
    }
    const { count, error: countError } = await supabaseAdmin.from("video_likes").select("id", { count: "exact", head: true }).eq("video_id", body.videoId);
    if (countError) throw countError;
    return NextResponse.json({ success: true, liked, likesCount: count ?? 0 });
  } catch (error) {
    console.error("Toggle like failed:", error);
    return fail(500, "Failed to update like");
  }
}
