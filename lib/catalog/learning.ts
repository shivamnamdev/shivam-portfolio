// lib/catalog/learning.ts
// Server-only reader behind the learning area: lesson list, course title and resources, the private links and the "which course is this lesson in"
// lookup. PORTAL_LEARNING=files (default) answers from data/learning-content.ts and data/courses.ts exactly as before; PORTAL_LEARNING=database reads
// the published curriculum and the cohort of the admin portal, falling back to the files for that request if the database cannot be read or has
// nothing published for that course. The private links are read fresh (never cached) and only ever handed out by a route that checked access.
import "server-only";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { courseCurriculumMap } from "@/data/learning-content";
import { activeCourses } from "@/data/courses";
import { layoutFor, type Layout } from "@/lib/adminApi/progress";
import type { Module } from "@/lib/adminApi/curriculum";
import { LEARNING_TAG } from "./tags";
import { lessonIn } from "./lessons";
import { chooseSource, readWithFallback } from "./source";

export type LearningCourse = { id: string; slug: string; title: string; statusText: string; duration: string; resources?: Record<string, unknown>; format?: "live" | "recorded" };
type FileCourse = { id: string; slug: string; title: string; statusText?: string; duration?: string; resources?: Record<string, unknown>; format?: "live" | "recorded"; liveLink?: string; whatsappLink?: string };

const source = () => chooseSource(process.env.PORTAL_LEARNING);
const files = () => activeCourses as unknown as FileCourse[];
const fileCourse = (slug: string): FileCourse | undefined => files().find((c) => c.slug === slug);
const fileLayout = (slug: string): Layout | null => (courseCurriculumMap[slug] as Layout | undefined) ?? null;
const note = (what: string) => (reason: string, e?: unknown) => console.error(`learning: ${what} (${reason}${e ? `: ${(e as Error).message?.slice(0, 80)}` : ""}), answering from the data files`);

// ---- lessons ---------------------------------------------------------------------------------------------------------------------------------
const publishedLayout = unstable_cache(async (slug: string): Promise<Layout | null> => {
  const { data, error } = await supabaseAdmin.from("content_docs").select("doc").eq("kind", "curriculum").eq("key", slug).maybeSingle();
  if (error) throw error;
  return layoutFor((data?.doc as { published?: Module[] | null } | undefined)?.published, undefined);
}, ["learning-layout-v1"], { revalidate: 60, tags: [LEARNING_TAG] });

// The lessons of a cohort in the shape the lesson page reads, or null when nothing is known for it.
export async function getLayout(slug: string): Promise<Layout | null> {
  const { value } = await readWithFallback(source(), () => publishedLayout(slug), () => fileLayout(slug), note(`curriculum of ${slug}`));
  return value;
}

// ---- course ----------------------------------------------------------------------------------------------------------------------------------
type CohortRow = { doc: Record<string, unknown> };
const cohortAndCourse = unstable_cache(async (slug: string): Promise<LearningCourse | null> => {
  const { data, error } = await supabaseAdmin.from("content_docs").select("doc").eq("kind", "cohort").eq("key", slug).maybeSingle();
  if (error) throw error;
  const cohort = data as CohortRow | null;
  if (!cohort) return null;
  const courseSlug = String(cohort.doc.courseSlug ?? "");
  const c = await supabaseAdmin.from("content_docs").select("doc").eq("kind", "course").eq("key", courseSlug).maybeSingle();
  if (c.error) throw c.error;
  const pitch = ((c.data?.doc as { pitch?: { resources?: Record<string, unknown> } } | undefined)?.pitch) ?? {};
  return {
    id: slug, slug, title: String(cohort.doc.title ?? (c.data?.doc as { title?: string } | undefined)?.title ?? slug), statusText: String(cohort.doc.statusText ?? ""),
    duration: String(cohort.doc.duration ?? ""), ...(pitch.resources ? { resources: pitch.resources } : {}),
    ...(cohort.doc.format === "live" || cohort.doc.format === "recorded" ? { format: cohort.doc.format } : {}),   // the cohort's `private` part is never read here
  };
}, ["learning-course-v1"], { revalidate: 60, tags: [LEARNING_TAG] });

const toCourse = (c: FileCourse): LearningCourse => ({ id: c.id, slug: c.slug, title: c.title, statusText: c.statusText ?? "", duration: c.duration ?? "", ...(c.resources ? { resources: c.resources } : {}), ...(c.format ? { format: c.format } : {}) });

// A cohort's title, status text, duration and syllabus: whatever a learner may see on a card or in a heading. Never a link.
export async function getLearningCourse(slug: string): Promise<LearningCourse | null> {
  const { value } = await readWithFallback(source(), () => cohortAndCourse(slug), () => { const f = fileCourse(slug); return f ? toCourse(f) : null; }, note(`course ${slug}`));
  return value;
}

// The cards of the courses a learner holds, in the order the catalog lists them (unknown ones last).
export async function getMyCourses(slugs: string[]): Promise<LearningCourse[]> {
  const order = (s: string) => { const i = files().findIndex((c) => c.slug === s); return i === -1 ? Number.MAX_SAFE_INTEGER : i; };
  const found = await Promise.all([...new Set(slugs)].sort((a, b) => order(a) - order(b)).map((s) => getLearningCourse(s)));
  return found.filter((c): c is LearningCourse => !!c);
}

// ---- private links (never cached, never returned to a caller that has not been checked) ---------------------------------------------------
export type Links = { liveLink: string; whatsappLink: string };
export async function getLinks(slug: string): Promise<Links> {
  const fromFiles = (): Links => { const f = fileCourse(slug); return { liveLink: f?.liveLink ?? "", whatsappLink: f?.whatsappLink ?? "" }; };
  const { value } = await readWithFallback(source(), async () => {
    const { data, error } = await supabaseAdmin.from("content_docs").select("doc").eq("kind", "cohort").eq("key", slug).maybeSingle();
    if (error) throw error;
    if (!data) return null;   // not a portal cohort: the files may still know it
    const priv = ((data.doc as { private?: Partial<Links> }).private) ?? {};
    return { liveLink: priv.liveLink ?? "", whatsappLink: priv.whatsappLink ?? "" };
  }, fromFiles, note(`links of ${slug}`));
  return value;
}

// ---- which course is this lesson in (the public share page) -------------------------------------------------------------------------------
export type LessonFound = { slug: string; title: string; courseTitle: string };
const allPublished = unstable_cache(async (): Promise<Array<{ slug: string; layout: Layout }> | null> => {
  const { data, error } = await supabaseAdmin.from("content_docs").select("key, doc").eq("kind", "curriculum").limit(500);
  if (error) throw error;
  const out = (data ?? []).map((r) => ({ slug: r.key as string, layout: layoutFor((r.doc as { published?: Module[] | null }).published, undefined) })).filter((x): x is { slug: string; layout: Layout } => !!x.layout);
  return out.length ? out : null;
}, ["learning-all-v1"], { revalidate: 60, tags: [LEARNING_TAG] });

export async function findLesson(videoId: string): Promise<LessonFound | null> {
  const fileLayouts = () => Object.keys(courseCurriculumMap).map((slug) => ({ slug, layout: courseCurriculumMap[slug] as Layout }));
  const { value, source: used } = await readWithFallback(source(), () => allPublished(), fileLayouts, note("lesson lookup"));
  let hit = lessonIn(value, videoId);
  if (!hit && used === "database") hit = lessonIn(fileLayouts(), videoId);   // a lesson the portal does not know yet may still be in the files
  if (!hit) return null;
  const course = await getLearningCourse(hit.slug);
  return { slug: hit.slug, title: hit.title, courseTitle: course?.title || "Python Course" };
}
