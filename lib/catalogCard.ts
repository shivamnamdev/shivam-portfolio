// lib/catalogCard.ts
// What a catalog card shows besides its title: the price in the chosen currency, the instructor, and the quick preview (highlights and syllabus).
// Pure, so the rules are unit-tested (tests/unit/catalog-card.spec.ts). Prices are only ever read from the course's own price labels, never converted.
import { formatPrice, parsePrice, type CurrencyCode } from "./pricing";

export const INSTRUCTOR = "Shivam Namdev";
export const PREVIEW_LIMIT = 6;

export type CardCourse = {
  enrollmentClosed: boolean;
  format?: "live" | "recorded";
  pricing?: { inr: { currentPrice: string }; usd?: { currentPrice: string } };
  pricingPlans?: Array<{ price: string }>;
  vsl?: { facts?: string[] };
  modules?: Array<{ title: string; week?: string }>;
};

export type CardPrice = { label: string; note?: "INR only" };

// A closed cohort shows no price. A plan course ("From ...") is sold in INR only (lib/pricing getBasePrice), and a course may have no USD price:
// in USD mode both keep their INR price and say so.
export function cardPrice(c: Omit<CardCourse, "modules" | "vsl">, currency: CurrencyCode): CardPrice {
  if (c.enrollmentClosed) return { label: c.format === "recorded" ? "Soon" : "Closed" };
  if (c.pricingPlans?.length) {
    const label = `From ${formatPrice(Math.min(...c.pricingPlans.map((p) => parsePrice(p.price))), "INR")}`;
    return currency === "USD" ? { label, note: "INR only" } : { label };
  }
  const inr = c.pricing?.inr.currentPrice ?? "";
  if (currency === "USD") {
    const usd = c.pricing?.usd?.currentPrice;
    return usd ? { label: usd } : { label: inr, note: "INR only" };
  }
  return { label: inr };
}

export type CardPreview = { highlights: string[]; modules: string[]; moreModules: number };

// The quick preview: the course's highlights (its "facts") and the first module titles of its syllabus, each capped.
export function cardPreview(c: CardCourse): CardPreview {
  const facts = (c.vsl?.facts ?? []).filter((f) => typeof f === "string" && f.trim());
  const titles = (c.modules ?? []).map((m) => m.title).filter((t) => typeof t === "string" && t.trim());
  return { highlights: facts.slice(0, PREVIEW_LIMIT), modules: titles.slice(0, PREVIEW_LIMIT), moreModules: Math.max(0, titles.length - PREVIEW_LIMIT) };
}

// The fields a card needs, and nothing else, so the browser is not sent whole course objects (the grid is a client component for the toggle and the panels).
export type GridCourse = Omit<CardCourse, "modules" | "vsl"> & {
  id: string; slug: string; title: string; statusText: string; duration: string;
  highlights: string[]; modules: string[]; moreModules: number;
  previewStatus?: "draft" | "published" | "archived"; previewNote?: string;
};
type GridSource = CardCourse & { id: string; slug: string; title: string; statusText: string; duration: string; previewStatus?: GridCourse["previewStatus"]; previewNote?: string };

export function toGridCourse(c: GridSource): GridCourse {
  const p = cardPreview(c);
  return {
    id: c.id, slug: c.slug, title: c.title, statusText: c.statusText, duration: c.duration, enrollmentClosed: c.enrollmentClosed,
    ...(c.format ? { format: c.format } : {}),
    ...(c.pricing ? { pricing: { inr: { currentPrice: c.pricing.inr.currentPrice }, ...(c.pricing.usd ? { usd: { currentPrice: c.pricing.usd.currentPrice } } : {}) } } : {}),
    ...(c.pricingPlans?.length ? { pricingPlans: c.pricingPlans.map((x) => ({ price: x.price })) } : {}),
    highlights: p.highlights, modules: p.modules, moreModules: p.moreModules,
    ...(c.previewStatus ? { previewStatus: c.previewStatus } : {}), ...(c.previewNote ? { previewNote: c.previewNote } : {}),
  };
}
