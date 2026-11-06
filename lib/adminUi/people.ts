// lib/adminUi/people.ts
// Pure helpers behind the Enrolments and Reports screens: the grant form (hints and body), the two-step revoke, report bars and the CSV file name.
// The server decides every rule; unit tests run the form through the server's own grant checks so the hints cannot drift.
import { isSlug } from "./forms";
import type { Failure } from "./client";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export type PlanLite = { id: string; name: string };
export type GrantForm = { cohortSlug: string; email: string; planId: string };
export const emptyGrantForm = (): GrantForm => ({ cohortSlug: "", email: "", planId: "" });

// `plans` = the chosen cohort's plans: undefined when it has none (single price, or a course of the older list), so no plan may be picked.
export function grantProblems(f: GrantForm, plans: PlanLite[] | undefined): string[] {
  const out: string[] = [];
  if (!isSlug(f.cohortSlug.trim())) out.push("Choose the cohort");
  const e = f.email.trim();
  if (!e) out.push("Enter the learner's e-mail (they must have signed up)");
  else if (!EMAIL.test(e) || e.length > 254) out.push("That does not look like an e-mail address");
  if (f.planId.trim()) {
    if (!plans || !plans.length) out.push("This cohort has no plans");
    else if (!plans.some((p) => p.id === f.planId.trim())) out.push(`Choose one of: ${plans.map((p) => p.id).join(", ")}`);
  }
  return out;
}
export function grantBody(f: GrantForm): Record<string, string> {
  const body: Record<string, string> = { cohortSlug: f.cohortSlug.trim(), email: f.email.trim().toLowerCase() };
  if (f.planId.trim()) body.planId = f.planId.trim();
  return body;
}

// Revoke is two steps: first without force. The server answers 409 for anything the admin API did not grant itself (paid, coupon, older manual),
// and only then does the screen offer the owner's "remove anyway". Any other failure is shown as it is.
export const needsForce = (f: Failure): boolean => f.status === 409;
export const revokePath = (id: string, force: boolean): string => `/enrolments/${encodeURIComponent(id)}${force ? "?force=true" : ""}`;

// Bar widths in percent for a report: the largest is 100, any non-zero count is at least 3 so it stays visible, zero is 0.
export function barWidths(counts: number[]): number[] {
  const max = Math.max(0, ...counts);
  return counts.map((c) => (c <= 0 || max <= 0 ? 0 : Math.max(3, Math.round((c / max) * 100))));
}

export const EXPORT_FILES = ["enrolments.csv", "learners.csv"] as const;
export type ExportFile = (typeof EXPORT_FILES)[number];
// enrolments.csv -> enrolments-2026-11-06.csv (the day the file was made, in UTC)
export const exportFilename = (file: ExportFile, now: Date): string => file.replace(/\.csv$/, `-${now.toISOString().slice(0, 10)}.csv`);
export const SIGNUP_WINDOWS = [7, 30, 90, 180, 365] as const;
