// lib/catalog/mapping.ts
// Pure rules that turn a published course and cohort (the admin portal's documents) into the object the sales pages already use
// (the shape of an entry in data/courses.ts), minus the private links. No database, no network.
//
// Price rule (keeps "the amount shown equals the amount charged"): the payment routes still price from the data files until slice 5d, so while
// `priceFrom` is "files" the price and the open or closed flag come from the matching file entry. A cohort that exists only in the portal has no
// file entry, so it shows as closed (the server could not charge it). `priceFrom` is "database" only when the catalog and coupon flags are both "database" (`pricingSource`).
import type { Source } from "./source";

export type MoneyView = { currentPrice: string; originalPrice: string; savingsText: string; currencyCode: "INR" | "USD" };
export type PricingView = { inr: MoneyView; usd?: MoneyView };
type Price = { amount: number; original?: number };
type CohortPricing = { kind: "single"; inr: Price; usd?: Price } | { kind: "plans"; currency: "INR"; plans: Array<{ id: string; name: string; price: Price; features?: string[]; popular?: boolean; subtitle?: string }> };

export type CohortView = {
  slug: string; courseSlug: string; title: string; statusText?: string; demoOffer?: string; duration?: string; contactPhone?: string;
  enrollmentClosed?: boolean; listed?: boolean; pricing: CohortPricing;
};
// The named fields of a cohort document that a page may read. The document's `private` part (the links) is never read here.
export function cohortFromDoc(key: string, d: Record<string, unknown>, fallbackTitle: string): CohortView {
  return {
    slug: key, courseSlug: String(d.courseSlug), title: String(d.title ?? fallbackTitle), statusText: d.statusText as string | undefined, demoOffer: d.demoOffer as string | undefined,
    duration: d.duration as string | undefined, contactPhone: d.contactPhone as string | undefined, enrollmentClosed: d.enrollmentClosed as boolean | undefined,
    listed: d.listed as boolean | undefined, pricing: d.pricing as CohortPricing,
  };
}
export type CourseView = { slug: string; title: string; summary?: string; pitch?: Record<string, unknown> };
export type FileEntry = { slug: string; enrollmentClosed?: boolean; pricing?: PricingView; [k: string]: unknown };

// The sales fields the pitch may carry, as in data/courses.ts. Anything else in the pitch is ignored, so a free-form pitch can never override
// an identity, price, status or link field of the page.
export const PITCH_KEYS = ["vsl", "painPoints", "resources", "differentiators", "cohortHighlights", "courseTestimonials", "outcomes", "bonuses", "modules"] as const;

export type CatalogCourse = {
  id: string; slug: string; title: string; statusText: string; demoOffer: string; duration: string; contactPhone: string;
  enrollmentClosed: boolean; listed: boolean; pricing: PricingView; courseSlug?: string;
  // the pitch blocks (vsl, painPoints, modules, ...) keep the loose shape the pages already read from data/courses.ts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
};

const SYMBOL = { INR: "₹", USD: "$" } as const;
// "₹1,999" for rupees (whole numbers, Indian grouping), "$9.99" for dollars (cents shown only when there are some).
export function formatMoney(amount: number, currency: "INR" | "USD"): string {
  const n = Number.isFinite(amount) && amount > 0 ? amount : 0;
  if (currency === "INR") return `${SYMBOL.INR}${Math.round(n).toLocaleString("en-IN")}`;
  return `${SYMBOL.USD}${Number.isInteger(n) ? n.toLocaleString("en-US") : n.toFixed(2)}`;
}

// "Save ₹500 (25% off)" when the original price is higher than the price; empty otherwise.
export function savingsText(p: Price, currency: "INR" | "USD"): string {
  if (!p.original || p.original <= p.amount) return "";
  const pct = Math.round(((p.original - p.amount) / p.original) * 100);
  return `Save ${formatMoney(p.original - p.amount, currency)} (${pct}% off)`;
}

function moneyView(p: Price, currency: "INR" | "USD"): MoneyView {
  return { currentPrice: formatMoney(p.amount, currency), originalPrice: p.original && p.original > p.amount ? formatMoney(p.original, currency) : "", savingsText: savingsText(p, currency), currencyCode: currency };
}

// The price block of the sales page from a cohort's pricing. A plans cohort shows its lowest plan price on the card; the plan cards come from `pricingPlans`.
export function pricingFromCohort(p: CohortPricing): PricingView {
  if (p.kind === "single") return { inr: moneyView(p.inr, "INR"), ...(p.usd ? { usd: moneyView(p.usd, "USD") } : {}) };
  const cheapest = [...p.plans].sort((a, b) => a.price.amount - b.price.amount)[0];
  return { inr: moneyView(cheapest ? cheapest.price : { amount: 0 }, "INR") };
}

// A plans cohort's plans in the shape the plan cards and the price library read (`PricingPlan` of lib/pricing.ts). undefined for a single-price cohort.
export type PlanView = { id: string; name: string; subtitle?: string; price: string; originalPrice?: string; features: string[]; isPopular?: boolean };
export function plansFromCohort(p: CohortPricing): PlanView[] | undefined {
  if (p.kind !== "plans") return undefined;
  return p.plans.map((pl) => ({
    id: pl.id, name: pl.name, ...(pl.subtitle ? { subtitle: pl.subtitle } : {}), price: formatMoney(pl.price.amount, "INR"),
    ...(pl.price.original && pl.price.original > pl.price.amount ? { originalPrice: formatMoney(pl.price.original, "INR") } : {}),
    features: pl.features ?? [], isPopular: !!pl.popular,
  }));
}

// What an order is priced from (create-order, enroll-free, verify-payment): the numbers of a published cohort, never page text.
export type Sellable = {
  id: string; slug: string; title: string; enrollmentClosed: boolean;
  pricing: { inr: { currentPrice: string }; usd?: { currentPrice: string } };
  pricingPlans?: PlanView[];
};
export function sellableFromCohort(slug: string, doc: { title?: unknown; enrollmentClosed?: unknown; pricing?: unknown }): Sellable | null {
  const p = doc.pricing as CohortPricing | undefined;
  if (!p || (p.kind !== "single" && p.kind !== "plans")) return null;
  const view = pricingFromCohort(p);
  return {
    id: slug, slug, title: String(doc.title ?? slug), enrollmentClosed: !!doc.enrollmentClosed,
    pricing: { inr: { currentPrice: view.inr.currentPrice }, ...(view.usd ? { usd: { currentPrice: view.usd.currentPrice } } : {}) },
    ...(p.kind === "plans" ? { pricingPlans: plansFromCohort(p) } : {}),
  };
}

export function buildCourse(cohort: CohortView, course: CourseView, priceFrom: Source, fileEntry: FileEntry | undefined): CatalogCourse {
  const pitch = course.pitch ?? {};
  const fromPitch = Object.fromEntries(PITCH_KEYS.filter((k) => pitch[k] !== undefined).map((k) => [k, pitch[k]]));
  const useFiles = priceFrom === "files";
  const inFiles = !!fileEntry?.pricing;
  const pricing = useFiles && inFiles ? (fileEntry!.pricing as PricingView) : pricingFromCohort(cohort.pricing);
  // Files price the order: a portal-only cohort cannot be bought yet, so it is shown as closed (never a price the server would refuse).
  const enrollmentClosed = useFiles ? (inFiles ? !!fileEntry!.enrollmentClosed : true) : !!cohort.enrollmentClosed;
  // The plan cards follow the price source too: the plans that price the order are the plans the page shows.
  const pricingPlans = useFiles && inFiles ? (fileEntry as { pricingPlans?: PlanView[] }).pricingPlans : plansFromCohort(cohort.pricing);
  return {
    ...fromPitch,
    ...(pricingPlans ? { pricingPlans } : {}),   // a block the owner left out stays absent: every sales component already hides or defaults a missing block
    id: cohort.slug, slug: cohort.slug, courseSlug: cohort.courseSlug, title: cohort.title,
    statusText: cohort.statusText ?? "", demoOffer: cohort.demoOffer ?? "", duration: cohort.duration ?? "", contactPhone: cohort.contactPhone ?? "",
    enrollmentClosed, listed: cohort.listed !== false, pricing,
    // Tells the page which coupon check to use: only a course priced from the portal asks the server (a fallback to the files behaves exactly like `files`).
    ...(useFiles ? {} : { pricedBy: "database" as const }),
  };
}

// The private fields a page object must never carry (links go through the access-checked route /api/learning/links/{slug}).
export const PRIVATE_FIELDS = ["liveLink", "whatsappLink"] as const;
export function withoutPrivateLinks<T extends Record<string, unknown>>(entry: T): Omit<T, (typeof PRIVATE_FIELDS)[number]> {
  const { liveLink: _live, whatsappLink: _chat, ...rest } = entry;
  return rest as never;
}

// Support phone for the "chat with us" button: digits only, with India's 91 added to a plain 10-digit number. null when there is nothing usable (empty, too short or long, or starting with 0).
export const FALLBACK_WHATSAPP_NUMBER = "917057034840";
export function whatsappNumber(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.startsWith("0")) return null;   // a trunk-dialled number is not in the international form wa.me needs
  if (digits.length === 10) return `91${digits}`;
  return digits.length >= 11 && digits.length <= 15 ? digits : null;
}
