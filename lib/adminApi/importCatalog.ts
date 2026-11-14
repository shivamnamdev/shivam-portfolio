// lib/adminApi/importCatalog.ts
// Plans the one-off copy of data/courses.ts (the cohorts sold and taught today) into admin-portal courses and cohorts. Pure (unit-tested):
// the route reads the database and applies the plan. Same safety as the curriculum import: a record that exists and differs from the files is
// NEVER overwritten unless `overwrite` is asked for (an admin may have edited it). One course per cohort, same slug (Blueprint 4.1).
import { buildCohortDoc, checkPricing, cohortCreateShape, type Pricing } from "./cohorts";
import { courseCreateShape } from "./courses";
import { parseObject } from "./validate";
import { canonical, type ImportAction } from "./importCurriculum";
import { PITCH_KEYS } from "../catalog/mapping";   // the pitch blocks a portal page reads: the same list, so nothing copied is ignored

type FilePrice = { currentPrice?: string; originalPrice?: string };
type FilePlan = { id: string; name: string; subtitle?: string; price: string; originalPrice?: string; features?: string[]; isPopular?: boolean };
export type FileCourse = {
  slug: string; title: string; statusText?: string; demoOffer?: string; duration?: string; contactPhone?: string;
  enrollmentClosed?: boolean; listed?: boolean; format?: "live" | "recorded"; liveLink?: string; whatsappLink?: string;
  pricing?: { inr?: FilePrice; usd?: FilePrice }; pricingPlans?: FilePlan[];
} & Record<string, unknown>;


// "₹1,999" or "$9.99" to 1999 or 9.99. Anything that is not a plain amount is refused (never guessed).
export function parseAmount(text: string | undefined): number {
  const cleaned = String(text ?? "").replace(/[₹$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) throw new Error(`Cannot read the price "${text}"`);
  return Number(cleaned);
}
const price = (p: FilePrice | undefined) => {
  const amount = parseAmount(p?.currentPrice);
  return p?.originalPrice ? { amount, original: parseAmount(p.originalPrice) } : { amount };
};

export function pricingFor(c: FileCourse): Pricing {
  if (c.pricingPlans?.length) {
    return { kind: "plans", currency: "INR", plans: c.pricingPlans.map((p) => ({
      id: p.id, name: p.name, ...(p.subtitle ? { subtitle: p.subtitle } : {}), price: price({ currentPrice: p.price, originalPrice: p.originalPrice }),
      ...(p.isPopular ? { popular: true } : {}), features: p.features ?? [],
    })) };
  }
  if (!c.pricing?.inr) throw new Error(`${c.slug} has no price`);
  return { kind: "single", inr: price(c.pricing.inr), ...(c.pricing.usd ? { usd: price(c.pricing.usd) } : {}) };
}

export type CatalogEntryPlan = {
  slug: string;
  course: { action: ImportAction; doc: Record<string, unknown> };
  cohort: { action: ImportAction; doc: Record<string, unknown> };
  notes: string[];   // never contains a link, only whether one is set
};
type Existing = Record<string, unknown> | null;

// What the database will hold: JSON drops keys set to undefined, so the plan is compared and written in that form (otherwise a second run says "differs").
const stored = (doc: Record<string, unknown>): Record<string, unknown> => JSON.parse(JSON.stringify(doc));

function decide(existing: Existing, doc: Record<string, unknown>, overwrite: boolean): ImportAction {
  if (!existing) return "create";
  if (canonical(existing) === canonical(doc)) return "unchanged";
  return overwrite ? "overwrite" : "differs";
}

export function planCatalogImport(entries: FileCourse[], existing: { courses: Record<string, Existing>; cohorts: Record<string, Existing> }, overwrite: boolean): CatalogEntryPlan[] {
  return entries.map((c) => {
    const pitch: Record<string, unknown> = {};
    for (const k of PITCH_KEYS) if (c[k] !== undefined) pitch[k] = c[k];
    const course = parseObject({ slug: c.slug, title: c.title, pitch }, courseCreateShape);
    const courseDoc = stored({ title: course.title, pitch: course.pitch });

    const pricing = pricingFor(c);
    const input = parseObject({
      slug: c.slug, courseSlug: c.slug, title: c.title,
      ...(c.statusText ? { statusText: c.statusText } : {}), ...(c.demoOffer ? { demoOffer: c.demoOffer } : {}), ...(c.duration ? { duration: c.duration } : {}),
      ...(c.contactPhone ? { contactPhone: c.contactPhone } : {}),
      enrollmentClosed: c.enrollmentClosed === true, listed: c.listed !== false, ...(c.format ? { format: c.format } : {}),
      pricing, whatsappLink: c.whatsappLink ?? "", liveLink: c.liveLink ?? "",
    }, cohortCreateShape);
    checkPricing(input.pricing as Pricing);
    const { slug: _slug, ...cohortDoc } = stored(buildCohortDoc(input));   // the slug is the row key, not part of the document

    const notes = [
      `whatsapp link ${c.whatsappLink ? "set" : "empty"}`, `live link ${c.liveLink ? "set" : "empty"}`,
      `${c.listed === false ? "hidden from the catalog" : "listed"}, ${c.enrollmentClosed ? "enrolment closed" : "enrolment open"}, ${c.format ?? "live"}`,
    ];
    return {
      slug: c.slug,
      course: { action: decide(existing.courses[c.slug] ?? null, courseDoc, overwrite), doc: courseDoc },
      cohort: { action: decide(existing.cohorts[c.slug] ?? null, cohortDoc, overwrite), doc: cohortDoc },
      notes,
    };
  });
}
