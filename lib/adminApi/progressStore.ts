// lib/adminApi/progressStore.ts
// Database side of slice 4f: read-only lists of progress, submissions and engagement, and one submission with its code. The rules and row
// shapes are in progress.ts (pure). Only the columns named here are selected; the lists never select or return code.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { courseCurriculumMap } from "@/data/learning-content";
import { badRequest, notFound } from "./envelope";
import { likeSafe, type ListParams } from "./request";
import { refsForIds, searchLearners } from "./learners";
import type { Module } from "./curriculum";
import {
  engagementRow, layoutFor, offsetCursor, progressRow, submissionRow, submissionWithCode, tally, tallyKey, totalsOf, whoOf,
  type EngagementRow, type Layout, type ProgressRow, type SubmissionRow, type Who,
} from "./progress";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const idParam = (s: string): string => { if (!UUID.test(s)) throw notFound("submission not found"); return s.toLowerCase(); };

const unique = <T,>(xs: T[]): T[] => Array.from(new Set(xs));

// Layout (lessons) per cohort, in one query for all cohorts on the page.
async function layoutsFor(cohorts: string[]): Promise<Map<string, Layout | null>> {
  const out = new Map<string, Layout | null>();
  const slugs = unique(cohorts);
  if (!slugs.length) return out;
  const { data, error } = await supabaseAdmin.from("content_docs").select("key, doc").eq("kind", "curriculum").in("key", slugs);
  if (error) throw error;
  const published = new Map((data ?? []).map((r) => [r.key as string, (r.doc as { published: Module[] | null }).published]));
  for (const s of slugs) out.set(s, layoutFor(published.get(s), courseCurriculumMap[s] as Layout | undefined));
  return out;
}

async function whoFor(ids: string[]): Promise<Map<string, { name: string; email: string | null }>> {
  const refs = await refsForIds(unique(ids));
  return new Map(refs.map((r) => [r.id, { name: r.name, email: r.email }]));
}

export type Filter = { cohortSlug: string | null; userId: string | null };

// ---- progress: one row per enrolment ---------------------------------------------------------------------------------------------------------
export async function listProgress(p: ListParams, f: Filter): Promise<{ items: ProgressRow[]; next: string | null }> {
  let q = supabaseAdmin.from("user_enrollments").select("user_id, user_email, user_name, course_slug, enrolled_at").order("enrolled_at", { ascending: false }).limit(p.limit + 1);
  if (f.cohortSlug) q = q.eq("course_slug", f.cohortSlug);
  if (f.userId) q = q.eq("user_id", f.userId);
  if (p.cursor) { if (Number.isNaN(Date.parse(p.cursor))) throw badCursor(); q = q.lt("enrolled_at", p.cursor); }
  if (p.q) { const s = likeSafe(p.q); if (s) q = q.or(`user_email.ilike.%${s}%,user_name.ilike.%${s}%`); }
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as Array<{ user_id: string; user_email: string | null; user_name: string | null; course_slug: string; enrolled_at: string }>;
  const page = rows.slice(0, p.limit);
  if (!page.length) return { items: [], next: null };
  const ids = unique(page.map((r) => r.user_id)); const cohorts = unique(page.map((r) => r.course_slug));
  const [vids, asses, layouts, people] = await Promise.all([
    supabaseAdmin.from("video_progress").select("user_id, course_slug, completed_at").in("user_id", ids).in("course_slug", cohorts).limit(20000),
    supabaseAdmin.from("assignment_progress").select("user_id, course_slug, completed_at").in("user_id", ids).in("course_slug", cohorts).limit(20000),
    layoutsFor(cohorts), whoFor(ids),
  ]);
  if (vids.error) throw vids.error;
  if (asses.error) throw asses.error;
  const v = tally(vids.data ?? []); const a = tally(asses.data ?? []);
  const items = page.map((r) => {
    const layout = layouts.get(r.course_slug) ?? null;
    return progressRow({ userId: r.user_id, cohortSlug: r.course_slug }, whoOf(people.get(r.user_id), { name: r.user_name, email: r.user_email }), v.get(tallyKey(r.user_id, r.course_slug)), a.get(tallyKey(r.user_id, r.course_slug)), layout ? { videos: totalsOf(layout).videos, assignments: totalsOf(layout).assignments } : null);
  });
  return { items, next: rows.length > p.limit ? page[page.length - 1].enrolled_at : null };
}

// ---- submissions (no code in a list) ----------------------------------------------------------------------------------------------------------
const SUB_COLS = "id, user_id, user_name, course_slug, video_id, completed_at";
type SubRow = { id: string; user_id: string; user_name: string | null; course_slug: string; video_id: string; completed_at: string | null; submitted_code: string | null };

export async function listSubmissions(p: ListParams, f: Filter): Promise<{ items: SubmissionRow[]; next: string | null }> {
  // The code is read only to count its length and is dropped before the answer is built.
  let q = supabaseAdmin.from("assignment_progress").select(`${SUB_COLS}, submitted_code`).order("completed_at", { ascending: false }).limit(p.limit + 1);
  if (f.cohortSlug) q = q.eq("course_slug", f.cohortSlug);
  if (f.userId) q = q.eq("user_id", f.userId);
  if (p.cursor) { if (Number.isNaN(Date.parse(p.cursor))) throw badCursor(); q = q.lt("completed_at", p.cursor); }
  if (p.q) {
    const s = likeSafe(p.q);
    if (s) {
      const ids = (await searchLearners(s, 50)).map((l) => l.id).filter((id) => /^user_[A-Za-z0-9]+$/.test(id));
      q = q.or([`user_name.ilike.%${s}%`, ...(ids.length ? [`user_id.in.(${ids.join(",")})`] : [])].join(","));
    }
  }
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as SubRow[];
  const page = rows.slice(0, p.limit);
  if (!page.length) return { items: [], next: null };
  const [layouts, people] = await Promise.all([layoutsFor(page.map((r) => r.course_slug)), whoFor(page.map((r) => r.user_id))]);
  const items = page.map((r) => submissionRow(r, whoOf(people.get(r.user_id), { name: r.user_name }), layouts.get(r.course_slug) ?? null));
  return { items, next: rows.length > p.limit ? page[page.length - 1].completed_at : null };
}

export async function getSubmission(id: string): Promise<SubmissionRow & { submittedCode: string }> {
  const { data, error } = await supabaseAdmin.from("assignment_progress").select(`${SUB_COLS}, submitted_code`).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw notFound("submission not found");
  const r = data as SubRow;
  const [layouts, people] = await Promise.all([layoutsFor([r.course_slug]), whoFor([r.user_id])]);
  return submissionWithCode(submissionRow(r, whoOf(people.get(r.user_id), { name: r.user_name }), layouts.get(r.course_slug) ?? null), r.submitted_code);
}

// ---- engagement --------------------------------------------------------------------------------------------------------------------------------
export async function listEngagement(p: ListParams): Promise<{ items: EngagementRow[]; next: string | null }> {
  const from = offsetCursor(p.cursor);
  let q = supabaseAdmin.from("user_stats").select("user_id, total_time_seconds, current_streak, last_active_date").order("total_time_seconds", { ascending: false }).order("user_id", { ascending: true }).range(from, from + p.limit);
  if (p.q) {
    const s = likeSafe(p.q);
    const ids = s ? (await searchLearners(s, 50)).map((l) => l.id).filter((id) => /^user_[A-Za-z0-9]+$/.test(id)) : [];
    if (!ids.length) return { items: [], next: null };
    q = q.in("user_id", ids);
  }
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as Array<{ user_id: string; total_time_seconds: number | null; current_streak: number | null; last_active_date: string | null }>;
  const page = rows.slice(0, p.limit);
  const people = await whoFor(page.map((r) => r.user_id));
  return { items: page.map((r) => engagementRow(r, whoOf(people.get(r.user_id)) as Who)), next: rows.length > p.limit ? String(from + p.limit) : null };
}

const badCursor = () => badRequest("cursor is not valid");
