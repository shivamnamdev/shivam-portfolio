// lib/catalog/mapping.ts
// Pure rules that turn a published course and cohort (the admin portal's documents) into the object the sales pages already use
// (the shape of an entry in data/courses.ts), minus the private links. No database, no network.
//
// Price rule (keeps "the amount shown equals the amount charged"): the payment routes still price from the data files until slice 5d, so while
// `priceFrom` is "files" the price and the open or closed flag come from the matching file entry. A cohort that exists only in the portal has no
// file entry, so it shows as closed (the server could not charge it). `priceFrom` is "database" only when PORTAL_COUPONS is "database".
import type { Source } from "./source";

export type MoneyView = { currentPrice: string; originalPrice: string; savingsText: string; currencyCode: "INR" | "USD" };
export type PricingView = { inr: MoneyView; usd?: MoneyView };
type Price = { amount: number; original?: number };
type CohortPricing = { kind: "single"; inr: Price; usd?: Price } | { kind: "plans"; currency: "INR"; plans: Array<{ id: string; name: string; price: Price; features?: string[]; popular?: boolean; subtitle?: string }> };

export type CohortView = {
  slug: string; courseSlug: string; title: string; statusText?: string; demoOffer?: string; duration?: string; contactPhone?: string;
  enrollmentClosed?: boolean; listed?: boolean; pricing: CohortPricing;
};
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

// The price block of the sales page from a cohort's pricing. A plans cohort shows its lowest plan price (the plan picker arrives with checkout in 5d).
export function pricingFromCohort(p: CohortPricing): PricingView {
  if (p.kind === "single") return { inr: moneyView(p.inr, "INR"), ...(p.usd ? { usd: moneyView(p.usd, "USD") } : {}) };
  const cheapest = [...p.plans].sort((a, b) => a.price.amount - b.price.amount)[0];
  return { inr: moneyView(cheapest ? cheapest.price : { amount: 0 }, "INR") };
}

export function buildCourse(cohort: CohortView, course: CourseView, priceFrom: Source, fileEntry: FileEntry | undefined): CatalogCourse {
  const pitch = course.pitch ?? {};
  const fromPitch = Object.fromEntries(PITCH_KEYS.filter((k) => pitch[k] !== undefined).map((k) => [k, pitch[k]]));
  const useFiles = priceFrom === "files";
  const inFiles = !!fileEntry?.pricing;
  const pricing = useFiles && inFiles ? (fileEntry!.pricing as PricingView) : pricingFromCohort(cohort.pricing);
  // Files price the order: a portal-only cohort cannot be bought yet, so it is shown as closed (never a price the server would refuse).
  const enrollmentClosed = useFiles ? (inFiles ? !!fileEntry!.enrollmentClosed : true) : !!cohort.enrollmentClosed;
  return {
    ...fromPitch,   // a block the owner left out stays absent: every sales component already hides or defaults a missing block
    id: cohort.slug, slug: cohort.slug, courseSlug: cohort.courseSlug, title: cohort.title,
    statusText: cohort.statusText ?? "", demoOffer: cohort.demoOffer ?? "", duration: cohort.duration ?? "", contactPhone: cohort.contactPhone ?? "",
    enrollmentClosed, listed: cohort.listed !== false, pricing,
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
