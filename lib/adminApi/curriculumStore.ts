// lib/adminApi/curriculumStore.ts
// Database side of the curriculum API: one content_docs row per cohort (kind 'curriculum'). Every write goes through `curriculumWrite`:
// authorise, rate limit, version check, apply a pure operation (curriculum.ts), enforce the rules that need the database, save, audit.
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { authorize, type Actor } from "./guard";
import { notFound, ok, unprocessable } from "./envelope";
import { ifMatchVersion, limitWrites } from "./request";
import { getRow, insertRow, updateRow } from "./docStore";
import { writeAudit } from "./audit";
import { slug as slugCheck } from "./validate";
import { checkCurriculum, emptyDoc, enforceProtected, examLessonId, hasUnpublishedChanges, removedLessonIds, summary, type CurriculumDoc } from "./curriculum";
import { examGraderExists } from "@/lib/examGraders";

export const cohortParam = (s: string): string => { if (!slugCheck(s).ok) throw notFound("cohort not found"); return s; };

type Row = Awaited<ReturnType<typeof getRow>>;
export const view = (r: Row) => {
  const doc = r.doc as unknown as CurriculumDoc;
  return {
    cohort: r.key, status: r.status, version: r.version, modules: doc.modules, published: doc.published, publishedAt: doc.publishedAt,
    hasUnpublishedChanges: hasUnpublishedChanges(doc), counts: summary(doc.modules), updatedAt: r.updated_at, updatedBy: r.updated_by,
    examGrader: examGraderExists(r.key), examLessonId: examLessonId(doc.modules),   // can the portal mark an exam for this course, and which lesson is it now
  };
};

async function existingRow(cohort: string): Promise<Row | null> {
  try { return await getRow("curriculum", cohort); } catch (e) { if ((e as { status?: number }).status === 404) return null; throw e; }
}

async function requireCohort(cohort: string): Promise<void> {
  const { data, error } = await supabaseAdmin.from("content_docs").select("key").eq("kind", "cohort").eq("key", cohort).maybeSingle();
  if (error) throw error;
  if (!data) throw notFound("cohort not found: create the cohort first");
}

// R4: a lesson learners already have progress on cannot be removed (their progress would point at nothing).
async function refuseIfLearnersHaveProgress(cohort: string, ids: string[]): Promise<void> {
  if (!ids.length) return;
  for (const table of ["video_progress", "assignment_progress"] as const) {
    const { data, error } = await supabaseAdmin.from(table).select("video_id").eq("course_slug", cohort).in("video_id", ids).limit(5);
    if (error) throw error;
    if (data?.length) {
      const hit = Array.from(new Set(data.map((d) => d.video_id as string))).join(", ");
      throw unprocessable(`Learners already have progress on lesson ${hit}. Move or rename it instead of deleting it`);
    }
  }
}

export type WriteOptions = { actor?: Actor; action: string; resourceNote?: Record<string, unknown>; status?: "draft" | "published"; allowProtected?: boolean };

// Routes that read a body call this FIRST, so a visitor gets 401 and a non-admin 403 before any validation answer.
export async function writeActor(req: NextRequest): Promise<Actor> {
  const actor = await authorize(req, "curriculum:write");
  await limitWrites(actor);
  return actor;
}

export async function curriculumWrite(req: NextRequest, cohortRaw: string, change: (doc: CurriculumDoc) => CurriculumDoc, o: WriteOptions) {
  const actor = o.actor ?? (await writeActor(req));
  const cohort = cohortParam(cohortRaw);
  const row = await existingRow(cohort);
  const fresh = !row;
  if (fresh) await requireCohort(cohort);
  const expected = fresh ? 0 : ifMatchVersion(req);   // the first write to a cohort needs no version; later ones say which version they edit
  const before: CurriculumDoc = row ? (row.doc as unknown as CurriculumDoc) : emptyDoc();
  const next = change(before);
  checkCurriculum(next.modules);
  const guarded: CurriculumDoc = { ...next, modules: enforceProtected(before.modules, next.modules, o.allowProtected) };
  await refuseIfLearnersHaveProgress(cohort, removedLessonIds(before.modules, guarded.modules));

  const status = o.status ?? (row?.status as "draft" | "published" | undefined) ?? "draft";
  let saved: Row;
  if (fresh) {
    saved = await insertRow("curriculum", cohort, guarded as unknown as Record<string, unknown>, actor.id);
    if (status !== "draft") saved = await updateRow("curriculum", cohort, saved.version, { status }, actor.id);
  } else {
    saved = await updateRow("curriculum", cohort, expected, { doc: guarded as unknown as Record<string, unknown>, status }, actor.id);
  }
  await writeAudit({
    actor, action: o.action, resource: "curriculum", resourceId: cohort,
    before: { version: row?.version ?? 0, ...summary(before.modules), published: before.published !== null },
    after: { version: saved.version, ...summary(guarded.modules), published: guarded.published !== null, ...(o.resourceNote ?? {}) },
  });
  return ok(view(saved), fresh ? 201 : 200);
}

export async function curriculumRead(req: NextRequest, cohortRaw: string) {
  await authorize(req, "curriculum:read");
  return ok(view(await getRow("curriculum", cohortParam(cohortRaw))));
}
