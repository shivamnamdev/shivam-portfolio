// app/api/track-time/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: NextRequest) {
  try {
    // Securely get the logged-in user from Clerk
    const { userId } = getAuth(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { seconds } = await req.json();

    // 1. Fetch their current time
    const { data } = await supabase.from('user_stats').select('total_time_seconds').eq('user_id', userId).single();
    
    // 2. Add the new time (e.g., 60 seconds)
    const currentSeconds = data?.total_time_seconds || 0;
    const newTotal = currentSeconds + seconds;

    // 3. Update the database
    await supabase.from('user_stats').update({ total_time_seconds: newTotal }).eq('user_id', userId);

    return NextResponse.json({ success: true, newTotal });
  } catch (error) {
    return NextResponse.json({ error: "Failed to track time" }, { status: 500 });
  }
}