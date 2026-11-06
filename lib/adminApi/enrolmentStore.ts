// lib/adminApi/enrolmentStore.ts
// Database side of slice 3c: enrolments (list, grant, revoke), the three count-only reports and the rows behind the CSV exports. The rules are
// in enrolments.ts (pure). Nothing here reads payment ids, tokens or private links: only the columns named in COLS are ever selected.
import { clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { activeCourses } from "@/data/courses";
import { grantEnrollment } from "@/lib/enrollments";
import { getDisplayName, getPrimaryEmail } from "@/lib/serverAuth";
import { ApiError, badRequest, notFound, unprocessable } from "./envelope";
import { likeSafe, type ListParams } from "./request";
import { idsForEmails } from "./learners";
import type { Pricing } from "./cohorts";
import {
  assertGrantTarget, assertPlanFits, countByCohort, countPerDay, couponUsage, grantedByAdmin, type CouponUsageRow, type EnrolmentRow,
} from "./enrolments";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const idParam = (s: string): string => { if (!UUID.test(s)) throw notFound("enrolment not found"); return s.toLowerCase(); };

type Row = { id: string; user_id: string; user_email: string | null; user_name: string | null; course_slug: string; plan_id?: string | null; coupon_used: string | null; enrolled_at: string };
const BASE_COLS = "id, user_id, user_email, user_name, course_slug, coupon_used, enrolled_at";
const COLS = `${BASE_COLS}, plan_id`;
const columnMissing = (e: { code?: string } | null) => e?.code === "42703";

export const toEnrolment = (r: Row): EnrolmentRow => ({
  id: r.id, userId: r.user_id, email: r.user_email, name: r.user_name ?? "", cohortSlug: r.course_slug, planId: r.plan_id ?? null, couponUsed: r.coupon_used, enrolledAt: r.enrolled_at,
});

// Runs a read with plan_id, and again without it on a database that has no such column (production until the plan column is added).
async function withPlanFallback<T>(run: (cols: string) => PromiseLike<{ data: T | null; error: { code?: string } | null }>): Promise<T> {
  let r = await run(COLS);
  if (columnMissing(r.error)) r = await run(BASE_COLS);
  if (r.error) throw r.error;
  return (r.data ?? []) as T;
}

export type EnrolmentFilter = { cohortSlug: string | null; userId: string | null };

export async function listEnrolments(p: ListParams, f: EnrolmentFilter): Promise<{ items: EnrolmentRow[]; next: string | null }> {
  if (p.cursor && Number.isNaN(Date.parse(p.cursor))) throw badRequest("cursor is not valid");
  const rows = await withPlanFallback<Row[]>((cols) => {
    let q = supabaseAdmin.from("user_enrollments").select(cols).order("enrolled_at", { ascending: false }).limit(p.limit + 1);
    if (f.cohortSlug) q = q.eq("course_slug", f.cohortSlug);
    if (f.userId) q = q.eq("user_id", f.userId);
    if (p.cursor) q = q.lt("enrolled_at", p.cursor);
    if (p.q) { const s = likeSafe(p.q); if (s) q = q.or(`user_email.ilike.%${s}%,user_name.ilike.%${s}%`); }
    return q as never;
  });
  return { items: rows.slice(0, p.limit).map(toEnrolment), next: rows.length > p.limit ? rows[p.limit - 1].enrolled_at : null };
}

export async function getEnrolment(id: string): Promise<EnrolmentRow> {
  const rows = await withPlanFallback<Row[]>((cols) => supabaseAdmin.from("user_enrollments").select(cols).eq("id", id).limit(1) as never);
  if (!rows.length) throw notFound("enrolment not found");
  return toEnrolment(rows[0]);
}

// Every enrolment for an export or a report, in pages of 1000, never more than `max` rows (the caller is told when it was cut).
export async function allEnrolments(max = 20_000): Promise<{ rows: EnrolmentRow[]; truncated: boolean }> {
  const out: EnrolmentRow[] = [];
  for (let from = 0; from < max; from += 1000) {
    const page = await withPlanFallback<Row[]>((cols) => supabaseAdmin.from("user_enrollments").select(cols).order("enrolled_at", { ascending: true }).order("id", { ascending: true }).range(from, from + 999) as never);
    out.push(...page.map(toEnrolment));
    if (page.length < 1000) return { rows: out, truncated: false };
  }
  return { rows: out, truncated: true };
}

// ---- grant -------------------------------------------------------------------------------------------------------------------------------
// The cohort a learner can be put in: one made in the admin API, or (until phase 5) a course of the older static list. Plans exist only on the first.
async function cohortPricing(cohortSlug: string): Promise<Pricing | undefined> {
  const { data, error } = await supabaseAdmin.from("content_docs").select("doc").eq("kind", "cohort").eq("key", cohortSlug).maybeSingle();
  if (error) throw error;
  if (data) return (data.doc as { pricing: Pricing }).pricing;
  if (activeCourses.some((c) => c.slug === cohortSlug)) return undefined;
  throw unprocessable(`cohort not found: ${cohortSlug}`);
}

export async function grant(input: { cohortSlug: string; userId?: string; email?: string; planId?: string }, actorLabel: string): Promise<EnrolmentRow> {
  assertGrantTarget(input);
  const pricing = await cohortPricing(input.cohortSlug);
  assertPlanFits(pricing, input.planId);

  let userId: string; let email: string | null; let name: string;
  if (input.userId) {
    let u;
    try { u = await clerkClient.users.getUser(input.userId); } catch { throw notFound("no signed-up user with that id"); }
    userId = u.id; email = getPrimaryEmail(u); name = getDisplayName(u, "");
  } else {
    const [found] = await idsForEmails([input.email as string]);   // 400 naming the address when nobody has signed up with it
    userId = found.id; email = found.email; name = found.name;
  }

  let created: boolean;
  try {
    ({ created } = await grantEnrollment({
      userId, courseSlug: input.cohortSlug, userName: name || "Manual Enrollment", userEmail: email ?? "Unknown Email", planId: input.planId ?? null,
      activityMessage: `Admin API: access to ${input.cohortSlug} granted by ${actorLabel}`,
    }));
  } catch (e) {
    if (columnMissing(e as { code?: string })) throw unprocessable("Plans are not recorded in this database yet (user_enrollments.plan_id is missing)");
    throw e;
  }
  if (!created) throw new ApiError(409, "conflict", "This learner is already enrolled in that cohort");

  const rows = await withPlanFallback<Row[]>((cols) => supabaseAdmin.from("user_enrollments").select(cols).eq("user_id", userId).eq("course_slug", input.cohortSlug).limit(1) as never);
  return toEnrolment(rows[0]);
}

// ---- revoke ------------------------------------------------------------------------------------------------------------------------------
export const enrolmentKey = (e: { userId: string; cohortSlug: string }) => `${e.userId}:${e.cohortSlug}`;

export async function wasGrantedByAdmin(e: EnrolmentRow): Promise<boolean> {
  const { data, error } = await supabaseAdmin.from("admin_audit").select("after").eq("resource", "enrolment").eq("action", "grant").eq("resource_id", enrolmentKey(e)).order("id", { ascending: false }).limit(20);
  if (error) throw error;
  return grantedByAdmin(e.id, (data ?? []) as Array<{ after: unknown }>);
}

// Removes the enrolment row only. The learner's progress and submissions stay, so a re-grant restores them.
export async function revoke(e: EnrolmentRow): Promise<void> {
  const { error } = await supabaseAdmin.from("user_enrollments").delete().eq("id", e.id);
  if (error) throw error;
}

// ---- reports (counts only) ---------------------------------------------------------------------------------------------------------------
export async function enrolmentsPerCohort() {
  const { rows, truncated } = await allEnrolments();
  return { rows: countByCohort(rows.map((r) => r.cohortSlug)), total: rows.length, truncated };
}

// New signups per UTC day from Clerk, newest first, stopping once the window is passed. At most 10 pages of 500 (5,000 people).
export async function signupsPerDay(days: number, now: Date) {
  const since = now.getTime() - days * 86_400_000;
  const stamps: number[] = []; let truncated = false;
  for (let page = 0; page < 10; page++) {
    const users = await clerkClient.users.getUserList({ orderBy: "-created_at", limit: 500, offset: page * 500 });
    stamps.push(...users.map((u) => u.createdAt));
    if (users.length < 500 || users[users.length - 1].createdAt < since) break;
    if (page === 9) truncated = true;
  }
  const rows = countPerDay(stamps, days, now);
  return { rows, total: rows.reduce((n, r) => n + r.count, 0), truncated };
}

export async function couponUsageReport(now: Date): Promise<{ rows: CouponUsageRow[]; total: number; truncated: boolean }> {
  const { data, error } = await supabaseAdmin.from("coupons").select("code, kind, redemptions, max_redemptions, active, expires_at").limit(1001);
  if (error) throw error;
  const all = data ?? [];
  const rows = couponUsage(all.slice(0, 1000) as never, now);
  return { rows, total: rows.reduce((n, r) => n + r.redemptions, 0), truncated: all.length > 1000 };
}
