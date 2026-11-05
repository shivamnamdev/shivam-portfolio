// lib/adminApi/learners.ts
// Looks up signed-up users in Clerk for the admin: the picker for "selected students" coupons and the e-mail to id resolution.
import { clerkClient } from "@clerk/nextjs/server";
import { getDisplayName, getPrimaryEmail } from "@/lib/serverAuth";
import { badRequest } from "./envelope";

export type LearnerRef = { id: string; email: string | null; name: string };
const ref = (u: Parameters<typeof getPrimaryEmail>[0] & { id: string }): LearnerRef => ({ id: u.id, email: getPrimaryEmail(u), name: getDisplayName(u, "") });

export async function searchLearners(q: string | null, limit = 20): Promise<LearnerRef[]> {
  const users = await clerkClient.users.getUserList({ query: q ?? undefined, limit });
  return users.map((u) => ref(u as never));
}

// Every e-mail must belong to a signed-up user; the error names the ones that do not.
export async function idsForEmails(emails: string[]): Promise<LearnerRef[]> {
  const unique = [...new Set(emails.map((e) => e.toLowerCase()))];
  const found: LearnerRef[] = [];
  for (let i = 0; i < unique.length; i += 100) {
    const users = await clerkClient.users.getUserList({ emailAddress: unique.slice(i, i + 100), limit: 100 });
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
    const users = await clerkClient.users.getUserList({ userId: ids.slice(i, i + 100), limit: 100 });
    for (const u of users) byId.set(u.id, ref(u as never));
  }
  return ids.map((id) => byId.get(id) ?? { id, email: null, name: "(user not found)" });
}
