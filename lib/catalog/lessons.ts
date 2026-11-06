// lib/catalog/lessons.ts
// Pure lookup used by the public share page: which course and lesson title a video id belongs to. No database, no network.
import type { Layout } from "@/lib/adminApi/progress";

// The share page's wording, kept as it was: the assignment's title when the lesson has one, otherwise "Lesson n" (n counts within its module).
export function lessonIn(layouts: Array<{ slug: string; layout: Layout }>, videoId: string): { slug: string; title: string } | null {
  for (const { slug, layout } of layouts) {
    for (const m of layout) {
      const i = (m.videoIds ?? []).indexOf(videoId);
      if (i === -1) continue;
      const t = m.githubAssignments?.[videoId]?.title;
      return { slug, title: typeof t === "string" && t ? t : `Lesson ${i + 1}` };
    }
  }
  return null;
}
