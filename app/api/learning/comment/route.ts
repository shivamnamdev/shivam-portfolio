// POST /api/learning/comment  { videoId, content }  ->  { success, comment }
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getDisplayName } from "@/lib/serverAuth";
import { fail, isItemId, readJson, requireLearner } from "@/lib/learnerApi";

const MAX_COMMENT_CHARS = 1000;

export async function POST(req: Request) {
  const who = requireLearner();
  if ("response" in who) return who.response;
  const body = await readJson(req);
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!body || !isItemId(body.videoId) || content.length === 0 || content.length > MAX_COMMENT_CHARS) return fail(400, "Invalid comment");

  try {
    const user = await currentUser();
    const { data, error } = await supabaseAdmin.from("video_comments")
      .insert([{ video_id: body.videoId, user_id: who.userId, user_name: getDisplayName(user), user_image: user?.imageUrl ?? null, content }])
      .select("id, video_id, user_id, user_name, user_image, content, created_at");
    if (error) throw error;
    return NextResponse.json({ success: true, comment: data?.[0] ?? null });
  } catch (error) {
    console.error("Post comment failed:", error);
    return fail(500, "Failed to post comment");
  }
}
