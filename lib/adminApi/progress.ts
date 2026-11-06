// lib/adminApi/progress.ts
// Pure rules of slice 4f (no database, no network): lesson totals, percent complete, lesson titles, the per-learner tally and the shape of each
// row the read-only progress, submissions and engagement routes return. The database side is progressStore.ts. Nothing here ever sees code.
import { badRequest } from "./envelope";
import { slug } from "./validate";
import { toLegacy, type Module } from "./curriculum";

// The shape the learner pages read today (data/learning-content.ts); a published curriculum is converted to it with toLegacy.
export type Layout = Array<{ moduleTitle: string; videoIds?: string[]; githubAssignments?: Record<string, { title?: unknown }> }>;
export type Totals = { videos: number; assignments: number };

export const totalsOf = (layout: Layout): Totals => ({
  videos: layout.reduce((n, m) => n + (m.videoIds?.length ?? 0), 0),
  assignments: layout.reduce((n, m) => n + (m.videoIds ?? []).filter((v) => m.githubAssignments?.[v]).length, 0),
});

// Which lessons count for a cohort: its PUBLISHED curriculum when it has one, otherwise the older static list, otherwise nothing is known (null).
export function layoutFor(published: Module[] | null | undefined, fallback: Layout | undefined): Layout | null {
  if (published && published.length) return toLegacy(published) as Layout;
  return fallback && fallback.length ? fallback : null;
}

// Videos plus assignments done over videos plus assignments in the course, a whole percent, never above 100 (progress on a lesson that was
// removed later can make "done" larger than the total). null when the total is unknown or zero: nothing is guessed.
export function percentOf(videosDone: number, assignmentsDone: number, totals: Totals | null): number | null {
  if (!totals) return null;
  const all = totals.videos + totals.assignments;
  if (all <= 0) return null;
  return Math.min(100, Math.round(((videosDone + assignmentsDone) / all) * 100));
}

// The assignment's title, else "<module> (Lesson n)"; "Unknown lesson" when the cohort has no curriculum or the id is not in it.
export function lessonTitle(layout: Layout | null, lessonId: string): string {
  for (const m of layout ?? []) {
    const i = (m.videoIds ?? []).indexOf(lessonId);
    if (i === -1) continue;
    const t = m.githubAssignments?.[lessonId]?.title;
    return typeof t === "string" && t.trim() ? t : `${m.moduleTitle} (Lesson ${i + 1})`;
  }
  return "Unknown lesson";
}

export const tallyKey = (userId: string, cohortSlug: string) => `${userId}\u0000${cohortSlug}`;
// Counts rows per learner and cohort and remembers the latest time.
export function tally(rows: Array<{ user_id: string; course_slug: string; completed_at: string | null }>): Map<string, { count: number; last: string | null }> {
  const m = new Map<string, { count: number; last: string | null }>();
  for (const r of rows) {
    const k = tallyKey(r.user_id, r.course_slug);
    const cur = m.get(k) ?? { count: 0, last: null };
    cur.count += 1;
    if (r.completed_at && (!cur.last || Date.parse(r.completed_at) > Date.parse(cur.last))) cur.last = r.completed_at;
    m.set(k, cur);
  }
  return m;
}
export const laterOf = (a: string | null, b: string | null): string | null => (!a ? b : !b ? a : Date.parse(a) >= Date.parse(b) ? a : b);

export type Who = { name: string; email: string | null };
export type ProgressRow = {
  userId: string; name: string; email: string | null; cohortSlug: string; videosDone: number; totalVideos: number | null; assignmentsDone: number;
  totalAssignments: number | null; percent: number | null; lastActivityAt: string | null;
};
export function progressRow(e: { userId: string; cohortSlug: string }, who: Who, videos: { count: number; last: string | null } | undefined, assignments: { count: number; last: string | null } | undefined, totals: Totals | null): ProgressRow {
  const v = videos?.count ?? 0; const a = assignments?.count ?? 0;
  return {
    userId: e.userId, name: who.name, email: who.email, cohortSlug: e.cohortSlug, videosDone: v, totalVideos: totals ? totals.videos : null, assignmentsDone: a,
    totalAssignments: totals ? totals.assignments : null, percent: percentOf(v, a, totals), lastActivityAt: laterOf(videos?.last ?? null, assignments?.last ?? null),
  };
}

export type SubmissionRow = { id: string; userId: string; name: string; email: string | null; cohortSlug: string; lessonId: string; lessonTitle: string; completedAt: string | null; codeLength: number };
export function submissionRow(r: { id: string; user_id: string; course_slug: string; video_id: string; completed_at: string | null; submitted_code: string | null }, who: Who, layout: Layout | null): SubmissionRow {
  return { id: r.id, userId: r.user_id, name: who.name, email: who.email, cohortSlug: r.course_slug, lessonId: r.video_id, lessonTitle: lessonTitle(layout, r.video_id), completedAt: r.completed_at, codeLength: (r.submitted_code ?? "").length };
}
// The one place a row carries code: the single-submission route.
export const submissionWithCode = (row: SubmissionRow, code: string | null) => ({ ...row, submittedCode: code ?? "" });

export type EngagementRow = { userId: string; name: string; email: string | null; totalTimeSeconds: number; currentStreak: number; lastActiveDate: string | null };
export function engagementRow(r: { user_id: string; total_time_seconds: number | null; current_streak: number | null; last_active_date: string | null }, who: Who): EngagementRow {
  return { userId: r.user_id, name: who.name, email: who.email, totalTimeSeconds: Math.max(0, r.total_time_seconds ?? 0), currentStreak: Math.max(0, r.current_streak ?? 0), lastActiveDate: r.last_active_date };
}

// A person shown as the sign-in provider knows them, falling back to what the row stored, then to "Unknown student".
export function whoOf(clerk: { name: string; email: string | null } | undefined, stored: { name?: string | null; email?: string | null } = {}): Who {
  const name = (clerk?.name && clerk.name !== "(user not found)" ? clerk.name : "") || stored.name || "Unknown student";
  return { name, email: clerk?.email ?? stored.email ?? null };
}

// ?cohortSlug and ?userId, checked the same way as the enrolments list.
export function parseFilters(u: URL): { cohortSlug: string | null; userId: string | null } {
  const cohortSlug = u.searchParams.get("cohortSlug");
  if (cohortSlug && !slug(cohortSlug).ok) throw badRequest("cohortSlug is not valid");
  const userId = u.searchParams.get("userId");
  if (userId && !/^user_[A-Za-z0-9]{1,60}$/.test(userId)) throw badRequest("userId is not valid");
  return { cohortSlug: cohortSlug || null, userId: userId || null };
}

// One signed-up person in the directory: who they are, when they joined, how many enrolments they hold, and whether that makes them a learner
// (at least one enrolment) or a lead (none yet). Counts only: no payment, coupon or link field.
export type DirectoryRow = { id: string; name: string; email: string | null; joinedAt: string | null; enrolments: number; status: "enrolled" | "lead" };
export function directoryRow(ref: { id: string; name: string; email: string | null }, createdAtMs: number | null | undefined, enrolments: number): DirectoryRow {
  const n = Math.max(0, Math.floor(enrolments) || 0);
  const t = typeof createdAtMs === "number" && Number.isFinite(createdAtMs) ? new Date(createdAtMs).toISOString() : null;
  return { id: ref.id, name: ref.name || "Unknown student", email: ref.email, joinedAt: t, enrolments: n, status: n > 0 ? "enrolled" : "lead" };
}

// Engagement pages by position (the list is ordered by time spent, which has no stable key to continue from).
export function offsetCursor(raw: string | null): number {
  if (raw === null) return 0;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 1_000_000) throw badRequest("cursor is not valid");
  return n;
}
