import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// 1. Explicitly whitelist EVERY public page and API route
const isPublicRoute = createRouteMatcher([
  "/",
  "/courses(.*)",
  "/about",
  "/privacy",
  "/terms",
  "/refund",
  "/contact",
  "/mentorship",
  "/share(.*)", // 🚨 THE MISSING LINE! This lets WhatsApp read the thumbnail!
  "/api/create-order",
  "/api/verify-payment",
  "/api/enroll-free",
  "/api/send-email",
  "/api/banners", // visitors see banners too; the route reads the session itself when there is one
  // Admin API v1 answers its own 401/403 (lib/adminApi/guard.ts) so that API keys work without a Clerk session; every route calls authorize().
  "/api/admin/v1(.*)",
  // 2. The Clerk webhook is verified by its Svix signature in the handler, never by a session.
  "/api/webhooks/clerk",
  // Everything else, including any other /api/admin/* route, is intentionally NOT public; handlers also verify the identity server-side.
]);

const isApiRoute = createRouteMatcher(["/api", "/api/(.*)", "/trpc(.*)"]) // not "/api(.*)": that would also catch the page /api-docs;

// Same behaviour as the old authMiddleware: a visitor on a protected page is sent to sign in, a visitor on a protected
// API route gets 401 (Clerk 7's auth.protect() would answer 404 for non-page requests, so it is not used).
export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;
  const session = await auth();
  if (session.userId) return;
  if (isApiRoute(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  return session.redirectToSignIn({ returnBackUrl: req.url });
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
