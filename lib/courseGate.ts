// lib/courseGate.ts
// Server only. Used by the layouts of /learning/[slug] and /live/[slug] (SCP-39): enrolment (or admin) is checked here, on the server, before any
// course page code is sent. The rule itself is courseGate in lib/courseAccess.ts (unit-tested).
import "server-only";
import { auth } from "@clerk/nextjs/server";
import { courseGate } from "@/lib/courseAccess";
import { hasCourseAccess, isSlug } from "@/lib/learnerApi";

export async function gateFor(slug: string): Promise<"show" | "denied"> {
  const { userId } = await auth();
  const slugValid = isSlug(slug);
  let hasAccess: boolean | null = null;
  if (userId && slugValid) {
    try { hasAccess = await hasCourseAccess(userId, slug); }
    catch (e) { console.error("course gate: enrolment lookup failed:", (e as Error).message?.slice(0, 100)); }
  }
  return courseGate({ signedIn: !!userId, slugValid, hasAccess });
}
