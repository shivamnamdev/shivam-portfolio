// GET /api/learning/links/{slug}  ->  { success, title, liveLink, whatsappLink }
// The private live-class and WhatsApp links of one cohort, only for a learner enrolled in it (or the admin). Never cached by the browser or a proxy.
import { NextResponse } from "next/server";
import { fail, hasCourseAccess, isSlug, requireLearner } from "@/lib/learnerApi";
import { getLearningCourse, getLinks } from "@/lib/catalog/learning";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const who = await requireLearner();
  if ("response" in who) return who.response;
  if (!isSlug(params.slug)) return fail(400, "Invalid course");
  try {
    if (!(await hasCourseAccess(who.userId, params.slug))) return fail(403, "You are not enrolled in this course");
    const [links, course] = await Promise.all([getLinks(params.slug), getLearningCourse(params.slug)]);
    return NextResponse.json({ success: true, title: course?.title ?? "", ...links }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    console.error("learning links failed:", (e as Error).message?.slice(0, 120));
    return fail(500, "Could not load the links");
  }
}
