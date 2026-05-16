// app/api/get-all-users/route.ts
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs";

export const dynamic = 'force-dynamic'; // Ensures it doesn't cache stale data

export async function GET() {
  try {
    // Securely fetch all users from Clerk
    const users = await clerkClient.users.getUserList({ limit: 100 });
    
    const userList = users.map((u) => ({
      id: u.id,
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || "Unknown",
      email: u.emailAddresses[0]?.emailAddress || "No Email",
      joinedAt: u.createdAt,
      image: u.imageUrl
    }));

    return NextResponse.json({ success: true, users: userList });
  } catch (error) {
    console.error("Failed to fetch all users:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}