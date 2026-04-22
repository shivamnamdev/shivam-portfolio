import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // Tell Clerk that the entire website is public EXCEPT the /learning route!
  publicRoutes:[
    "/",
    "/courses(.*)",
    "/about",
    "/contact",
    "/mentorship",
    "/api(.*)" // Allows Web3Forms/API calls to work without logging in
  ]
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};