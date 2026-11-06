// lib/catalog/bell.ts
// Pure rules of the notification bell (no database, no network): who a notification reaches, and what one learner's bell shows. The reading and
// writing is in lib/catalog/engagement.ts. Admin alerts, scheduled and expired notifications never reach a learner (learnerVisible).
import { learnerVisible, type Target } from "@/lib/adminApi/notifications";
import { renderPlain } from "@/lib/adminApi/emailTemplates";

export type BellViewer = { userId: string; cohortSlugs: string[]; planIds: string[] };
export type BellRow = { id: string; type: string; title: string; body: string; link: string | null; target: Target; publishAt: string; expiresAt: string | null };
// `dateText` is only set for the old hand-written list (PORTAL_ENGAGEMENT=files), whose entries carry a written date such as "2 days ago".
export type BellItem = { id: string; type: string; title: string; body: string; link: string | null; publishAt: string; read: boolean; dateText?: string };

export function notificationReaches(t: Target, v: BellViewer): boolean {
  switch (t.kind) {
    case "all": return true;
    case "cohort": return v.cohortSlugs.includes(t.cohortSlug);
    case "plan": return v.planIds.includes(t.planId);
    case "user": return t.userId === v.userId;
    default: return false;   // "admins" (and anything unknown) is never for a learner
  }
}

// The learner's bell: live notifications aimed at them, newest first, at most `limit`, each marked read or not; `unread` counts the ones shown.
// The body is shown as plain text (the formatting marks removed, a link written out), never as HTML.
export function feedFor(rows: BellRow[], viewer: BellViewer, readIds: Iterable<string>, now: Date, limit = 30): { items: BellItem[]; unread: number } {
  const read = new Set(readIds);
  const items = rows
    .filter((r) => learnerVisible({ type: r.type as never, publishAt: r.publishAt, expiresAt: r.expiresAt }, now) && notificationReaches(r.target, viewer))
    .sort((a, b) => Date.parse(b.publishAt) - Date.parse(a.publishAt) || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map((r) => ({ id: r.id, type: r.type, title: r.title, body: renderPlain(r.body).text, link: r.link, publishAt: r.publishAt, read: read.has(r.id) }));
  return { items, unread: items.filter((i) => !i.read).length };
}

// The ids a "mark as read" call may write: only notifications this learner can see. No ids means "everything shown".
export function idsToMark(feed: BellItem[], requested: string[] | undefined): string[] {
  const visible = new Set(feed.map((i) => i.id));
  const wanted = requested === undefined ? feed.filter((i) => !i.read).map((i) => i.id) : requested.filter((id) => visible.has(id));
  return [...new Set(wanted)];
}
