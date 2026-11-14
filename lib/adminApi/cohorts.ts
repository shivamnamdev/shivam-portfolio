// lib/adminApi/cohorts.ts
// Cohort = one batch of a course: dates, open or closed, price model and the private links. Prices are numbers in major units
// (the sales page formats them). Owner decision Q7: a price above zero and below the payment minimum is refused when saved.
import { amountIsAllowed, PAYMENT_MINIMUM_MAJOR } from "./payMinimum";
import { badRequest, type FieldErrors } from "./envelope";
import { arrayOf, bool, httpsUrl, isoDate, num, objectOf, oneOf, optional, slug, str, type Check } from "./validate";

const price = objectOf({ amount: num({ min: 0, max: 1_000_000 }), original: optional(num({ min: 0, max: 1_000_000 })) });
type Price = { amount: number; original?: number };

const plan = objectOf({
  id: str({ max: 40, pattern: /^[a-z0-9][a-z0-9_-]*$/ }),
  name: str({ max: 60 }),
  subtitle: optional(str({ max: 200 })),
  price,
  popular: optional(bool),
  features: arrayOf(str({ max: 200 }), { max: 12 }),
});
export type Plan = { id: string; name: string; subtitle?: string; price: Price; popular?: boolean; features: string[] };

export type Pricing =
  | { kind: "single"; inr: Price; usd?: Price }
  | { kind: "plans"; currency: "INR"; plans: Plan[] };

const pricing: Check<Pricing> = (v) => {
  if (!v || typeof v !== "object") return { ok: false, message: "must be an object" };
  const kind = (v as { kind?: unknown }).kind;
  if (kind === "single") {
    const r = objectOf({ kind: oneOf("single"), inr: price, usd: optional(price) })(v);
    return r.ok ? { ok: true, value: r.value as Pricing } : r;
  }
  if (kind === "plans") {
    const r = objectOf({ kind: oneOf("plans"), currency: oneOf("INR"), plans: arrayOf(plan, { min: 1, max: 6 }) })(v);
    return r.ok ? { ok: true, value: r.value as Pricing } : r;
  }
  return { ok: false, message: "kind must be single or plans" };
};

const link: Check<string> = (v) => (v === "" ? { ok: true, value: "" } : httpsUrl(v));

export const cohortCreateShape = {
  slug,
  courseSlug: slug,
  title: str({ max: 200 }),
  statusText: optional(str({ max: 100 })),
  demoOffer: optional(str({ max: 100 })),
  duration: optional(str({ max: 100 })),
  contactPhone: optional(str({ max: 20, pattern: /^[0-9+\- ]{5,20}$/ })),
  enrollmentClosed: optional(bool),
  listed: optional(bool),
  format: optional(oneOf("live", "recorded")),   // recorded: no live class, so the learner screens hide "Join Live Class"
  startsAt: optional(isoDate),
  endsAt: optional(isoDate),
  pricing,
  whatsappLink: optional(link),
  liveLink: optional(link),
};
export const cohortUpdateShape = {
  title: optional(str({ max: 200 })),
  statusText: optional(str({ max: 100 })),
  demoOffer: optional(str({ max: 100 })),
  duration: optional(str({ max: 100 })),
  contactPhone: optional(str({ max: 20, pattern: /^[0-9+\- ]{5,20}$/ })),
  enrollmentClosed: optional(bool),
  listed: optional(bool),
  format: optional(oneOf("live", "recorded")),   // recorded: no live class, so the learner screens hide "Join Live Class"
  startsAt: optional(isoDate),
  endsAt: optional(isoDate),
  pricing: optional(pricing),
  whatsappLink: optional(link),
  liveLink: optional(link),
};

// Every price the learner could be charged, labelled for messages: [{ label, amount, currency, planId }].
export function priceList(p: Pricing): Array<{ label: string; amount: number; currency: "INR" | "USD"; planId: string | null }> {
  if (p.kind === "single") {
    return [{ label: "INR price", amount: p.inr.amount, currency: "INR", planId: null }, ...(p.usd ? [{ label: "USD price", amount: p.usd.amount, currency: "USD" as const, planId: null }] : [])];
  }
  return p.plans.map((pl) => ({ label: `plan ${pl.id}`, amount: pl.price.amount, currency: "INR" as const, planId: pl.id }));
}

// Rules that need the whole pricing object: unique plan ids, original >= amount, every price chargeable (Q7).
export function checkPricing(p: Pricing): void {
  const fields: FieldErrors = {};
  if (p.kind === "plans") {
    const ids = p.plans.map((x) => x.id);
    if (new Set(ids).size !== ids.length) fields.pricing = "plan ids must be unique";
  }
  for (const item of priceList(p)) {
    if (!amountIsAllowed(item.amount, item.currency)) fields.pricing = `${item.label}: an amount above zero must be at least ${PAYMENT_MINIMUM_MAJOR[item.currency]} ${item.currency} (zero makes the course free)`;
  }
  const originals = p.kind === "single" ? [p.inr, p.usd] : p.plans.map((x) => x.price);
  for (const o of originals) if (o && o.original !== undefined && o.original < o.amount) fields.pricing = "the original price cannot be lower than the price";
  if (Object.keys(fields).length) throw badRequest("The price setup is not valid", fields);
}

// The document stored for a cohort; links go under `private` so a normal read never returns them.
export function buildCohortDoc(input: Record<string, unknown>, previous?: Record<string, unknown>): Record<string, unknown> {
  const prev = (previous ?? {}) as { private?: { whatsappLink?: string; liveLink?: string } } & Record<string, unknown>;
  const doc: Record<string, unknown> = { ...prev };
  for (const [k, v] of Object.entries(input)) if (v !== undefined && k !== "whatsappLink" && k !== "liveLink" && k !== "slug") doc[k] = v;
  const priv = { ...(prev.private ?? {}) };
  if (input.whatsappLink !== undefined) priv.whatsappLink = input.whatsappLink as string;
  if (input.liveLink !== undefined) priv.liveLink = input.liveLink as string;
  doc.private = { whatsappLink: priv.whatsappLink ?? "", liveLink: priv.liveLink ?? "" };
  if (doc.enrollmentClosed === undefined) doc.enrollmentClosed = false;
  if (doc.listed === undefined) doc.listed = true;
  return doc;
}

export const publicCohort = (doc: Record<string, unknown>) => { const { private: _p, ...rest } = doc; return rest; };
