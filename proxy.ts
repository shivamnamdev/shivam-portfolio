import { NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { isApiPath, isPublicPath } from "@/lib/routeAccess";

// Next 16 renamed the middleware file convention to proxy. Which paths are public is decided in lib/routeAccess.ts (unit-tested).
// Same behaviour as the old authMiddleware: a visitor on a protected page is sent to sign in, a visitor on a protected
// API route gets 401 (Clerk 7's auth.protect() would answer 404 for non-page requests, so it is not used).
export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;
  if (isPublicPath(pathname)) return;
  const session = await auth();
  if (session.userId) return;
  if (isApiPath(pathname)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  return session.redirectToSignIn({ returnBackUrl: req.url });
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
