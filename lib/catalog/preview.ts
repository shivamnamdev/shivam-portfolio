// lib/catalog/preview.ts
// Server-only reader behind the admin-only learner preview. It reads the portal's courses and cohorts in ANY status (never cached, never dependent
// on the PORTAL_* flags: it is an admin tool) and builds the same page objects the public pages use, without private links. The caller (the preview
// layout) has already checked that the viewer is the admin.
import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildCourse, cohortFromDoc, type CatalogCourse, type CourseView } from "./mapping";
import { courseNote, inMode, isPreviewStatus, sortPreview, type PreviewMode, type PreviewStatus } from "./previewView";

export type PreviewCourse = CatalogCourse & { previewStatus: PreviewStatus; previewNote?: string; courseStatus: string | null };
type Row = { kind: string; key: string; status: string; doc: Record<string, unknown> };

async function read(): Promise<{ courses: Map<string, { view: CourseView; status: string }>; cohorts: Row[] }> {
  const { data, error } = await supabaseAdmin.from("content_docs").select("kind, key, status, doc").in("kind", ["course", "cohort"]).limit(2000);
  if (error) throw error;
  const rows = (data ?? []) as Row[];
  const courses = new Map(rows.filter((r) => r.kind === "course").map((r) => [r.key, { view: { slug: r.key, title: r.doc.title, summary: r.doc.summary, pitch: r.doc.pitch } as CourseView, status: r.status }]));
  return { courses, cohorts: rows.filter((r) => r.kind === "cohort" && isPreviewStatus(r.status)) };
}

function build(r: Row, courses: Awaited<ReturnType<typeof read>>["courses"]): PreviewCourse {
  const course = courses.get(String(r.doc.courseSlug));
  const view: CourseView = course?.view ?? { slug: String(r.doc.courseSlug), title: String(r.doc.title ?? r.key) };
  const built = buildCourse(cohortFromDoc(r.key, r.doc, String(view.title)), view, "database", undefined);
  return { ...built, previewStatus: r.status as PreviewStatus, previewNote: courseNote(course?.status ?? null), courseStatus: course?.status ?? null };
}

export async function listPreview(mode: PreviewMode): Promise<PreviewCourse[]> {
  const { courses, cohorts } = await read();
  return sortPreview(cohorts.filter((r) => inMode(mode, r.status as PreviewStatus)).map((r) => build(r, courses)));
}

export async function getPreview(slug: string): Promise<PreviewCourse | null> {
  const { courses, cohorts } = await read();
  const r = cohorts.find((x) => x.key === slug);
  return r ? build(r, courses) : null;
}
