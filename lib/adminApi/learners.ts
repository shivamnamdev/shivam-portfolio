// lib/adminApi/learners.ts
// Looks up signed-up users in Clerk for the admin: the picker for "selected students" coupons and the e-mail to id resolution.
import { clerkClient } from "@clerk/nextjs/server";
import { getDisplayName, getPrimaryEmail } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { badRequest } from "./envelope";
import { directoryRow, type DirectoryRow } from "./progress";

export type LearnerRef = { id: string; email: string | null; name: string };
const ref = (u: Parameters<typeof getPrimaryEmail>[0] & { id: string }): LearnerRef => ({ id: u.id, email: getPrimaryEmail(u), name: getDisplayName(u, "") });

// The directory: signed-up people, newest first, each with their join date and enrolment count (enrolled or lead). Pages by position.
export async function directoryPage(q: string | null, limit: number, offset: number): Promise<{ items: DirectoryRow[]; next: string | null }> {
  const users = (await (await clerkClient()).users.getUserList({ query: q ?? undefined, limit: limit + 1, offset, orderBy: "-created_at" })).data;
  const page = users.slice(0, limit);
  const counts = new Map<string, number>();
  if (page.length) {
    const { data, error } = await supabaseAdmin.from("user_enrollments").select("user_id").in("user_id", page.map((u) => u.id)).limit(20000);
    if (error) throw error;
    for (const r of data ?? []) counts.set(r.user_id as string, (counts.get(r.user_id as string) ?? 0) + 1);
  }
  return { items: page.map((u) => directoryRow(ref(u as never), u.createdAt, counts.get(u.id) ?? 0)), next: users.length > limit ? String(offset + limit) : null };
}

export async function searchLearners(q: string | null, limit = 20): Promise<LearnerRef[]> {
  const users = (await (await clerkClient()).users.getUserList({ query: q ?? undefined, limit })).data;
  return users.map((u) => ref(u as never));
}

// Every e-mail must belong to a signed-up user; the error names the ones that do not.
export async function idsForEmails(emails: string[]): Promise<LearnerRef[]> {
  const unique = [...new Set(emails.map((e) => e.toLowerCase()))];
  const found: LearnerRef[] = [];
  for (let i = 0; i < unique.length; i += 100) {
    const users = (await (await clerkClient()).users.getUserList({ emailAddress: unique.slice(i, i + 100), limit: 100 })).data;
    found.push(...users.map((u) => ref(u as never)));
  }
  const have = new Set(found.map((f) => f.email?.toLowerCase()));
  const missing = unique.filter((e) => !have.has(e));
  if (missing.length) throw badRequest("Some people have not signed up yet", { users: `no signed-up user for: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? " and more" : ""}` });
  return found;
}

export async function refsForIds(ids: string[]): Promise<LearnerRef[]> {
  if (!ids.length) return [];
  const byId = new Map<string, LearnerRef>();
  for (let i = 0; i < ids.length; i += 100) {
    const users = (await (await clerkClient()).users.getUserList({ userId: ids.slice(i, i + 100), limit: 100 })).data;
    for (const u of users) byId.set(u.id, ref(u as never));
  }
  return ids.map((id) => byId.get(id) ?? { id, email: null, name: "(user not found)" });
}
