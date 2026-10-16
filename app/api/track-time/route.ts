// app/api/track-time/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// TimeTracker sends one 60s heartbeat per minute; anything larger is rejected.
const MAX_SECONDS_PER_PING = 60;

export async function POST(req: NextRequest) {
  try {
    // Securely get the logged-in user from Clerk
    const { userId } = getAuth(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { seconds } = await req.json();
    if (!Number.isInteger(seconds) || seconds <= 0 || seconds > MAX_SECONDS_PER_PING) {
      return NextResponse.json({ error: "Invalid seconds" }, { status: 400 });
    }

    // 1. Fetch their current time
    const { data } = await supabaseAdmin.from('user_stats').select('total_time_seconds').eq('user_id', userId).maybeSingle();
    if (!data) return NextResponse.json({ success: true, newTotal: 0 }); // stats row is created on first dashboard visit

    // 2. Add the new time (e.g., 60 seconds)
    const newTotal = (data.total_time_seconds || 0) + seconds;

    // 3. Update the database
    await supabaseAdmin.from('user_stats').update({ total_time_seconds: newTotal }).eq('user_id', userId);

    return NextResponse.json({ success: true, newTotal });
  } catch (error) {
    return NextResponse.json({ error: "Failed to track time" }, { status: 500 });
  }
}
