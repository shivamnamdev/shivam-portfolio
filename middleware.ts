import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes:[
    "/",
    "/courses(.*)",
    "/about",
    "/contact",
    "/mentorship",
    "/api(.*)" // Allows Web3Forms/API calls to work without logging in
  ],
  // Ignore routes so Clerk doesn't break static assets
  ignoredRoutes:["/((?!api|trpc))(_next.*|.+\.[\w]+$)", "/python-syllabus.pdf"]
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};