// GET /api/learning/social?videoId=  ->  { success, comments, likesCount, hasLiked }
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fail, isItemId, requireLearner } from "@/lib/learnerApi";

const MAX_COMMENTS = 200;

export async function GET(req: Request) {
  const who = requireLearner();
  if ("response" in who) return who.response;
  const videoId = new URL(req.url).searchParams.get("videoId");
  if (!isItemId(videoId)) return fail(400, "Invalid videoId");

  try {
    const [comments, likes] = await Promise.all([
      supabaseAdmin.from("video_comments").select("id, video_id, user_id, user_name, user_image, content, created_at")
        .eq("video_id", videoId).order("created_at", { ascending: false }).limit(MAX_COMMENTS),
      supabaseAdmin.from("video_likes").select("user_id").eq("video_id", videoId),
    ]);
    if (comments.error) throw comments.error;
    // Likes are decoration: a failed likes lookup shows zero likes instead of hiding the whole Q&A thread.
    if (likes.error) console.error("Load likes failed:", likes.error);
    const likers = likes.data ?? [];
    return NextResponse.json({
      success: true, comments: comments.data ?? [], likesCount: likers.length, hasLiked: likers.some((l) => l.user_id === who.userId),
    });
  } catch (error) {
    console.error("Load Q&A failed:", error);
    return fail(500, "Failed to load Q&A");
  }
}
