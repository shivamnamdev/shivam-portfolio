import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes:[
    "/",
    "/courses(.*)",
    "/about",
    "/contact",
    "/mentorship",
    "/api/(.*)", // 🚨 This allows your free enrollment & email APIs
    "/api/webhooks/clerk" // 🚨 THIS IS THE CRITICAL FIX FOR THE WEBHOOK!
  ],
  // Ignore routes so Clerk doesn't break static assets or webhooks
  ignoredRoutes: [
    "/((?!api|trpc))(_next.*|.+\\.[\w]+$)", 
    "/python-syllabus.pdf",
    "/api/webhooks/clerk" // 🚨 We completely ignore the webhook so Clerk doesn't even try to authenticate it
  ]
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};