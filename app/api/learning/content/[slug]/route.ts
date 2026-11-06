// GET /api/learning/content/{slug}  ->  { success, title, hasLiveLink, modules }
// The lessons of one cohort, for a learner enrolled in it (or the admin). The lesson list, the lab and assignment links and the title used to be
// bundled into the page for everyone; now only a checked caller receives them (SCP-45). `modules` has the shape the lesson page has always read.
import { NextResponse } from "next/server";
import { fail, hasCourseAccess, isSlug, requireLearner } from "@/lib/learnerApi";
import { getLayout, getLearningCourse, getLinks } from "@/lib/catalog/learning";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const who = requireLearner();
  if ("response" in who) return who.response;
  if (!isSlug(params.slug)) return fail(400, "Invalid course");
  try {
    if (!(await hasCourseAccess(who.userId, params.slug))) return fail(403, "You are not enrolled in this course");
    const [modules, course, links] = await Promise.all([getLayout(params.slug), getLearningCourse(params.slug), getLinks(params.slug)]);
    return NextResponse.json({ success: true, title: course?.title ?? "", hasLiveLink: !!links.liveLink, modules: modules ?? [] });
  } catch (e) {
    console.error("learning content failed:", (e as Error).message?.slice(0, 120));
    return fail(500, "Could not load the course");
  }
}
