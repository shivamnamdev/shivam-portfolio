// lib/adminApi/enrolments.ts
// Pure rules of slice 3c (no database, no network): granting and revoking an enrolment, the CSV files and the count-only reports.
// The database side is enrolmentStore.ts. Owner decision for revoke: user_enrollments has no "source" column, so everything the admin API
// did not grant itself (paid, coupon or older manual rows) is protected; only the owner session may remove it, and only with force.
import { ApiError, badRequest, conflict, type FieldErrors } from "./envelope";
import { optional, slug, str, email, type Check } from "./validate";
import type { Pricing } from "./cohorts";
import type { Role } from "./permissions";

// ---- grant -------------------------------------------------------------------------------------------------------------------------------
const clerkId: Check<string> = (v) => {
  const s = str({ max: 64, pattern: /^user_[A-Za-z0-9]+$/ })(v);
  return s.ok ? s : { ok: false, message: "must be a Clerk user id such as user_2abc..." };
};
export const grantShape = { cohortSlug: slug, userId: optional(clerkId), email: optional(email), planId: optional(slug) };

// Exactly one way to name the learner.
export function assertGrantTarget(input: { userId?: string; email?: string }): void {
  const f: FieldErrors = {};
  if (input.userId && input.email) f.email = "send either userId or email, not both";
  else if (!input.userId && !input.email) f.userId = "send userId or email";
  if (Object.keys(f).length) throw badRequest("Some fields are not valid", f);
}

// A plan can only be recorded on a cohort that sells plans, and it must be one of them. `pricing` is undefined for a course that exists only
// in the older static list (no plans known there).
export function assertPlanFits(pricing: Pricing | undefined, planId: string | undefined): void {
  if (!planId) return;
  if (!pricing || pricing.kind !== "plans") throw badRequest("Some fields are not valid", { planId: "this cohort has no plans" });
  if (!pricing.plans.some((p) => p.id === planId)) {
    throw badRequest("Some fields are not valid", { planId: `not a plan of this cohort. Use one of: ${pricing.plans.map((p) => p.id).join(", ")}` });
  }
}

// ---- revoke ------------------------------------------------------------------------------------------------------------------------------
// An enrolment counts as granted by the admin API only when a "grant" audit entry names THIS row (the entry stores the saved enrolment, id
// included). A later purchase of the same course by the same learner is a new row with a new id, so an old grant never covers it.
export function grantedByAdmin(enrolmentId: string, grantAudits: Array<{ after: unknown }>): boolean {
  return grantAudits.some((a) => !!a.after && typeof a.after === "object" && (a.after as { id?: unknown }).id === enrolmentId);
}

export type RevokeInput = { adminGranted: boolean; force: boolean; role: Role };
export function assertRevokeAllowed({ adminGranted, force, role }: RevokeInput): void {
  if (adminGranted) return;
  if (!force) {
    throw conflict("This enrolment was not granted through the admin API (it may be paid or from a coupon). Refund first. To remove it anyway the owner sends force=true");
  }
  if (role !== "owner") throw new ApiError(403, "forbidden", "Only the owner session can force-remove an enrolment");
}

// ---- CSV ---------------------------------------------------------------------------------------------------------------------------------
// O2: a cell that starts with = + - @ tab or CR can run as a formula in a spreadsheet, so it gets a leading ' (shown as plain text). Every cell is
// quoted and inner quotes are doubled. Numbers and booleans are written as they are (they cannot start a formula).
export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '""';
  let s = String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}
export const toCsv = (headers: string[], rows: unknown[][]): string => [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";

export type EnrolmentRow = {
  id: string; userId: string; email: string | null; name: string; cohortSlug: string; planId: string | null; couponUsed: string | null; enrolledAt: string;
};
// Columns of the exports: no payment ids, tokens or private links ever appear in a row (they are not even loaded).
export const ENROLMENT_COLUMNS = ["userId", "email", "name", "cohortSlug", "planId", "couponUsed", "enrolledAt"];
export const enrolmentCsv = (rows: EnrolmentRow[]): string =>
  toCsv(ENROLMENT_COLUMNS, rows.map((r) => [r.userId, r.email, r.name, r.cohortSlug, r.planId, r.couponUsed, r.enrolledAt]));

export type LearnerSummary = { userId: string; email: string | null; name: string; enrolments: number; firstEnrolledAt: string };
// One row per learner, from their enrolments (the learners export lists people who own at least one course).
export function summariseLearners(rows: EnrolmentRow[]): LearnerSummary[] {
  const by = new Map<string, LearnerSummary>();
  for (const r of rows) {
    const cur = by.get(r.userId);
    if (!cur) { by.set(r.userId, { userId: r.userId, email: r.email, name: r.name, enrolments: 1, firstEnrolledAt: r.enrolledAt }); continue; }
    cur.enrolments += 1;
    if (Date.parse(r.enrolledAt) < Date.parse(cur.firstEnrolledAt)) cur.firstEnrolledAt = r.enrolledAt;
  }
  return [...by.values()].sort((a, b) => a.firstEnrolledAt.localeCompare(b.firstEnrolledAt) || a.userId.localeCompare(b.userId));
}
export const learnerCsv = (rows: LearnerSummary[]): string =>
  toCsv(["userId", "email", "name", "enrolments", "firstEnrolledAt"], rows.map((r) => [r.userId, r.email, r.name, r.enrolments, r.firstEnrolledAt]));

export const EXPORTS = ["enrolments.csv", "learners.csv"] as const;
export type ExportFile = (typeof EXPORTS)[number];
export const isExportFile = (s: string): s is ExportFile => (EXPORTS as readonly string[]).includes(s);

// ---- reports (O3: counts only, never a name, e-mail or id of a person) --------------------------------------------------------------------
export const REPORTS = ["enrolments-per-cohort", "signups-per-day", "coupon-usage"] as const;
export type ReportName = (typeof REPORTS)[number];
export const isReport = (s: string): s is ReportName => (REPORTS as readonly string[]).includes(s);

export const REPORT_DAYS = { min: 1, max: 90, default: 30 };

export function countByCohort(slugs: string[]): Array<{ cohortSlug: string; enrolments: number }> {
  const m = new Map<string, number>();
  for (const s of slugs) m.set(s, (m.get(s) ?? 0) + 1);
  return [...m].map(([cohortSlug, enrolments]) => ({ cohortSlug, enrolments })).sort((a, b) => b.enrolments - a.enrolments || a.cohortSlug.localeCompare(b.cohortSlug));
}

const day = (d: Date) => d.toISOString().slice(0, 10);
// One bucket for each of the last `days` UTC days ending today (oldest first), empty days included as 0. Dates outside the range are ignored.
export function countPerDay(timestamps: Array<string | number>, days: number, now: Date): Array<{ date: string; count: number }> {
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) buckets.set(day(new Date(now.getTime() - i * 86_400_000)), 0);
  for (const t of timestamps) {
    const ms = typeof t === "number" ? t : Date.parse(t);
    if (Number.isNaN(ms)) continue;
    const k = day(new Date(ms));
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) as number) + 1);
  }
  return [...buckets].map(([date, count]) => ({ date, count }));
}

export type CouponUsageRow = { code: string; kind: string; redemptions: number; maxRedemptions: number | null; active: boolean; expiresAt: string; expired: boolean };
export function couponUsage(rows: Array<{ code: string; kind: string; redemptions: number | null; max_redemptions: number | null; active: boolean; expires_at: string }>, now: Date): CouponUsageRow[] {
  return rows.map((r) => ({
    code: r.code, kind: r.kind, redemptions: r.redemptions ?? 0, maxRedemptions: r.max_redemptions, active: r.active, expiresAt: r.expires_at, expired: Date.parse(r.expires_at) <= now.getTime(),
  })).sort((a, b) => b.redemptions - a.redemptions || a.code.localeCompare(b.code));
}

export function reportDays(raw: string | null): number {
  if (raw === null || raw === "") return REPORT_DAYS.default;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < REPORT_DAYS.min || n > REPORT_DAYS.max) throw badRequest(`days must be a whole number from ${REPORT_DAYS.min} to ${REPORT_DAYS.max}`);
  return n;
}
