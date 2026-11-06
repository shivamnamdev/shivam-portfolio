// lib/adminUi/engagement.ts
// Pure helpers behind the banner, notification and e-mail template screens: form <-> API payload mapping, early hints, and the "would this
// banner show now" explanation. The server decides every rule; unit tests run the same inputs through the server's own modules (drift guards),
// so these hints cannot disagree with it. The server modules import next/server, so the rules are mirrored here, not imported.
import { isSlug, isoToLocalInput, localInputToIso, sameJson } from "./forms";

// ---- shared text rules (mirror of banners.ts plainText / ctaLink) ---------------------------------------------------------------------------
export const plainTextProblem = (s: string, max: number, label: string): string | null => {
  if (!s.trim()) return `${label} is required`;
  if (s.trim().length > max) return `${label} must be at most ${max} characters`;
  if (/[<>]/.test(s)) return `${label} must be plain text (no < or >)`;
  if (/[\u0000-\u001f\u007f]/.test(s)) return `${label} must be one line of plain text`;
  return null;
};
export function linkProblem(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  if (s.startsWith("/")) return s.length > 500 || s.startsWith("//") || s.startsWith("/\\") || /[\s\u0000-\u001f\\<>"']/.test(s) ? "Use an https link or a path on this site such as /courses" : null;
  try { const u = new URL(s); return u.protocol === "https:" && s.length <= 500 ? null : "Use an https link or a path on this site such as /courses"; } catch { return "Use an https link or a path on this site such as /courses"; }
}

// ---- banners -------------------------------------------------------------------------------------------------------------------------------
export const PURPOSES = ["announcement", "offer", "course-promo", "learner-notice", "maintenance"] as const;
export const STYLES = ["info", "urgent", "success", "warning"] as const;
export const PLACEMENTS = ["site-top", "courses", "course-page", "learning", "dashboard"] as const;
export const AUDIENCE_KINDS = ["all", "visitors", "learners", "cohort", "plan"] as const;
export type AudienceKind = (typeof AUDIENCE_KINDS)[number];
export type Audience = { kind: "all" | "visitors" | "learners" } | { kind: "cohort"; cohortSlug: string } | { kind: "plan"; planId: string };
export const AUDIENCE_LABEL: Record<AudienceKind, string> = { all: "Everyone", visitors: "Visitors who are not signed in", learners: "Signed-in learners", cohort: "Learners of one cohort", plan: "Learners on one plan" };
export const PLACEMENT_LABEL: Record<(typeof PLACEMENTS)[number], string> = { "site-top": "Top of every page", courses: "Courses page", "course-page": "A course page", learning: "Learning page", dashboard: "Dashboard" };

export type BannerView = {
  slug: string; status: string; version: number; purpose: (typeof PURPOSES)[number]; message: string; ctaLabel?: string; ctaUrl?: string; style: (typeof STYLES)[number];
  placement: (typeof PLACEMENTS)[number]; audience: Audience; startsAt: string | null; endsAt: string | null; countdownTo?: string; dismissible: boolean; priority: number; allowMultiple: boolean;
};
export type BannerForm = {
  slug: string; purpose: BannerView["purpose"]; message: string; placement: BannerView["placement"]; style: BannerView["style"]; ctaLabel: string; ctaUrl: string;
  audienceKind: AudienceKind; audienceValue: string; startsAt: string; endsAt: string; countdownTo: string; dismissible: boolean; priority: string; allowMultiple: boolean;
};
export const emptyBannerForm = (): BannerForm => ({
  slug: "", purpose: "announcement", message: "", placement: "site-top", style: "info", ctaLabel: "", ctaUrl: "", audienceKind: "all", audienceValue: "",
  startsAt: "", endsAt: "", countdownTo: "", dismissible: true, priority: "0", allowMultiple: false,
});
export const bannerToForm = (b: BannerView): BannerForm => ({
  slug: b.slug, purpose: b.purpose, message: b.message, placement: b.placement, style: b.style, ctaLabel: b.ctaLabel ?? "", ctaUrl: b.ctaUrl ?? "",
  audienceKind: b.audience.kind, audienceValue: b.audience.kind === "cohort" ? b.audience.cohortSlug : b.audience.kind === "plan" ? b.audience.planId : "",
  startsAt: isoToLocalInput(b.startsAt), endsAt: isoToLocalInput(b.endsAt), countdownTo: isoToLocalInput(b.countdownTo), dismissible: b.dismissible, priority: String(b.priority), allowMultiple: b.allowMultiple,
});
export const audienceFromForm = (f: Pick<BannerForm, "audienceKind" | "audienceValue">): Audience =>
  f.audienceKind === "cohort" ? { kind: "cohort", cohortSlug: f.audienceValue.trim() } : f.audienceKind === "plan" ? { kind: "plan", planId: f.audienceValue.trim() } : { kind: f.audienceKind };

// Problems to show before saving (an empty list means the form looks fine). `creating` adds the slug rule.
export function bannerProblems(f: BannerForm, creating: boolean): string[] {
  const out: string[] = [];
  if (creating && !isSlug(f.slug.trim())) out.push("The slug needs lower-case letters, numbers, - or _ (up to 100 characters)");
  const m = plainTextProblem(f.message, 280, "The message"); if (m) out.push(m);
  if (f.ctaLabel.trim()) { const l = plainTextProblem(f.ctaLabel, 40, "The button label"); if (l) out.push(l); }
  const link = linkProblem(f.ctaUrl); if (link) out.push(link);
  if (!!f.ctaLabel.trim() !== !!f.ctaUrl.trim()) out.push("A button needs both a label and a link (or neither)");
  if ((f.audienceKind === "cohort" || f.audienceKind === "plan") && !isSlug(f.audienceValue.trim())) out.push(f.audienceKind === "cohort" ? "Enter the cohort slug for this audience" : "Enter the plan id for this audience");
  const p = Number(f.priority);
  if (!Number.isInteger(p) || p < 0 || p > 100) out.push("Priority is a whole number from 0 to 100");
  const s = localInputToIso(f.startsAt); const e = localInputToIso(f.endsAt);
  if (s && e && Date.parse(e) <= Date.parse(s)) out.push("The end must be after the start");
  return out;
}

const nullable = (v: string, convert: (s: string) => string | undefined = (s) => s.trim()) => (v.trim() ? convert(v) : null);
// Body for POST /banners (optional parts are left out when empty).
export function bannerBody(f: BannerForm): Record<string, unknown> {
  const body: Record<string, unknown> = {
    slug: f.slug.trim(), purpose: f.purpose, message: f.message.trim(), placement: f.placement, style: f.style, audience: audienceFromForm(f),
    dismissible: f.dismissible, priority: Number(f.priority), allowMultiple: f.allowMultiple,
  };
  if (f.ctaLabel.trim()) body.ctaLabel = f.ctaLabel.trim();
  if (f.ctaUrl.trim()) body.ctaUrl = f.ctaUrl.trim();   // sent even without a label: the server refuses the pair, nothing is dropped silently
  const s = localInputToIso(f.startsAt); const e = localInputToIso(f.endsAt); const c = localInputToIso(f.countdownTo);
  if (s) body.startsAt = s;
  if (e) body.endsAt = e;
  if (c) body.countdownTo = c;
  return body;
}
// Body for PATCH /banners/{slug}: only what changed. An emptied link, label, date or countdown is sent as null (removes it).
export function bannerChanges(original: BannerView, f: BannerForm): Record<string, unknown> {
  const o = bannerToForm(original);
  const out: Record<string, unknown> = {};
  if (f.purpose !== o.purpose) out.purpose = f.purpose;
  if (f.message.trim() !== o.message) out.message = f.message.trim();
  if (f.placement !== o.placement) out.placement = f.placement;
  if (f.style !== o.style) out.style = f.style;
  if (!sameJson(audienceFromForm(f), original.audience)) out.audience = audienceFromForm(f);
  if (f.ctaLabel.trim() !== o.ctaLabel) out.ctaLabel = nullable(f.ctaLabel);
  if (f.ctaUrl.trim() !== o.ctaUrl) out.ctaUrl = nullable(f.ctaUrl);
  if (f.startsAt !== o.startsAt) out.startsAt = nullable(f.startsAt, (s) => localInputToIso(s));
  if (f.endsAt !== o.endsAt) out.endsAt = nullable(f.endsAt, (s) => localInputToIso(s));
  if (f.countdownTo !== o.countdownTo) out.countdownTo = nullable(f.countdownTo, (s) => localInputToIso(s));
  if (f.dismissible !== o.dismissible) out.dismissible = f.dismissible;
  if (Number(f.priority) !== original.priority) out.priority = Number(f.priority);
  if (f.allowMultiple !== o.allowMultiple) out.allowMultiple = f.allowMultiple;
  return out;
}

// ---- "would it show?" (explains the server rule visibleBanners for ONE banner; a higher-priority banner in the same place can still hide it) -----
export type PreviewViewer = { kind: "visitor" } | { kind: "learner"; cohortSlugs?: string[]; planIds?: string[] };
export function audienceReaches(a: Audience, v: PreviewViewer): boolean {
  if (a.kind === "all") return true;
  if (a.kind === "visitors") return v.kind === "visitor";
  if (v.kind !== "learner") return false;
  if (a.kind === "cohort") return !!v.cohortSlugs?.includes(a.cohortSlug);
  if (a.kind === "plan") return !!v.planIds?.includes(a.planId);
  return true;   // "learners": any signed-in learner
}
export function bannerVisibility(b: Pick<BannerView, "status" | "startsAt" | "endsAt" | "audience">, viewer: PreviewViewer, now: Date): { visible: boolean; reason: string } {
  const t = now.getTime();
  if (b.status !== "published") return { visible: false, reason: `Not shown: it is ${b.status}. Only published banners show.` };
  if (b.startsAt && Date.parse(b.startsAt) > t) return { visible: false, reason: `Not shown yet: it starts ${b.startsAt.slice(0, 16).replace("T", " ")} UTC.` };
  if (b.endsAt && Date.parse(b.endsAt) <= t) return { visible: false, reason: "Not shown: its end time has passed." };
  if (!audienceReaches(b.audience, viewer)) return { visible: false, reason: "Not shown to this kind of viewer." };
  return { visible: true, reason: "Shown to this viewer now (unless a banner with a higher priority in the same place takes the spot)." };
}
export const countdownText = (target: string | undefined, now: Date): string | null => {
  if (!target) return null;
  const s = Math.floor((Date.parse(target) - now.getTime()) / 1000);
  if (!(s > 0)) return null;
  const d = Math.floor(s / 86400); const h = Math.floor((s % 86400) / 3600); const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h left` : h > 0 ? `${h}h ${m}m left` : `${m}m left`;
};

// ---- notifications -------------------------------------------------------------------------------------------------------------------------
export const NOTIFICATION_TYPES = ["transactional", "announcement", "reminder", "progress", "marketing", "admin-alert"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type Channel = "inbox" | "email";
// Mirror of the server's N1 table: marketing is inbox only on purpose; progress and admin alerts never leave the site.
export const CHANNELS_BY_TYPE: Record<NotificationType, readonly Channel[]> = {
  transactional: ["inbox", "email"], announcement: ["inbox", "email"], reminder: ["inbox", "email"], progress: ["inbox"], marketing: ["inbox"], "admin-alert": ["inbox"],
};
export type TargetKind = "all" | "cohort" | "plan" | "user" | "admins";
export const TARGET_LABEL: Record<TargetKind, string> = { all: "Everyone", cohort: "Learners of one cohort", plan: "Learners on one plan", user: "One learner", admins: "Admins only" };
export type Target = { kind: "all" | "admins" } | { kind: "cohort"; cohortSlug: string } | { kind: "plan"; planId: string } | { kind: "user"; userId: string };
export type NotificationView = {
  id: string; type: NotificationType; title: string; body: string; link: string | null; channels: Channel[]; target: Target; publishAt: string; expiresAt: string | null;
  status: "scheduled" | "live" | "expired"; emailSentAt: string | null; emailRecipients: number | null; createdAt: string; readCount?: number;
};
export type NotificationForm = {
  type: NotificationType; title: string; body: string; link: string; email: boolean; targetKind: TargetKind; targetValue: string; publishAt: string; expiresAt: string;
};
export const emptyNotificationForm = (): NotificationForm => ({ type: "announcement", title: "", body: "", link: "", email: false, targetKind: "all", targetValue: "", publishAt: "", expiresAt: "" });
export const emailAllowed = (type: NotificationType): boolean => CHANNELS_BY_TYPE[type].includes("email");
// Changing the type fixes up what no longer fits: the e-mail tick goes when the type cannot e-mail, and admin alerts are aimed at admins (and only they).
export function withType(f: NotificationForm, type: NotificationType): NotificationForm {
  const targetKind: TargetKind = type === "admin-alert" ? "admins" : f.targetKind === "admins" ? "all" : f.targetKind;
  return { ...f, type, email: emailAllowed(type) ? f.email : false, targetKind, targetValue: targetKind === f.targetKind ? f.targetValue : "" };
}
export const targetFromForm = (f: Pick<NotificationForm, "targetKind" | "targetValue">): Target => {
  const v = f.targetValue.trim();
  return f.targetKind === "cohort" ? { kind: "cohort", cohortSlug: v } : f.targetKind === "plan" ? { kind: "plan", planId: v } : f.targetKind === "user" ? { kind: "user", userId: v } : { kind: f.targetKind };
};
export function targetText(t: Target): string {
  return t.kind === "cohort" ? `Cohort ${t.cohortSlug}` : t.kind === "plan" ? `Plan ${t.planId}` : t.kind === "user" ? `Learner ${t.userId}` : TARGET_LABEL[t.kind];
}
export function notificationProblems(f: NotificationForm, now: Date): string[] {
  const out: string[] = [];
  const t = plainTextProblem(f.title, 120, "The title"); if (t) out.push(t);
  if (!f.body.trim()) out.push("The message is required");
  else if (f.body.length > 2000) out.push("The message must be at most 2000 characters");
  else if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(f.body)) out.push("The message contains control characters");
  const link = linkProblem(f.link); if (link) out.push(link);
  if ((f.type === "admin-alert") !== (f.targetKind === "admins")) out.push(f.type === "admin-alert" ? "An admin alert is only for admins" : "Only an admin alert can be aimed at admins");
  if (f.targetKind === "cohort" && !isSlug(f.targetValue.trim())) out.push("Enter the cohort slug");
  if (f.targetKind === "plan" && !isSlug(f.targetValue.trim())) out.push("Enter the plan id");
  if (f.targetKind === "user" && !/^user_[A-Za-z0-9]+$/.test(f.targetValue.trim())) out.push("Enter the learner's Clerk user id (user_...)");
  if (f.email && !emailAllowed(f.type)) out.push(`A ${f.type} notification cannot be e-mailed`);
  const p = localInputToIso(f.publishAt); const e = localInputToIso(f.expiresAt);
  if (f.email && p && Date.parse(p) > now.getTime() + 60_000) out.push("A notification with e-mail cannot be scheduled for later. Leave the publish time empty");
  if (e && Date.parse(e) <= (p ? Date.parse(p) : now.getTime())) out.push("The expiry must be after the publish time");
  return out;
}
export function notificationBody(f: NotificationForm): Record<string, unknown> {
  const body: Record<string, unknown> = {
    type: f.type, title: f.title.trim(), body: f.body.replace(/\r\n/g, "\n"), target: targetFromForm(f), channels: f.email ? ["inbox", "email"] : ["inbox"],
  };
  if (f.link.trim()) body.link = f.link.trim();
  const p = localInputToIso(f.publishAt); const e = localInputToIso(f.expiresAt);
  if (p) body.publishAt = p;
  if (e) body.expiresAt = e;
  return body;
}

// The E-mail column of the list.
export const emailState = (n: Pick<NotificationView, "channels" | "emailSentAt" | "emailRecipients">): string =>
  !n.channels.includes("email") ? "No e-mail" : n.emailSentAt ? `Sent to ${n.emailRecipients ?? 0}` : "Not sent";

// What the send dialog allows: the owner must tick "I checked the recipients", and there must be somebody to send to within the announcement cap.
export function sendBlocker(n: Pick<NotificationView, "channels" | "emailSentAt">, count: number, announcementCap: number): string | null {
  if (!n.channels.includes("email")) return "This notification does not use the e-mail channel.";
  if (n.emailSentAt) return "The e-mail for this notification was already sent. It is sent once.";
  if (count < 1) return "There is nobody to e-mail for this target.";
  if (count > announcementCap) return `This would e-mail ${count} people; the limit for one announcement is ${announcementCap}. Narrow the target or raise the limit in Settings.`;
  return null;
}
export const canConfirmSend = (checked: boolean, blocker: string | null): boolean => checked && blocker === null;

// ---- e-mail templates ----------------------------------------------------------------------------------------------------------------------
export type TemplateView = { key: string; subject: string; body: string; source: "default" | "custom"; placeholders: string[]; version: number | null };
export const TEMPLATE_LIMITS = { subject: 150, body: 5000 };
export const placeholdersIn = (text: string): string[] => Array.from(text.matchAll(/\{\{([^{}]*)\}\}/g), (m) => m[1]);
// Mirror of the server's templateProblems, as a list of lines (the field name leads each line).
export function templateHints(allowed: string[], subject: string, body: string): string[] {
  const out: string[] = [];
  const check = (field: "subject" | "body", v: string, max: number) => {
    if (!v.trim()) { out.push(`${field}: is required`); return; }
    if (v.length > max) { out.push(`${field}: must be at most ${max} characters`); return; }
    if (field === "subject" && /[\r\n\u0000-\u001f\u007f]/.test(v)) { out.push("subject: must be one line"); return; }
    if (field === "body" && /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v)) { out.push("body: contains control characters"); return; }
    const unknown = placeholdersIn(v).find((n) => !allowed.includes(n));
    if (unknown !== undefined) { out.push(`${field}: uses {{${unknown}}}, which is not available here. Use: ${allowed.map((n) => `{{${n}}}`).join(", ")}`); return; }
    if (v.replace(/\{\{[^{}]*\}\}/g, "").match(/\{\{|\}\}/)) out.push(`${field}: has an unfinished {{placeholder}}`);
  };
  check("subject", subject, TEMPLATE_LIMITS.subject);
  check("body", body, TEMPLATE_LIMITS.body);
  return out;
}
// The save body: the same trimming and line-break rule as the server, so "unchanged" is judged on what would actually be stored.
export const normaliseTemplate = (subject: string, body: string) => ({ subject: subject.trim(), body: body.replace(/\r\n/g, "\n").trim() });
export const templateChanged = (saved: { subject: string; body: string }, subject: string, body: string): boolean => {
  const n = normaliseTemplate(subject, body);
  return n.subject !== saved.subject || n.body !== saved.body;
};
