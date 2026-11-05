// lib/adminApi/notifications.ts
// In-app notifications and the rules around the explicit e-mail send. Pure and unit-tested; the database side is notificationStore.ts.
// Rules: N1 channels by type, N2 e-mail send (cap, once, no recipient list from the request), N3 timing, N5 admin alerts are for admins only.
import { badRequest, conflict, unprocessable } from "./envelope";
import { ctaLink, plainText } from "./banners";
import { renderPlain } from "./emailTemplates";
import { arrayOf, isoDate, oneOf, optional, slug, str, type Check } from "./validate";

export const TYPES = ["transactional", "announcement", "reminder", "progress", "marketing", "admin-alert"] as const;
export type NotificationType = (typeof TYPES)[number];
export type Channel = "inbox" | "email";
export type Target = { kind: "all" } | { kind: "cohort"; cohortSlug: string } | { kind: "plan"; planId: string } | { kind: "user"; userId: string } | { kind: "admins" };
export type Notification = {
  id: string; type: NotificationType; title: string; body: string; link: string | null; channels: Channel[]; target: Target;
  publishAt: string; expiresAt: string | null; createdBy: string; createdAt: string; emailSentAt: string | null; emailRecipients: number | null;
};
export type Status = "scheduled" | "live" | "expired";

// N1: marketing is inbox only on purpose (e-mail is for receipts and small announcements); progress and admin alerts never leave the site.
export const CHANNELS_BY_TYPE: Record<NotificationType, readonly Channel[]> = {
  transactional: ["inbox", "email"], announcement: ["inbox", "email"], reminder: ["inbox", "email"],
  progress: ["inbox"], marketing: ["inbox"], "admin-alert": ["inbox"],
};
export const allowedChannels = (type: NotificationType): readonly Channel[] => CHANNELS_BY_TYPE[type];

const ok = <T,>(value: T) => ({ ok: true as const, value });
const no = (message: string) => ({ ok: false as const, message });

const target: Check<Target> = (v) => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return no("must be an object with a kind");
  const t = v as Record<string, unknown>;
  const kind = oneOf("all", "cohort", "plan", "user", "admins")(t.kind);
  if (!kind.ok) return no(`kind ${kind.message}`);
  const field = kind.value === "cohort" ? "cohortSlug" : kind.value === "plan" ? "planId" : kind.value === "user" ? "userId" : null;
  const extra = Object.keys(t).filter((k) => k !== "kind" && k !== field);
  if (extra.length) return no(`${extra[0]} is not a known field`);
  if (kind.value === "cohort" || kind.value === "plan") {
    const r = slug(t[field!]);
    return r.ok ? ok(kind.value === "cohort" ? { kind: "cohort", cohortSlug: r.value } : { kind: "plan", planId: r.value }) : no(`${field} ${r.message}`);
  }
  if (kind.value === "user") {
    const r = str({ max: 64, pattern: /^user_[A-Za-z0-9]+$/ })(t.userId);
    return r.ok ? ok({ kind: "user", userId: r.value }) : no("userId must be a Clerk user id (user_...)");
  }
  return ok({ kind: kind.value });
};

// The body is plain text (blank line = paragraph, **bold**, [label](https://link)); it is escaped before it is ever shown or e-mailed.
const messageBody: Check<string> = (v) => {
  const s = str({ max: 2000 })(v);
  if (!s.ok) return s;
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(s.value)) return no("contains control characters");
  return ok(s.value.replace(/\r\n/g, "\n"));
};

export const notificationCreateShape = {
  type: oneOf(...TYPES), title: plainText(120), body: messageBody, link: optional(ctaLink),
  channels: optional(arrayOf(oneOf<Channel>("inbox", "email"), { min: 1, max: 2 })), target,
  publishAt: optional(isoDate), expiresAt: optional(isoDate),
};

export type NewNotification = Pick<Notification, "type" | "title" | "body" | "link" | "channels" | "target" | "publishAt" | "expiresAt">;
type Input = { type: NotificationType; title: string; body: string; link?: string; channels?: Channel[]; target: Target; publishAt?: string; expiresAt?: string };

// Applies the defaults and the rules that look at several fields at once.
export function buildNotification(i: Input, now: Date): NewNotification {
  if ((i.type === "admin-alert") !== (i.target.kind === "admins")) {
    throw badRequest("Some fields are not valid", { target: i.type === "admin-alert" ? "an admin alert is only for admins" : "only an admin alert can be aimed at admins" });
  }
  const channels = Array.from(new Set(i.channels ?? ["inbox"])) as Channel[];
  if (!channels.includes("inbox")) throw unprocessable("Every notification appears in the inbox: channels must include inbox");
  const bad = channels.find((c) => !allowedChannels(i.type).includes(c));
  if (bad) throw unprocessable(`A ${i.type} notification cannot use the ${bad} channel. Allowed: ${allowedChannels(i.type).join(", ")}`);
  const publishAt = i.publishAt ?? now.toISOString();
  // N3: an inbox item can wait for its time; an e-mail is only ever sent on request, so a notification that carries e-mail cannot be scheduled ahead.
  if (channels.includes("email") && Date.parse(publishAt) > now.getTime() + 60_000) throw unprocessable("A notification with the email channel cannot be scheduled for later. Leave publishAt out");
  if (i.expiresAt && Date.parse(i.expiresAt) <= Date.parse(publishAt)) throw badRequest("Some fields are not valid", { expiresAt: "must be after publishAt" });
  return { type: i.type, title: i.title, body: i.body, link: i.link ?? null, channels: channels.sort() as Channel[], target: i.target, publishAt, expiresAt: i.expiresAt ?? null };
}

export function statusOf(n: Pick<Notification, "publishAt" | "expiresAt">, now: Date): Status {
  const t = now.getTime();
  if (Date.parse(n.publishAt) > t) return "scheduled";
  if (n.expiresAt && Date.parse(n.expiresAt) <= t) return "expired";
  return "live";
}

// What the learner bell may show (phase 5): live, and never an admin alert.
export const learnerVisible = (n: Pick<Notification, "type" | "publishAt" | "expiresAt">, now: Date): boolean => n.type !== "admin-alert" && statusOf(n, now) === "live";

// N2, the checks that need no database: right channel, not sent before, someone to send to, within the announcement cap.
export function checkEmailSend(n: Pick<Notification, "channels" | "emailSentAt">, recipients: number, announcementCap: number): void {
  if (!n.channels.includes("email")) throw unprocessable("This notification does not use the email channel");
  if (n.emailSentAt) throw conflict("The e-mail for this notification was already sent. It is sent once");
  if (recipients < 1) throw unprocessable("There is nobody to e-mail for this target");
  if (recipients > announcementCap) throw unprocessable(`This would e-mail ${recipients} people; the limit for one announcement is ${announcementCap}. Narrow the target or raise announcement-email-cap`);
}

// The e-mail: the title is the subject (one line), the body is formatted safely, a link is added as a final line (a site path becomes a full address).
export const SITE = "https://shivamnamdev.com";
export function renderNotificationEmail(n: Pick<Notification, "title" | "body" | "link">): { subject: string; text: string; html: string } {
  const link = n.link ? (n.link.startsWith("/") ? SITE + n.link : n.link) : null;
  const body = link ? `${n.body}\n\n[Open on the site](${link})` : n.body;
  return { subject: n.title.replace(/[\r\n\u0000-\u001f\u007f]+/g, " ").trim(), ...renderPlain(body) };
}

// The recipient sample an admin may see: a handful of people, never the whole list.
export const SAMPLE_SIZE = 5;
