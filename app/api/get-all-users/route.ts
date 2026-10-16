// app/api/get-all-users/route.ts
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { requireAdmin, getPrimaryEmail } from "@/lib/serverAuth";

export const dynamic = 'force-dynamic'; // Ensures it doesn't cache stale data

const PAGE_SIZE = 100;
const MAX_USERS = 5000;

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    // Page through Clerk so the CRM is not capped at the first 100 users.
    const users = [];
    for (let offset = 0; offset < MAX_USERS; offset += PAGE_SIZE) {
      const page = await clerkClient.users.getUserList({ limit: PAGE_SIZE, offset, orderBy: "-created_at" });
      users.push(...page);
      if (page.length < PAGE_SIZE) break;
    }

    const userList = users.map((u) => ({
      id: u.id,
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || "Unknown",
      email: getPrimaryEmail(u) || "No Email",
      joinedAt: u.createdAt,
      image: u.imageUrl
    }));

    return NextResponse.json({ success: true, users: userList });
  } catch (error) {
    console.error("Failed to fetch all users:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
