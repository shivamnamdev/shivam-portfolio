// lib/catalog/engagement.ts
// Server-only reader behind the banners on the pages, the notification bell and the saved e-mail templates. PORTAL_ENGAGEMENT=files (default): no
// banners, the bell shows the old hand-written list (data/notifications.ts) and mails are exactly today's. PORTAL_ENGAGEMENT=database: published
// banners and live notifications of the admin portal, and a mail uses a template only when one is saved. Any database failure answers like "files".
import "server-only";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { platformNotifications } from "@/data/notifications";
import { visibleBanners, type Banner, type BannerRow, type ShownBanner, type Viewer } from "@/lib/adminApi/banners";
import type { Target } from "@/lib/adminApi/notifications";
import type { TemplateKey } from "@/lib/adminApi/emailTemplates";
import { feedFor, idsToMark, type BellItem, type BellRow } from "./bell";
import { renderSaved, type RenderedMail } from "./mail";
import { BANNERS_TAG } from "./tags";
import { chooseSource } from "./source";

export const engagementSource = () => chooseSource(process.env.PORTAL_ENGAGEMENT);
const warn = (what: string, e: unknown) => console.error(`engagement: ${what} failed (${(e as Error).message?.slice(0, 80)}), answering as if the portal had nothing`);

// ---- who is looking ------------------------------------------------------------------------------------------------------------------------
export async function viewerOf(userId: string | null): Promise<{ userId: string; cohortSlugs: string[]; planIds: string[] } | null> {
  if (!userId) return null;
  const run = (cols: string) => supabaseAdmin.from("user_enrollments").select(cols).eq("user_id", userId);
  let r = await run("course_slug, plan_id");
  if (r.error && r.error.code === "42703") r = await run("course_slug");   // production has no plan column until the plan SQL is applied
  if (r.error) throw r.error;
  const rows = (r.data ?? []) as unknown as Array<{ course_slug: string; plan_id?: string | null }>;
  return { userId, cohortSlugs: rows.map((x) => x.course_slug), planIds: rows.map((x) => x.plan_id).filter((x): x is string => !!x) };
}

// ---- banners -------------------------------------------------------------------------------------------------------------------------------
const publishedBanners = unstable_cache(async (): Promise<Array<BannerRow & { version: number }>> => {
  const { data, error } = await supabaseAdmin.from("content_docs").select("key, status, version, doc").eq("kind", "banner").eq("status", "published").limit(200);
  if (error) throw error;
  return (data ?? []).map((r) => ({ slug: r.key as string, status: r.status as string, version: r.version as number, doc: r.doc as Banner }));
}, ["banners-v1"], { revalidate: 60, tags: [BANNERS_TAG] });

export type PageBanner = ShownBanner & { version: number };

// What this visitor or learner sees in one placement now. `files`: nothing (today's pages have no banner).
export async function getBanners(placement: Banner["placement"], userId: string | null): Promise<PageBanner[]> {
  if (engagementSource() === "files") return [];
  try {
    const rows = await publishedBanners();
    const v = await viewerOf(userId);
    const viewer: Viewer = v ? { kind: "learner", cohortSlugs: v.cohortSlugs, planIds: v.planIds } : { kind: "visitor" };
    const versions = new Map(rows.map((r) => [r.slug, r.version]));
    return visibleBanners(rows, viewer, placement, new Date()).map((b) => ({ ...b, version: versions.get(b.slug) ?? 0 }));
  } catch (e) { warn("banners", e); return []; }
}

// ---- the bell ------------------------------------------------------------------------------------------------------------------------------
export type Bell = { source: "files" | "database"; items: BellItem[]; unread: number };

const fileItems = (): BellItem[] => platformNotifications.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.message, link: n.link ?? null, publishAt: "", read: false, dateText: n.date }));

async function databaseFeed(userId: string): Promise<{ items: BellItem[]; unread: number }> {
  const v = await viewerOf(userId);
  if (!v) return { items: [], unread: 0 };
  const now = new Date(); const t = now.toISOString();
  const { data, error } = await supabaseAdmin.from("notifications").select("id, type, title, body, link, target, publish_at, expires_at")
    .neq("type", "admin-alert").lte("publish_at", t).or(`expires_at.is.null,expires_at.gt.${t}`).order("publish_at", { ascending: false }).limit(200);
  if (error) throw error;
  const rows: BellRow[] = (data ?? []).map((r) => ({ id: r.id as string, type: r.type as string, title: r.title as string, body: r.body as string, link: (r.link as string | null) ?? null, target: r.target as Target, publishAt: r.publish_at as string, expiresAt: (r.expires_at as string | null) ?? null }));
  const reads = await supabaseAdmin.from("notification_reads").select("notification_id").eq("user_id", userId).limit(2000);
  if (reads.error) throw reads.error;
  return feedFor(rows, v, (reads.data ?? []).map((x) => x.notification_id as string), now);
}

export async function getBell(userId: string): Promise<Bell> {
  if (engagementSource() === "files") { const items = fileItems(); return { source: "files", items, unread: items.length }; }
  try { return { source: "database", ...(await databaseFeed(userId)) }; }
  catch (e) { warn("notification feed", e); return { source: "database", items: [], unread: 0 }; }
}

// Marks notifications as read for this learner: only ones they can see, only for themselves, repeated calls change nothing.
export async function markRead(userId: string, requested: string[] | undefined): Promise<{ unread: number }> {
  if (engagementSource() === "files") return { unread: 0 };
  const feed = await databaseFeed(userId);
  const ids = idsToMark(feed.items, requested);
  if (ids.length) {
    const { error } = await supabaseAdmin.from("notification_reads").upsert(ids.map((id) => ({ notification_id: id, user_id: userId })), { onConflict: "notification_id,user_id", ignoreDuplicates: true });
    if (error) throw error;
  }
  const after = new Set(ids);
  return { unread: feed.items.filter((i) => !i.read && !after.has(i.id)).length };
}

// ---- mails ---------------------------------------------------------------------------------------------------------------------------------
// The saved template for a mail, rendered with this mail's values; null means "send today's mail" (flag off, nothing saved, broken template, or a failure).
export async function savedMail(key: TemplateKey, values: Record<string, string>): Promise<RenderedMail | null> {
  if (engagementSource() === "files") return null;
  try {
    const { data, error } = await supabaseAdmin.from("content_docs").select("doc").eq("kind", "email_template").eq("key", key).maybeSingle();
    if (error) throw error;
    return renderSaved(key, data?.doc as { subject?: unknown; body?: unknown } | undefined, values);
  } catch (e) { warn(`mail template ${key}`, e); return null; }
}
