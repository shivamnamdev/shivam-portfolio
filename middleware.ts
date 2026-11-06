import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // 1. Explicitly whitelist EVERY public page and API route
  publicRoutes:[
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
    "/api/banners",   // visitors see banners too; the route reads the session itself when there is one
    // Admin API v1 answers its own 401/403 (lib/adminApi/guard.ts) so that API keys work without a Clerk session; every route calls authorize().
    "/api/admin/v1(.*)"
    // Admin APIs (/api/get-all-users, /api/get-clerk-users, /api/admin/*) are intentionally NOT public;
    // their handlers also verify the admin identity server-side.
  ],
  // 2. Webhooks should be completely ignored by Clerk
  ignoredRoutes: [
    "/api/webhooks/clerk"
  ]
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};