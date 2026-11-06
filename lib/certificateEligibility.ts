// lib/certificateEligibility.ts
// Server-only. The rule for a course certificate (owner decision, SCP-71): at least 80% of the course tasks done
// AND the final exam passed. Tasks are counted the way the learning page counts them: one per lesson plus one per
// lesson that has an assignment.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { courseCurriculumMap } from "@/data/learning-content";
import { getLayout } from "@/lib/catalog/learning";

export const CERTIFICATE_MIN_PERCENT = 80;

export type Eligibility = { eligible: boolean; percent: number; examPassed: boolean; hasCourse: boolean };

type Modules = Array<{ videoIds?: string[]; githubAssignments?: Record<string, unknown> }>;
// Pure part: easy to unit-test. `layout` is the course's lessons (the data files unless the caller passes the portal's published curriculum).
export function certificatePercent(slug: string, doneVideos: string[], doneAssignments: string[], layout?: Modules | null): number {
  const modules = (layout ?? courseCurriculumMap[slug] ?? []) as Modules;
  const lessons = new Set(modules.flatMap(m => m.videoIds ?? []));
  const assignments = new Set(modules.flatMap(m => Object.keys(m.githubAssignments ?? {})).filter(id => lessons.has(id)));
  const total = lessons.size + assignments.size;
  if (total === 0) return 0;
  const done = doneVideos.filter(id => lessons.has(id)).length + doneAssignments.filter(id => assignments.has(id)).length;
  return Math.round((done / total) * 100);
}

export async function certificateEligibility(userId: string, slug: string): Promise<Eligibility> {
  const layout = await getLayout(slug);
  if (!layout) return { eligible: false, percent: 0, examPassed: false, hasCourse: false };
  const [v, a, e] = await Promise.all([
    supabaseAdmin.from("video_progress").select("video_id").eq("user_id", userId).eq("course_slug", slug),
    supabaseAdmin.from("assignment_progress").select("video_id").eq("user_id", userId).eq("course_slug", slug),
    supabaseAdmin.from("exam_progress").select("is_passed").eq("user_id", userId).eq("course_slug", slug).maybeSingle(),
  ]);
  if (v.error) throw v.error;
  if (a.error) throw a.error;
  if (e.error) throw e.error;
  const percent = certificatePercent(slug, [...new Set((v.data ?? []).map(r => r.video_id as string))], [...new Set((a.data ?? []).map(r => r.video_id as string))], layout);
  const examPassed = !!e.data?.is_passed;
  return { eligible: percent >= CERTIFICATE_MIN_PERCENT && examPassed, percent, examPassed, hasCourse: true };
}
