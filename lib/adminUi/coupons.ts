// lib/adminUi/coupons.ts
// Pure helpers behind the coupon screens: pasted e-mail lists, the discount boxes, the create / generate / change bodies, expiry hints and the
// text shown for a discount. The server decides every rule (including the minimum-price rule against real cohort prices); these give early hints.
import { isoToLocalInput, localInputToIso, parseMoney, sameJson } from "./forms";

export type Discount = { type: "percentage"; percent: number } | { type: "fixed"; inr?: number; usd?: number };
export type Kind = "everyone" | "selected" | "single-use";
export const MAX_EMAILS = 200;
export const MAX_GENERATE = 200;

// ---- e-mail list (selected students) ------------------------------------------------------------------------------------------------------
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Splits on spaces, commas, semicolons and line breaks; lower-cases; removes repeats; separates what is not an address.
export function parseEmails(text: string): { emails: string[]; invalid: string[]; tooMany: boolean } {
  const seen = new Set<string>(); const emails: string[] = []; const invalid: string[] = [];
  for (const raw of text.split(/[\s,;]+/)) {
    const e = raw.trim().toLowerCase();
    if (!e || seen.has(e)) continue;
    seen.add(e);
    (EMAIL.test(e) && e.length <= 254 ? emails : invalid).push(e);
  }
  return { emails, invalid, tooMany: emails.length > MAX_EMAILS };
}
export const addEmail = (text: string, email: string): string => (parseEmails(text).emails.includes(email.toLowerCase()) ? text : `${text.trim()}${text.trim() ? "\n" : ""}${email.toLowerCase()}`);

// ---- discount ------------------------------------------------------------------------------------------------------------------------------
export type DiscountForm = { type: "percentage" | "fixed"; percent: string; inr: string; usd: string };
export const emptyDiscountForm = (): DiscountForm => ({ type: "percentage", percent: "", inr: "", usd: "" });
export const discountToForm = (d: Discount): DiscountForm =>
  d.type === "percentage" ? { type: "percentage", percent: String(d.percent), inr: "", usd: "" } : { type: "fixed", percent: "", inr: d.inr === undefined ? "" : String(d.inr), usd: d.usd === undefined ? "" : String(d.usd) };

export function discountFromForm(f: DiscountForm): { ok: true; value: Discount } | { ok: false; message: string } {
  if (f.type === "percentage") {
    const p = parseMoney(f.percent);
    if (p === undefined) return { ok: false, message: "Enter the percentage" };
    if (p === null || p <= 0 || p > 100) return { ok: false, message: "The percentage must be above 0 and at most 100" };
    return { ok: true, value: { type: "percentage", percent: p } };
  }
  const inr = parseMoney(f.inr); const usd = parseMoney(f.usd);
  if (inr === null || usd === null || inr === 0 || usd === 0) return { ok: false, message: "Amounts must be numbers above 0" };
  if (inr === undefined && usd === undefined) return { ok: false, message: "A fixed discount needs an INR amount, a USD amount or both" };
  return { ok: true, value: { type: "fixed", ...(inr !== undefined ? { inr } : {}), ...(usd !== undefined ? { usd } : {}) } };
}
export function discountText(d: Discount): string {
  if (d.type === "percentage") return `${d.percent}% off`;
  return [d.inr !== undefined ? `₹${d.inr} off` : null, d.usd !== undefined ? `$${d.usd} off` : null].filter(Boolean).join(" / ");
}

// ---- expiry --------------------------------------------------------------------------------------------------------------------------------
// Every coupon needs an expiry in the future (owner decision). `value` is a datetime-local box.
export function expiryProblem(value: string, now: Date): string | null {
  if (!value) return "Choose when the coupon expires (required)";
  const iso = localInputToIso(value);
  if (!iso) return "Choose a valid date and time";
  return Date.parse(iso) <= now.getTime() ? "The expiry must be in the future" : null;
}
export const defaultExpiry = (now: Date, days = 30): string => isoToLocalInput(new Date(now.getTime() + days * 86_400_000).toISOString());

// ---- scope ---------------------------------------------------------------------------------------------------------------------------------
export type AppliesTo = { cohortSlugs?: string[]; planIds?: string[] };
export function planIdsFrom(text: string): { ids: string[]; invalid: string[] } {
  const ids: string[] = []; const invalid: string[] = [];
  for (const raw of text.split(/[\s,;]+/)) { const p = raw.trim().toLowerCase(); if (!p || ids.includes(p) || invalid.includes(p)) continue; (/^[a-z0-9][a-z0-9_-]{0,39}$/.test(p) ? ids : invalid).push(p); }
  return { ids, invalid };
}
export const scopeOf = (cohortSlugs: string[], planIds: string[]): AppliesTo | undefined =>
  cohortSlugs.length || planIds.length ? { ...(cohortSlugs.length ? { cohortSlugs } : {}), ...(planIds.length ? { planIds } : {}) } : undefined;
export const scopeText = (a: AppliesTo | undefined): string => {
  if (!a || (!a.cohortSlugs?.length && !a.planIds?.length)) return "Every cohort and plan";
  return [a.cohortSlugs?.length ? `Cohorts: ${a.cohortSlugs.join(", ")}` : null, a.planIds?.length ? `Plans: ${a.planIds.join(", ")}` : null].filter(Boolean).join(" · ");
};

// ---- create ---------------------------------------------------------------------------------------------------------------------------------
export type CreateForm = { code: string; kind: "everyone" | "selected"; discount: DiscountForm; expiresAt: string; usersText: string; maxRedemptions: string; cohortSlugs: string[]; planIds: string };
export const emptyCreateForm = (now: Date): CreateForm => ({ code: "", kind: "everyone", discount: emptyDiscountForm(), expiresAt: defaultExpiry(now), usersText: "", maxRedemptions: "", cohortSlugs: [], planIds: "" });
export const CODE_PATTERN = /^[A-Z0-9_-]{4,40}$/;
export const normaliseCode = (s: string): string => s.trim().toUpperCase();

export function createProblems(f: CreateForm, now: Date): string[] {
  const out: string[] = [];
  if (!CODE_PATTERN.test(normaliseCode(f.code))) out.push("The code must be 4 to 40 letters, numbers, - or _");
  const d = discountFromForm(f.discount); if (!d.ok) out.push(d.message);
  const e = expiryProblem(f.expiresAt, now); if (e) out.push(e);
  if (f.kind === "selected") {
    const p = parseEmails(f.usersText);
    if (!p.emails.length) out.push("Add at least one student e-mail");
    if (p.invalid.length) out.push(`Not an e-mail: ${p.invalid.slice(0, 3).join(", ")}${p.invalid.length > 3 ? " and more" : ""}`);
    if (p.tooMany) out.push(`At most ${MAX_EMAILS} students per coupon`);
  }
  const max = parseMoney(f.maxRedemptions);
  if (max === null || (max !== undefined && (!Number.isInteger(max) || max < 1))) out.push("The limit must be a whole number of 1 or more");
  const plans = planIdsFrom(f.planIds); if (plans.invalid.length) out.push(`Not a plan id: ${plans.invalid.join(", ")}`);
  return out;
}
export function createBody(f: CreateForm): Record<string, unknown> {
  const d = discountFromForm(f.discount);
  if (!d.ok) throw new Error(d.message);
  const max = parseMoney(f.maxRedemptions);
  const scope = scopeOf(f.cohortSlugs, planIdsFrom(f.planIds).ids);
  return {
    code: normaliseCode(f.code), kind: f.kind, discount: d.value, expiresAt: localInputToIso(f.expiresAt),
    ...(f.kind === "selected" ? { users: parseEmails(f.usersText).emails } : {}),
    ...(typeof max === "number" ? { maxRedemptions: max } : {}),
    ...(scope ? { appliesTo: scope } : {}),
  };
}

// ---- generate -------------------------------------------------------------------------------------------------------------------------------
export type GenerateForm = { count: string; discount: DiscountForm; expiresAt: string; cohortSlugs: string[]; planIds: string };
export const emptyGenerateForm = (now: Date): GenerateForm => ({ count: "10", discount: emptyDiscountForm(), expiresAt: defaultExpiry(now), cohortSlugs: [], planIds: "" });
export function generateProblems(f: GenerateForm, now: Date): string[] {
  const out: string[] = [];
  const n = parseMoney(f.count);
  if (n === undefined || n === null || !Number.isInteger(n) || n < 1 || n > MAX_GENERATE) out.push(`The number of codes must be a whole number from 1 to ${MAX_GENERATE}`);
  const d = discountFromForm(f.discount); if (!d.ok) out.push(d.message);
  const e = expiryProblem(f.expiresAt, now); if (e) out.push(e);
  const plans = planIdsFrom(f.planIds); if (plans.invalid.length) out.push(`Not a plan id: ${plans.invalid.join(", ")}`);
  return out;
}
export function generateBody(f: GenerateForm): Record<string, unknown> {
  const d = discountFromForm(f.discount);
  if (!d.ok) throw new Error(d.message);
  const scope = scopeOf(f.cohortSlugs, planIdsFrom(f.planIds).ids);
  return { count: Number(f.count), discount: d.value, expiresAt: localInputToIso(f.expiresAt), ...(scope ? { appliesTo: scope } : {}) };
}
// A key the API uses to return the same batch if the request is repeated (a double click or a retry). New for every deliberate "Generate".
export const newIdempotencyKey = (random: () => string): string => `ui-${random().replace(/[^A-Za-z0-9]/g, "").slice(0, 40)}`;
export const codesText = (codes: Array<{ code: string }>): string => codes.map((c) => c.code).join("\n");

// ---- change ---------------------------------------------------------------------------------------------------------------------------------
export type CouponLike = { kind: Kind; discount: Discount; expiresAt: string; active: boolean; maxRedemptions?: number; users?: Array<{ email: string | null }> };
export type EditForm = { discount: DiscountForm; expiresAt: string; maxRedemptions: string; usersText: string };
export const couponToEditForm = (c: CouponLike): EditForm => ({
  discount: discountToForm(c.discount), expiresAt: isoToLocalInput(c.expiresAt), maxRedemptions: c.maxRedemptions === undefined ? "" : String(c.maxRedemptions),
  usersText: (c.users ?? []).map((u) => u.email).filter(Boolean).join("\n"),
});
export function editProblems(c: CouponLike, f: EditForm, now: Date): string[] {
  const out: string[] = [];
  const d = discountFromForm(f.discount); if (!d.ok) out.push(d.message);
  if (f.expiresAt !== isoToLocalInput(c.expiresAt)) { const e = expiryProblem(f.expiresAt, now); if (e) out.push(e); }
  if (c.kind === "selected") {
    const p = parseEmails(f.usersText);
    if (!p.emails.length) out.push("A selected-students coupon needs at least one e-mail");
    if (p.invalid.length) out.push(`Not an e-mail: ${p.invalid.slice(0, 3).join(", ")}`);
    if (p.tooMany) out.push(`At most ${MAX_EMAILS} students per coupon`);
  }
  if (c.kind === "everyone") { const max = parseMoney(f.maxRedemptions); if (max === null || (max !== undefined && (!Number.isInteger(max) || max < 1))) out.push("The limit must be a whole number of 1 or more"); }
  return out;
}
// Only what differs from the loaded coupon. A one-time code has no limit to change; a limit cannot be cleared (the API has no way), so an
// emptied box is left out.
export function couponChanges(c: CouponLike, f: EditForm): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const d = discountFromForm(f.discount);
  if (d.ok && !sameJson(d.value, c.discount)) out.discount = d.value;
  if (f.expiresAt !== isoToLocalInput(c.expiresAt)) { const iso = localInputToIso(f.expiresAt); if (iso) out.expiresAt = iso; }
  if (c.kind === "everyone") { const max = parseMoney(f.maxRedemptions); if (typeof max === "number" && max !== c.maxRedemptions) out.maxRedemptions = max; }
  if (c.kind === "selected") {
    const now = parseEmails(f.usersText).emails; const was = parseEmails(couponToEditForm(c).usersText).emails;
    if (JSON.stringify([...now].sort()) !== JSON.stringify([...was].sort())) out.users = now;
  }
  return out;
}
