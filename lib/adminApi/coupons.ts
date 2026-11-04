// lib/adminApi/coupons.ts
// Three kinds, every one with a mandatory expiry (owner decisions D8 and 2026-11-04): `everyone` (open for all), `selected` (only the
// signed-up students the admin picked, stored as Clerk ids) and `single-use` (one redemption by whoever uses it first, reserved while paying).
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { randomBytes } from "node:crypto";
import { ApiError, badRequest, conflict, notFound, unprocessable } from "./envelope";
import { amountIsAllowed, discountedAmount, type Discount, type PayCurrency } from "./payMinimum";
import { priceList, type Pricing } from "./cohorts";
import { arrayOf, email, futureDate, int, num, objectOf, oneOf, optional, slug, str, type Check } from "./validate";
import { idsForEmails, refsForIds } from "./learners";

export const CODE_PATTERN = /^[A-Z0-9_-]{4,40}$/;
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";   // no 0, O, 1, I, L: easy to read out loud
export const GENERATED_CODE_LENGTH = 10;
export const MAX_GENERATE = 200;
export const RESERVATION_MINUTES = 30;

export const newCode = (n = GENERATED_CODE_LENGTH) => Array.from(randomBytes(n), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");

export const discount: Check<Discount> = (v) => {
  if (!v || typeof v !== "object") return { ok: false, message: "must be an object" };
  const type = (v as { type?: unknown }).type;
  if (type === "percentage") {
    const r = objectOf({ type: oneOf("percentage"), percent: num({ gt: 0, max: 100 }) })(v);
    return r.ok ? { ok: true, value: r.value as Discount } : r;
  }
  if (type === "fixed") {
    const r = objectOf({ type: oneOf("fixed"), inr: optional(num({ gt: 0, max: 1_000_000 })), usd: optional(num({ gt: 0, max: 1_000_000 })) })(v);
    if (!r.ok) return r;
    if (r.value.inr === undefined && r.value.usd === undefined) return { ok: false, message: "a fixed discount needs inr, usd or both" };
    return { ok: true, value: r.value as Discount };
  }
  return { ok: false, message: "type must be percentage or fixed" };
};

const appliesTo = objectOf({ cohortSlugs: optional(arrayOf(slug, { max: 50 })), planIds: optional(arrayOf(str({ max: 40, pattern: /^[a-z0-9][a-z0-9_-]*$/ }), { max: 50 })) });
export type AppliesTo = { cohortSlugs?: string[]; planIds?: string[] };

// Codes are case-insensitive: "welcome20" and "WELCOME20" are the same code, stored upper case.
const codeCheck: Check<string> = (v) => {
  const r = str({ max: 40 })(v);
  if (!r.ok) return r;
  const up = r.value.toUpperCase();
  return CODE_PATTERN.test(up) ? { ok: true, value: up } : { ok: false, message: "must be 4 to 40 letters, numbers, - or _" };
};

export const couponCreateShape = {
  code: codeCheck,
  kind: oneOf("everyone", "selected", "single-use"),
  discount,
  expiresAt: futureDate,
  users: optional(arrayOf(email, { min: 1, max: 200 })),
  appliesTo: optional(appliesTo),
  maxRedemptions: optional(int({ min: 1, max: 1_000_000 })),
};
export const couponUpdateShape = {
  discount: optional(discount),
  expiresAt: optional(futureDate),
  active: optional((v: unknown) => (typeof v === "boolean" ? { ok: true as const, value: v } : { ok: false as const, message: "must be true or false" })),
  users: optional(arrayOf(email, { min: 1, max: 200 })),
  appliesTo: optional(appliesTo),
  maxRedemptions: optional(int({ min: 1, max: 1_000_000 })),
};
export const generateShape = {
  count: int({ min: 1, max: MAX_GENERATE }),
  discount,
  expiresAt: futureDate,
  appliesTo: optional(appliesTo),
};

type CouponRow = {
  code: string; kind: "everyone" | "selected" | "single-use"; discount: Discount; expires_at: string; active: boolean; user_ids: string[];
  applies_to: AppliesTo | null; max_redemptions: number | null; redemptions: number; reserved_by: string | null; reserved_until: string | null;
  redeemed_by: string | null; redeemed_at: string | null; batch_id: string | null; created_by: string; created_at: string;
};
const COLS = "code, kind, discount, expires_at, active, user_ids, applies_to, max_redemptions, redemptions, reserved_by, reserved_until, redeemed_by, redeemed_at, batch_id, created_by, created_at";

export type CouponState = "active" | "inactive" | "expired" | "unused" | "reserved" | "redeemed" | "voided";
export function couponState(r: CouponRow, now = Date.now()): CouponState {
  if (r.kind === "single-use") {
    if (r.redeemed_at) return "redeemed";
    if (!r.active) return "voided";
    if (Date.parse(r.expires_at) <= now) return "expired";
    return r.reserved_by && r.reserved_until && Date.parse(r.reserved_until) > now ? "reserved" : "unused";
  }
  if (Date.parse(r.expires_at) <= now) return "expired";
  return r.active ? "active" : "inactive";
}

export function shapeCoupon(r: CouponRow, users?: Array<{ id: string; email: string | null; name: string }>) {
  return {
    code: r.code, kind: r.kind, state: couponState(r), discount: r.discount, expiresAt: r.expires_at, active: r.active,
    appliesTo: r.applies_to ?? undefined, maxRedemptions: r.max_redemptions ?? undefined, redemptions: r.redemptions,
    ...(r.kind === "selected" ? { users: users ?? r.user_ids.map((id) => ({ id, email: null, name: "" })) } : {}),
    ...(r.kind === "single-use" ? { reservedUntil: r.reserved_until ?? undefined, redeemedBy: r.redeemed_by ?? undefined, redeemedAt: r.redeemed_at ?? undefined, batchId: r.batch_id ?? undefined } : {}),
    createdBy: r.created_by, createdAt: r.created_at,
  };
}

export async function getCoupon(code: string): Promise<CouponRow> {
  const { data, error } = await supabaseAdmin.from("coupons").select(COLS).eq("code", code.toUpperCase()).maybeSingle();
  if (error) throw error;
  if (!data) throw notFound("Coupon not found");
  return data as CouponRow;
}

export async function listCoupons(p: { limit: number; cursor: string | null; q: string | null; state: string | null }): Promise<{ rows: CouponRow[]; next: string | null }> {
  let q = supabaseAdmin.from("coupons").select(COLS).order("created_at", { ascending: false }).order("code", { ascending: true }).limit(p.limit + 1);
  if (p.cursor) {
    const [at, code] = Buffer.from(p.cursor, "base64url").toString().split("|");
    if (!at || !code) throw badRequest("cursor is not valid");
    q = q.or(`created_at.lt.${at},and(created_at.eq.${at},code.gt.${code})`);
  }
  if (p.q) q = q.ilike("code", `%${p.q.replace(/[%_,()]/g, " ").trim().toUpperCase()}%`);
  const { data, error } = await q;
  if (error) throw error;
  let rows = (data ?? []) as CouponRow[];
  const more = rows.length > p.limit;
  rows = rows.slice(0, p.limit);
  const last = rows[rows.length - 1];
  const next = more && last ? Buffer.from(`${last.created_at}|${last.code}`).toString("base64url") : null;
  return { rows: p.state ? rows.filter((r) => couponState(r) === p.state) : rows, next };
}

// Owner decision Q7: the first price of this cohort that the discount would leave above zero and below the payment minimum, or null.
// Pure, so the rule is unit-tested without a database; both checks below use it.
export function discountProblem(d: Discount, scope: AppliesTo | null | undefined, cohortSlug: string, pricing: Pricing): { label: string; result: number; currency: string } | null {
  if (scope?.cohortSlugs?.length && !scope.cohortSlugs.includes(cohortSlug)) return null;
  for (const item of priceList(pricing)) {
    if (scope?.planIds?.length && (!item.planId || !scope.planIds.includes(item.planId))) continue;
    if (d.type === "fixed" && (item.currency === "INR" ? d.inr : d.usd) === undefined) continue;
    const result = discountedAmount(item.amount, d, item.currency as PayCurrency);
    if (!amountIsAllowed(result, item.currency as PayCurrency)) return { label: item.label, result, currency: item.currency };
  }
  return null;
}

// Coupon side: refuse a coupon that would leave an amount above zero and below the payment minimum on any price it covers.
export async function checkCouponAgainstPrices(d: Discount, scope: AppliesTo | null | undefined): Promise<void> {
  const { data, error } = await supabaseAdmin.from("content_docs").select("key, doc").eq("kind", "cohort");
  if (error) throw error;
  for (const row of data ?? []) {
    const pricing = (row.doc as { pricing?: Pricing }).pricing;
    if (!pricing) continue;
    const p = discountProblem(d, scope, row.key as string, pricing);
    if (p) throw unprocessable(`This discount would leave ${p.result} ${p.currency} on ${p.label} of cohort "${row.key}", which is above zero and below the payment minimum. Change the discount or the price`);
  }
}

// The reverse check, used when a cohort's prices are saved: every live coupon that covers this cohort must still give a chargeable amount.
export async function checkCohortAgainstCoupons(cohortSlug: string, pricing: Pricing): Promise<void> {
  const { data, error } = await supabaseAdmin.from("coupons").select("code, discount, applies_to").eq("active", true).gt("expires_at", new Date().toISOString()).is("redeemed_at", null);
  if (error) throw error;
  for (const c of data ?? []) {
    const p = discountProblem(c.discount as Discount, c.applies_to as AppliesTo | null, cohortSlug, pricing);
    if (p) throw unprocessable(`Coupon ${c.code} would leave ${p.result} ${p.currency} on ${p.label}, which is above zero and below the payment minimum. Change the price or the coupon first`);
  }
}

export async function insertCoupon(row: Omit<CouponRow, "redemptions" | "reserved_by" | "reserved_until" | "redeemed_by" | "redeemed_at" | "created_at">): Promise<CouponRow> {
  const { data, error } = await supabaseAdmin.from("coupons").insert([row]).select(COLS).single();
  if (error) {
    if (error.code === "23505") throw conflict(`The code "${row.code}" already exists`);
    throw error;
  }
  return data as CouponRow;
}

export async function usersForCoupon(r: CouponRow) {
  return r.kind === "selected" ? refsForIds(r.user_ids) : undefined;
}

export { idsForEmails, ApiError };
