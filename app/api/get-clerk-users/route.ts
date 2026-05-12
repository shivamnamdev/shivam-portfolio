// app/api/get-clerk-users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs";

export async function POST(req: NextRequest) {
  try {
    const { userIds } = await req.json();
    
    // If no IDs were sent, return an empty object
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ success: true, users: {} });
    }

    // 1. Securely fetch user details from Clerk's backend database!
    const users = await clerkClient.users.getUserList({
      userId: userIds,
    });

    // 2. Format it into an easy-to-read dictionary: { "user_123": { name: "John", email: "john@..." } }
    const userMap: Record<string, { name: string; email: string; image: string }> = {};
    
    users.forEach((u) => {
      const firstName = u.firstName || "";
      const lastName = u.lastName || "";
      const fullName = `${firstName} ${lastName}`.trim();
      
      userMap[u.id] = {
        name: fullName || "Student",
        email: u.emailAddresses[0]?.emailAddress || "No Email",
        image: u.imageUrl || ""
      };
    });

    return NextResponse.json({ success: true, users: userMap });

  } catch (error) {
    console.error("Failed to fetch Clerk users:", error);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}