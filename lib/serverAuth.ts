// lib/serverAuth.ts
// Server-side identity helpers (Clerk v4). Identity must come from the session, never the request body.
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import type { User } from "@clerk/nextjs/server";
import { isAdminEmail } from "@/lib/admin";

export function getPrimaryEmail(user: User | null | undefined): string | null {
  if (!user) return null;
  const primary =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId) ?? user.emailAddresses[0];
  return primary?.emailAddress ?? null;
}

export function getDisplayName(user: User | null | undefined, fallback = "Student"): string {
  if (!user) return fallback;
  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return fullName || getPrimaryEmail(user) || fallback;
}

// Returns a 401/403 response when the caller is not the admin, or null when access is allowed.
export async function requireAdmin(): Promise<NextResponse | null> {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const user = await currentUser();
  if (!isAdminEmail(getPrimaryEmail(user))) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}
