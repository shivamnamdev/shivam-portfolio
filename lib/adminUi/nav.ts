// lib/adminUi/nav.ts
// The admin sidebar: one list, so the shell, the tests and the "coming in slice" notes agree. `ready` is false for screens that arrive in a later slice.
export type NavItem = { href: string; label: string; group: "Overview" | "Content" | "Engagement" | "People" | "System"; ready: boolean; slice: string; external?: boolean };

export const NAV: NavItem[] = [
  { href: "/admin/overview", label: "Overview", group: "Overview", ready: true, slice: "4a" },
  { href: "/admin/courses", label: "Courses", group: "Content", ready: true, slice: "4b" },
  { href: "/admin/cohorts", label: "Cohorts", group: "Content", ready: true, slice: "4b" },
  { href: "/admin/curriculum", label: "Curriculum", group: "Content", ready: true, slice: "4c" },
  { href: "/admin/coupons", label: "Coupons", group: "Engagement", ready: true, slice: "4d" },
  { href: "/admin/banners", label: "Banners", group: "Engagement", ready: false, slice: "4d" },
  { href: "/admin/notifications", label: "Notifications", group: "Engagement", ready: false, slice: "4d" },
  { href: "/admin/email-templates", label: "E-mail templates", group: "Engagement", ready: false, slice: "4d" },
  { href: "/admin/settings", label: "Settings", group: "Engagement", ready: true, slice: "4d" },
  { href: "/admin/enrolments", label: "Enrolments", group: "People", ready: false, slice: "4e" },
  { href: "/admin/progress", label: "Student progress", group: "People", ready: false, slice: "4f" },
  { href: "/admin/submissions", label: "Code submissions", group: "People", ready: false, slice: "4f" },
  { href: "/admin", label: "Learner CRM (classic)", group: "People", ready: true, slice: "4a" },
  { href: "/admin/audit", label: "Audit log", group: "System", ready: true, slice: "4a" },
  { href: "/admin/api-keys", label: "API keys", group: "System", ready: true, slice: "4a" },
  { href: "/admin/api-docs", label: "API docs", group: "System", ready: true, slice: "4a", external: true },
];
export const NAV_GROUPS = ["Overview", "Content", "Engagement", "People", "System"] as const;

// The classic page lives at exactly /admin; every other entry matches its own path and anything below it (never a look-alike such as /admin/audit-x).
export function isActive(pathname: string, href: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (href === "/admin") return p === "/admin";
  return p === href || p.startsWith(`${href}/`);
}
