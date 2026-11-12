// lib/adminApi/notificationStore.ts
// Database and e-mail side of notifications. The rules are in notifications.ts (pure). Nothing here returns a recipient list to a caller:
// recipients are resolved on the server, used to send, and only a count and a sample of at most 5 are ever shown.
import nodemailer from "nodemailer";
import { clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ApiError, badRequest, notFound, unprocessable } from "./envelope";
import { likeSafe, type ListParams } from "./request";
import { refsForIds, type LearnerRef } from "./learners";
import { statusOf, SAMPLE_SIZE, type Channel, type NewNotification, type Notification, type NotificationType, type Target } from "./notifications";

type Row = {
  id: string; type: NotificationType; title: string; body: string; link: string | null; channels: Channel[]; target: Target; publish_at: string; expires_at: string | null;
  created_by: string; created_at: string; email_sent_at: string | null; email_recipients: number | null;
};
const COLS = "id, type, title, body, link, channels, target, publish_at, expires_at, created_by, created_at, email_sent_at, email_recipients";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const idParam = (s: string): string => { if (!UUID.test(s)) throw notFound("notification not found"); return s.toLowerCase(); };

export const toNotification = (r: Row): Notification => ({
  id: r.id, type: r.type, title: r.title, body: r.body, link: r.link, channels: r.channels, target: r.target, publishAt: r.publish_at, expiresAt: r.expires_at,
  createdBy: r.created_by, createdAt: r.created_at, emailSentAt: r.email_sent_at, emailRecipients: r.email_recipients,
});
export const view = (n: Notification, now = new Date()) => ({ ...n, status: statusOf(n, now) });

export async function insertNotification(n: NewNotification, actorId: string): Promise<Notification> {
  const { data, error } = await supabaseAdmin.from("notifications").insert([{
    type: n.type, title: n.title, body: n.body, link: n.link, channels: n.channels, target: n.target, publish_at: n.publishAt, expires_at: n.expiresAt, created_by: actorId,
  }]).select(COLS).single();
  if (error) throw error;
  return toNotification(data as Row);
}

export async function getNotification(id: string): Promise<Notification> {
  const { data, error } = await supabaseAdmin.from("notifications").select(COLS).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw notFound("notification not found");
  return toNotification(data as Row);
}

export async function listNotifications(p: ListParams, now: Date): Promise<{ items: Notification[]; next: string | null }> {
  let q = supabaseAdmin.from("notifications").select(COLS).order("created_at", { ascending: false }).limit(p.limit + 1);
  const t = now.toISOString();
  if (p.status === "scheduled") q = q.gt("publish_at", t);
  else if (p.status === "live") q = q.lte("publish_at", t).or(`expires_at.is.null,expires_at.gt.${t}`);
  else if (p.status === "expired") q = q.lte("expires_at", t);
  else if (p.status) throw badRequest("status must be scheduled, live or expired");
  if (p.cursor) { if (Number.isNaN(Date.parse(p.cursor))) throw badRequest("cursor is not valid"); q = q.lt("created_at", p.cursor); }
  if (p.q) q = q.ilike("title", `%${likeSafe(p.q)}%`);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as Row[];
  return { items: rows.slice(0, p.limit).map(toNotification), next: rows.length > p.limit ? rows[p.limit - 1].created_at : null };
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("notifications").delete().eq("id", id);
  if (error) throw error;
}

// N4: an admin only ever sees how many people have read it, never who.
export async function readCount(id: string): Promise<number> {
  const { count, error } = await supabaseAdmin.from("notification_reads").select("user_id", { count: "exact", head: true }).eq("notification_id", id);
  if (error) throw error;
  return count ?? 0;
}

// ---- recipients (server side only) ----------------------------------------------------------------------------------------------------------
const planColumnMissing = (e: { code?: string }) => e.code === "42703";
const planUnavailable = () => unprocessable("Plans are not recorded in this database yet (user_enrollments.plan_id is missing)");

export async function countRecipients(t: Target): Promise<number> {
  if (t.kind === "admins") return 0;
  if (t.kind === "user") return 1;
  if (t.kind === "all") return await (await clerkClient()).users.getCount();
  const col = t.kind === "cohort" ? "course_slug" : "plan_id";
  const { count, error } = await supabaseAdmin.from("user_enrollments").select("user_id", { count: "exact", head: true }).eq(col, t.kind === "cohort" ? t.cohortSlug : t.planId);
  if (error) { if (planColumnMissing(error)) throw planUnavailable(); throw error; }
  return count ?? 0;
}

// Up to `max` people for the target, with their names and e-mail addresses. Used to send and for the 5-person sample.
export async function resolveRecipients(t: Target, max: number): Promise<LearnerRef[]> {
  if (t.kind === "admins") return [];
  if (t.kind === "user") return refsForIds([t.userId]);
  if (t.kind === "all") {
    const out: LearnerRef[] = [];
    for (let offset = 0; out.length < max; offset += 100) {
      const users = (await (await clerkClient()).users.getUserList({ limit: Math.min(100, max - out.length), offset })).data;
      if (!users.length) break;
      out.push(...(await refsForIds(users.map((u) => u.id))));
    }
    return out;
  }
  const col = t.kind === "cohort" ? "course_slug" : "plan_id";
  const { data, error } = await supabaseAdmin.from("user_enrollments").select("user_id").eq(col, t.kind === "cohort" ? t.cohortSlug : t.planId).limit(max);
  if (error) { if (planColumnMissing(error)) throw planUnavailable(); throw error; }
  return refsForIds(Array.from(new Set((data ?? []).map((d) => d.user_id as string))));
}
export const sampleRecipients = (t: Target) => resolveRecipients(t, SAMPLE_SIZE);

// ---- the explicit e-mail send ---------------------------------------------------------------------------------------------------------------
export function requireMailConfig(): void {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) throw new ApiError(500, "mail_not_configured", "E-mail is not configured on the server");
}

// Claims the one send: only the request that moves email_sent_at from null wins, so a double click or a retry cannot send twice.
export async function claimEmail(id: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.from("notifications").update({ email_sent_at: new Date().toISOString() }).eq("id", id).is("email_sent_at", null).select("id");
  if (error) throw error;
  return !!data?.length;
}
export async function releaseEmail(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("notifications").update({ email_sent_at: null, email_recipients: null }).eq("id", id);
  if (error) throw error;
}
export async function recordEmail(id: string, sent: number): Promise<void> {
  const { error } = await supabaseAdmin.from("notifications").update({ email_recipients: sent }).eq("id", id);
  if (error) throw error;
}

// One message per person (never a shared To or Bcc list). Failures are counted, never logged with an address.
export async function sendAll(people: LearnerRef[], mail: { subject: string; text: string; html: string }): Promise<{ sent: number; failed: number }> {
  const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.GMAIL_USER, pass: (process.env.GMAIL_APP_PASSWORD ?? "").replace(/\s+/g, "") } });
  let sent = 0, failed = 0;
  for (const p of people) {
    try {
      await transporter.sendMail({ from: `Shivam Academy <${process.env.GMAIL_USER}>`, to: p.email as string, subject: mail.subject, text: mail.text, html: mail.html });
      sent++;
    } catch (err) {
      failed++;
      console.error("announcement e-mail failed:", (err as Error).message?.slice(0, 120));
    }
  }
  return { sent, failed };
}
