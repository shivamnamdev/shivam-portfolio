// lib/catalog/previewView.ts
// Pure rules of the admin-only learner preview (/preview/courses): which cohorts a view lists, in what order, and the note on a card whose course
// is not in order. No database, no network.
export type PreviewStatus = "draft" | "published" | "archived";
export type PreviewMode = "active" | "archived";

// The list shows draft and published cohorts by default; "archived" shows only the archived ones (greyed out in the page). Anything else is "active".
export const parseMode = (v: string | string[] | null | undefined): PreviewMode => (v === "archived" ? "archived" : "active");
export const inMode = (mode: PreviewMode, status: PreviewStatus): boolean => (mode === "archived" ? status === "archived" : status !== "archived");

// Drafts first (the thing being worked on), then published, then archived; by slug inside a group.
const ORDER: Record<PreviewStatus, number> = { draft: 0, published: 1, archived: 2 };
export const sortPreview = <T extends { slug: string; previewStatus: PreviewStatus }>(items: T[]): T[] =>
  [...items].sort((a, b) => ORDER[a.previewStatus] - ORDER[b.previewStatus] || a.slug.localeCompare(b.slug));

// A short note for a card whose course is missing or not published (a cohort of an unpublished course is not on the public site even when published).
export function courseNote(courseStatus: string | null | undefined): string | undefined {
  if (courseStatus === null || courseStatus === undefined) return "its course is missing";
  return courseStatus === "published" ? undefined : `its course is ${courseStatus}`;
}

export const isPreviewStatus = (v: unknown): v is PreviewStatus => v === "draft" || v === "published" || v === "archived";
