// lib/catalog/commerce.ts
// Server-only reader behind the three payment routes (create-order, enroll-free, verify-payment) and the coupon check. PORTAL_COUPONS=files
// (default) answers from data/courses.ts and data/coupons.ts exactly as before. PORTAL_COUPONS=database (with PORTAL_CATALOG=database, see
// `pricingSource`) prices from the published cohort's numbers and checks the `coupons` table with the pure rules in couponRules.ts; an
// unreadable or empty portal falls back to the files for that request, like every other flag. The four old file codes stop working in database
// mode (owner decision); QA100 stays environment-driven.
import "server-only";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { CATALOG_TAG } from "./tags";
import { activeCourses, isQaFixture } from "@/data/courses";
import { qaCoupons } from "@/data/coupons";
import { resolveCoupon, type Coupon, type CurrencyCode } from "@/lib/pricing";
import { consumeSingleUse, countRedemption, releaseSingleUse, reserveSingleUse } from "@/lib/adminApi/couponRedemption";
import { evaluateCoupon, MESSAGES, type CouponRow } from "./couponRules";
import { sellableFromCohort, type Sellable } from "./mapping";
import { pricingSource, readWithFallback, type Source } from "./source";

export const commerceSource = (): Source => pricingSource(process.env.PORTAL_CATALOG, process.env.PORTAL_COUPONS);
const log = (what: string, reason: string) => console.error(`commerce: ${what} (${reason}), answering from the data files`);

const fromFiles = (key: string): Sellable | undefined =>
  (activeCourses as unknown as Sellable[]).find((c) => c.id === key || c.slug === key);

// Whether the portal has any published cohort at all (decides "empty portal: answer from the files"). Cached 60 s and refreshed by every publish (catalog tag),
// so a fixture or unknown id costs one query, not two.
const anyPublishedCohort = unstable_cache(async () => {
  const r = await supabaseAdmin.from("content_docs").select("key", { count: "exact", head: true }).eq("kind", "cohort").eq("status", "published");
  if (r.error) throw r.error;
  return (r.count ?? 0) > 0;
}, ["commerce-any-cohort-v1"], { revalidate: 60, tags: [CATALOG_TAG] });

// The thing an order is for. `key` is the id the page sends (the cohort's slug in database mode, the file id in files mode) or a slug (verify-payment).
export async function getSellable(key: string): Promise<{ course: Sellable | undefined; source: Source }> {
  const src = commerceSource();
  const { value, source } = await readWithFallback<{ course: Sellable | undefined }>(src, async () => {
    const { data, error } = await supabaseAdmin.from("content_docs").select("doc").eq("kind", "cohort").eq("key", key).eq("status", "published").maybeSingle();
    if (error) throw error;
    if (data) {
      const doc = data.doc as { courseSlug?: string };
      const c = await supabaseAdmin.from("content_docs").select("key").eq("kind", "course").eq("key", String(doc.courseSlug)).eq("status", "published").maybeSingle();
      if (c.error) throw c.error;
      return { course: c.data ? sellableFromCohort(key, data.doc as never) ?? undefined : undefined };   // a cohort whose course is not published is not for sale
    }
    if (!(await anyPublishedCohort())) return null;                      // nothing published yet: the catalog shows the files, so orders use them too
    return { course: isQaFixture(key) ? fromFiles(key) : undefined };    // the QA fixture lives in the files whichever source is on (as in the catalog)
  }, () => ({ course: fromFiles(key) }), (reason, e) => log("database prices", reason + (e ? `: ${(e as Error).message?.slice(0, 80)}` : "")));
  return { course: value.course, source };
}

export type CommerceCoupon = { ok: true; coupon: Coupon | null; kind?: CouponRow["kind"] } | { ok: false; status: 400 | 403 | 503; error: string };
export type CouponAsk = { code: string | null | undefined; userId: string; cohortSlug: string; planId: string | null; currency: CurrencyCode; basePrice: number };

const COLS = "code, kind, discount, expires_at, active, user_ids, applies_to, max_redemptions, redemptions, reserved_by, reserved_until, redeemed_by, redeemed_at";

export async function checkCoupon(source: Source, ask: CouponAsk): Promise<CommerceCoupon> {
  if (!ask.code) return { ok: true, coupon: null };
  if (source === "files") return resolveCoupon(ask.code, ask.userId);
  const code = ask.code.trim().toUpperCase();
  const { data, error } = await supabaseAdmin.from("coupons").select(COLS).eq("code", code).maybeSingle();
  if (error) {
    // Never fall back to the old file codes during an outage: refuse and let the buyer retry.
    console.error(`commerce: coupon read failed (${error.message?.slice(0, 80)})`);
    return { ok: false, status: 503, error: "Could not check the coupon. Please try again." };
  }
  if (data) {
    const v = evaluateCoupon(data as unknown as CouponRow, { userId: ask.userId, cohortSlug: ask.cohortSlug, planId: ask.planId, currency: ask.currency, basePrice: ask.basePrice });
    return v.ok ? { ok: true, coupon: v.coupon, kind: v.kind } : v;
  }
  // Not in the table: only the environment-driven QA coupon is still honoured, with the file rules.
  const qa = (qaCoupons as Coupon[]).find((c) => c.code.toUpperCase() === code);
  if (!qa) return { ok: false, status: 400, error: MESSAGES.invalid };
  if (qa.allowedUsers.length > 0 && !qa.allowedUsers.includes(ask.userId)) return { ok: false, status: 403, error: MESSAGES.notYours };
  return { ok: true, coupon: qa };
}

// A single-use code is held for the buyer while they pay (create-order and enroll-free call this; other kinds need no hold).
export async function holdCoupon(verdict: Extract<CommerceCoupon, { ok: true }>, userId: string): Promise<{ ok: true } | { ok: false; status: 400; error: string }> {
  if (verdict.kind !== "single-use" || !verdict.coupon) return { ok: true };
  return (await reserveSingleUse(verdict.coupon.code, userId)) ? { ok: true } : { ok: false, status: 400, error: MESSAGES.busy };
}

// After the outcome is known: "used" spends a single-use code (or counts a use of the others), "release" frees a held code. A code that is not in
// the table (QA100) is ignored. Never throws into the caller: the enrolment is already saved, a counter problem is logged.
export async function settleCoupon(code: string | null | undefined, userId: string, outcome: "used" | "release"): Promise<void> {
  if (!code || commerceSource() === "files") return;
  try {
    const { data, error } = await supabaseAdmin.from("coupons").select("kind").eq("code", code.toUpperCase()).maybeSingle();
    if (error) throw error;
    if (!data) return;
    if (outcome === "release") { if (data.kind === "single-use") await releaseSingleUse(code, userId); return; }
    if (data.kind === "single-use") await consumeSingleUse(code, userId); else await countRedemption(code);
  } catch (e) {
    console.error(`commerce: could not ${outcome === "used" ? "record the use of" : "release"} a coupon (${(e as Error).message?.slice(0, 80)})`);
  }
}
