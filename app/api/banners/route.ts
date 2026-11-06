// GET /api/banners?placement=site-top|courses|course-page|learning|dashboard  ->  { success, banners: [{ slug, version, message, ctaLabel?, ctaUrl?, style,
//   dismissible, countdownSeconds|null, priority }] }
// The banners this visitor or learner should see in one placement right now (published, inside their window, aimed at them, best priority first).
// Public: a visitor gets the visitor banners; a signed-in learner also gets those for their cohorts and plans. Not cached by the browser or a proxy.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PLACEMENTS } from "@/lib/adminApi/banners";
import { getBanners } from "@/lib/catalog/engagement";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const placement = new URL(req.url).searchParams.get("placement");
  if (!placement || !(PLACEMENTS as readonly string[]).includes(placement)) {
    return NextResponse.json({ success: false, error: "Invalid placement" }, { status: 400 });
  }
  const { userId } = auth();
  const banners = await getBanners(placement as (typeof PLACEMENTS)[number], userId);
  return NextResponse.json({ success: true, banners }, { headers: { "Cache-Control": "private, no-store" } });
}
