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
    "/api/ai-tutor"
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