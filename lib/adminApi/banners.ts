// lib/adminApi/banners.ts
// Banners (content_docs kind 'banner', key = slug). Plain text only. `visibleBanners` is the one rule that decides what a viewer sees; the
// learner and public pages (phase 5) call it, so what the admin previews and what learners get cannot differ.
import { badRequest, type FieldErrors } from "./envelope";
import { bool, httpsUrl, int, isoDate, oneOf, optional, slug, str, type Check } from "./validate";

export const PURPOSES = ["announcement", "offer", "course-promo", "learner-notice", "maintenance"] as const;
export const STYLES = ["info", "urgent", "success", "warning"] as const;
export const PLACEMENTS = ["site-top", "courses", "course-page", "learning", "dashboard"] as const;
export type Audience = { kind: "all" | "visitors" | "learners" } | { kind: "cohort"; cohortSlug: string } | { kind: "plan"; planId: string };
export type Banner = {
  purpose: (typeof PURPOSES)[number]; message: string; ctaLabel?: string; ctaUrl?: string; style: (typeof STYLES)[number];
  placement: (typeof PLACEMENTS)[number]; audience: Audience; startsAt: string | null; endsAt: string | null; countdownTo?: string;
  dismissible: boolean; priority: number; allowMultiple: boolean;
};

const ok = <T,>(value: T) => ({ ok: true as const, value });
const no = (message: string) => ({ ok: false as const, message });

// Plain text: one line, no angle brackets (so nothing can be read as a tag), no control characters.
export const plainText = (max: number): Check<string> => (v) => {
  const s = str({ max })(v);
  if (!s.ok) return s;
  if (/[<>]/.test(s.value)) return no("must be plain text (no < or >)");
  if (/[\u0000-\u001f\u007f]/.test(s.value)) return no("must be one line of plain text");
  return s;
};

// A call-to-action link: https, or a path on this site that starts with a single "/" (not "//", which leaves the site).
export const ctaLink: Check<string> = (v) => {
  if (typeof v === "string" && v.startsWith("/")) {
    if (v.length > 500 || v.startsWith("//") || v.startsWith("/\\") || /[\s\u0000-\u001f\\<>"']/.test(v)) return no("must be an https link or a path on this site");
    return ok(v);
  }
  return httpsUrl(v);
};

const audience: Check<Audience> = (v) => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return no("must be an object with a kind");
  const a = v as Record<string, unknown>;
  const kind = oneOf("all", "visitors", "learners", "cohort", "plan")(a.kind);
  if (!kind.ok) return no(`kind ${kind.message}`);
  const extra = Object.keys(a).filter((k) => k !== "kind" && !(kind.value === "cohort" && k === "cohortSlug") && !(kind.value === "plan" && k === "planId"));
  if (extra.length) return no(`${extra[0]} is not a known field`);
  if (kind.value === "cohort") { const c = slug(a.cohortSlug); return c.ok ? ok({ kind: "cohort", cohortSlug: c.value }) : no(`cohortSlug ${c.message}`); }
  if (kind.value === "plan") { const p = slug(a.planId); return p.ok ? ok({ kind: "plan", planId: p.value }) : no(`planId ${p.message}`); }
  return ok({ kind: kind.value });
};

// null clears a date, undefined leaves it alone.
const dateOrNull: Check<string | null | undefined> = (v) => (v === undefined ? ok(undefined) : v === null ? ok(null) : isoDate(v));

const fields = {
  purpose: oneOf(...PURPOSES), message: plainText(280), ctaLabel: optional(plainText(40)), ctaUrl: optional(ctaLink), style: oneOf(...STYLES),
  placement: oneOf(...PLACEMENTS), audience, startsAt: dateOrNull, endsAt: dateOrNull, countdownTo: optional(isoDate),
  dismissible: bool, priority: int({ min: 0, max: 100 }), allowMultiple: bool,
};
const opt = <K extends keyof typeof fields>(k: K) => optional(fields[k] as Check<unknown>);

export const bannerCreateShape = {
  slug, purpose: fields.purpose, message: fields.message, placement: fields.placement,
  ctaLabel: fields.ctaLabel, ctaUrl: fields.ctaUrl, style: opt("style"), audience: opt("audience"), startsAt: fields.startsAt, endsAt: fields.endsAt,
  countdownTo: fields.countdownTo, dismissible: opt("dismissible"), priority: opt("priority"), allowMultiple: opt("allowMultiple"),
};
// null on ctaLabel, ctaUrl or countdownTo removes it in an update, so those three use the nullable form below.
const clearable = <T,>(check: Check<T>): Check<T | null | undefined> => (v) => (v === undefined ? ok(undefined) : v === null ? ok(null) : check(v));
export const bannerUpdateShape = {
  purpose: opt("purpose"), message: opt("message"), placement: opt("placement"), style: opt("style"), audience: opt("audience"),
  ctaLabel: clearable(plainText(40)), ctaUrl: clearable(ctaLink), startsAt: fields.startsAt, endsAt: fields.endsAt, countdownTo: clearable(isoDate),
  dismissible: opt("dismissible"), priority: opt("priority"), allowMultiple: opt("allowMultiple"),
};

export const bannerDefaults = { style: "info", audience: { kind: "all" }, startsAt: null, endsAt: null, dismissible: true, priority: 0, allowMultiple: false } as const;

// Rules that look at more than one field. Returns the problems by field name.
export function bannerProblems(b: Partial<Banner>): FieldErrors {
  const f: FieldErrors = {};
  if (!!b.ctaLabel !== !!b.ctaUrl) f[b.ctaLabel ? "ctaUrl" : "ctaLabel"] = "a link needs both ctaLabel and ctaUrl";
  if (b.startsAt && b.endsAt && Date.parse(b.endsAt) <= Date.parse(b.startsAt)) f.endsAt = "must be after startsAt";
  return f;
}
export function assertBanner(b: Partial<Banner>): void {
  const f = bannerProblems(b);
  if (Object.keys(f).length) throw badRequest("Some fields are not valid", f);
}

// Removes undefined and turns null into "absent" for the optional parts, so the stored document stays small and predictable.
export function cleanBanner(b: Record<string, unknown>): Banner {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(b)) {
    if (v === undefined) continue;
    if (v === null && !(k === "startsAt" || k === "endsAt")) continue;
    out[k] = v;
  }
  return out as Banner;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------
export type Viewer = { kind: "visitor" } | { kind: "learner"; cohortSlugs?: string[]; planIds?: string[] };
export type BannerRow = { slug: string; status: string; doc: Banner };
export type ShownBanner = { slug: string; message: string; ctaLabel?: string; ctaUrl?: string; style: Banner["style"]; dismissible: boolean; countdownSeconds: number | null; priority: number };

export const audienceMatches = (a: Audience, v: Viewer): boolean => {
  if (a.kind === "all") return true;
  if (a.kind === "visitors") return v.kind === "visitor";
  if (v.kind !== "learner") return false;
  if (a.kind === "learners") return true;
  if (a.kind === "cohort") return !!v.cohortSlugs?.includes(a.cohortSlug);
  if (a.kind === "plan") return !!v.planIds?.includes(a.planId);
  return false;
};

// What a viewer sees in one placement: published banners inside their window and audience, best priority first. The top banner shows alone
// unless it allows several, in which case every banner that allows several shows. A countdown that has reached zero is dropped, never negative.
export function visibleBanners(rows: BannerRow[], viewer: Viewer, placement: Banner["placement"], now: Date): ShownBanner[] {
  const t = now.getTime();
  const live = rows.filter((r) => r.status === "published" && r.doc.placement === placement
    && (!r.doc.startsAt || Date.parse(r.doc.startsAt) <= t) && (!r.doc.endsAt || Date.parse(r.doc.endsAt) > t) && audienceMatches(r.doc.audience, viewer))
    .sort((a, b) => b.doc.priority - a.doc.priority || a.slug.localeCompare(b.slug));
  if (!live.length) return [];
  const chosen = live[0].doc.allowMultiple ? live.filter((r) => r.doc.allowMultiple) : [live[0]];
  return chosen.map((r) => {
    const left = r.doc.countdownTo ? Math.floor((Date.parse(r.doc.countdownTo) - t) / 1000) : 0;
    return {
      slug: r.slug, message: r.doc.message, ...(r.doc.ctaLabel && r.doc.ctaUrl ? { ctaLabel: r.doc.ctaLabel, ctaUrl: r.doc.ctaUrl } : {}),
      style: r.doc.style, dismissible: r.doc.dismissible, countdownSeconds: left > 0 ? left : null, priority: r.doc.priority,
    };
  });
}
