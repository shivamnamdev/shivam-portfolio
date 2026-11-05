// lib/adminUi/forms.ts
// Pure helpers behind the course and cohort screens: which life-cycle buttons to offer, slug suggestions, the pitch JSON box, date inputs,
// and the cohort form <-> API payload mapping (only changed fields are sent, as the API's PATCH expects). The server stays the judge of every
// rule; the checks here only give the owner an early, friendly hint. A unit test keeps the life-cycle table equal to the server's.
import { amountIsAllowed, PAYMENT_MINIMUM_MAJOR } from "../adminApi/payMinimum";

export type Status = "draft" | "published" | "archived";
export const LIFECYCLE: Record<string, { from: Status[]; label: string; confirm: string; danger?: boolean }> = {
  publish: { from: ["draft"], label: "Publish", confirm: "Learners will be able to see it once the learner portal reads published items." },
  unpublish: { from: ["published"], label: "Move back to draft", confirm: "It will no longer count as published." },
  archive: { from: ["draft", "published"], label: "Archive", confirm: "It is hidden from lists. You can restore it later.", danger: true },
  restore: { from: ["archived"], label: "Restore as draft", confirm: "It comes back as a draft." },
};
export const availableActions = (status: string): string[] => Object.entries(LIFECYCLE).filter(([, r]) => r.from.includes(status as Status)).map(([k]) => k);

// A slug suggestion from a title: lower case, letters and digits, single dashes, at most 100 characters, never starting with a dash.
export function slugify(title: string): string {
  const s = title.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100).replace(/-+$/g, "");
  return s;
}
export const isSlug = (s: string): boolean => /^[a-z0-9][a-z0-9_-]*$/.test(s) && s.length <= 100;

// The course "pitch" is free JSON for now. Empty means {}. Only an object is accepted (the API refuses anything else).
export function parsePitch(text: string): { ok: true; value: Record<string, unknown> } | { ok: false; message: string } {
  if (!text.trim()) return { ok: true, value: {} };
  let v: unknown;
  try { v = JSON.parse(text); } catch (e) { return { ok: false, message: `Not valid JSON: ${(e as Error).message}` }; }
  if (!v || typeof v !== "object" || Array.isArray(v)) return { ok: false, message: "The pitch must be a JSON object, for example {\"headline\": \"...\"}" };
  return { ok: true, value: v as Record<string, unknown> };
}
export const pitchText = (v: unknown): string => JSON.stringify(v ?? {}, null, 2);

// <input type="datetime-local"> works in the browser's local time without a zone; the API stores an ISO instant.
const pad = (n: number) => String(n).padStart(2, "0");
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function localInputToIso(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

// ---- pricing -----------------------------------------------------------------------------------------------------------------------------
export type Price = { amount: number; original?: number };
export type Plan = { id: string; name: string; subtitle?: string; price: Price; popular?: boolean; features: string[] };
export type Pricing = { kind: "single"; inr: Price; usd?: Price } | { kind: "plans"; currency: "INR"; plans: Plan[] };

// The number boxes hold text while typing. "" is "not set"; anything that is not a finite number >= 0 is reported, not guessed.
export const parseMoney = (text: string): number | null | undefined => {
  if (text.trim() === "") return undefined;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? n : null;   // null = invalid
};

// Early hints for the owner (the server's checkPricing and Q7 rule are the real ones). Returns one message per problem.
export function pricingHints(p: Pricing): string[] {
  const out: string[] = [];
  const check = (label: string, price: Price | undefined, currency: "INR" | "USD") => {
    if (!price) return;
    if (!amountIsAllowed(price.amount, currency)) out.push(`${label}: an amount above zero must be at least ${PAYMENT_MINIMUM_MAJOR[currency]} ${currency} (zero makes the course free)`);
    if (price.original !== undefined && price.original < price.amount) out.push(`${label}: the original price cannot be lower than the price`);
  };
  if (p.kind === "single") { check("INR price", p.inr, "INR"); check("USD price", p.usd, "USD"); }
  else {
    const ids = p.plans.map((x) => x.id);
    if (new Set(ids).size !== ids.length) out.push("Plan ids must be unique");
    for (const pl of p.plans) { if (!pl.name.trim()) out.push(`Plan ${pl.id || "(no id)"} needs a name`); if (!isSlug(pl.id)) out.push(`Plan id "${pl.id}" must be lower case letters, digits, - or _`); check(`Plan ${pl.id || "(no id)"}`, pl.price, "INR"); }
  }
  return out;
}

export const emptyPlan = (n: number): Plan => ({ id: `plan-${n}`, name: "", price: { amount: 0 }, features: [] });
export const samePricing = (a: Pricing | undefined, b: Pricing | undefined): boolean => JSON.stringify(a) === JSON.stringify(b);

// ---- cohort form -------------------------------------------------------------------------------------------------------------------------
export type CohortForm = {
  title: string; statusText: string; demoOffer: string; duration: string; contactPhone: string; enrollmentClosed: boolean; listed: boolean;
  startsAt: string; endsAt: string; pricing: Pricing;
};
type CohortLike = Partial<Record<"title" | "statusText" | "demoOffer" | "duration" | "contactPhone" | "startsAt" | "endsAt", string>> & { enrollmentClosed?: boolean; listed?: boolean; pricing: Pricing };

export const cohortToForm = (c: CohortLike): CohortForm => ({
  title: c.title ?? "", statusText: c.statusText ?? "", demoOffer: c.demoOffer ?? "", duration: c.duration ?? "", contactPhone: c.contactPhone ?? "",
  enrollmentClosed: c.enrollmentClosed ?? false, listed: c.listed ?? true, startsAt: isoToLocalInput(c.startsAt), endsAt: isoToLocalInput(c.endsAt), pricing: c.pricing,
});

// The PATCH body: only what differs from the form the cohort was loaded as. Text fields cannot be cleared by the API (empty text is refused or
// ignored there), so an emptied optional box is left out rather than sent as "". Dates are only sent when set.
export function cohortChanges(original: CohortForm, edited: CohortForm): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of ["title", "statusText", "demoOffer", "duration", "contactPhone"] as const) {
    if (edited[k] !== original[k] && edited[k].trim() !== "") out[k] = edited[k].trim();
  }
  for (const k of ["enrollmentClosed", "listed"] as const) if (edited[k] !== original[k]) out[k] = edited[k];
  for (const k of ["startsAt", "endsAt"] as const) if (edited[k] !== original[k]) { const iso = localInputToIso(edited[k]); if (iso) out[k] = iso; }
  if (!samePricing(original.pricing, edited.pricing)) out.pricing = edited.pricing;
  return out;
}

// A plain notice when any price is zero, because zero means free enrolment (never an error; it is a deliberate choice the owner should see).
export function freeNotice(p: Pricing): string | null {
  const zero = p.kind === "single" ? [p.inr.amount, p.usd?.amount].some((a) => a === 0) : p.plans.filter((x) => x.price.amount === 0).map((x) => x.id);
  if (p.kind === "single") return zero ? "A price of 0 makes this cohort free to join." : null;
  return (zero as string[]).length ? `Free to join: ${(zero as string[]).join(", ")} (price 0).` : null;
}
