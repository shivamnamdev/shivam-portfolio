// lib/adminApi/permissions.ts
// Role-ready permissions (owner decision D5: RBAC later, designed in now). Every admin route names ONE permission.
// Today the only human role is `owner` (the admin e-mail) and it holds all of them; API keys are `admin` (all) or `staff` (read only).
// Adding roles later means adding entries to ROLE_PERMISSIONS and a source for who has which role: no route changes.

export const PERMISSIONS = [
  "courses:read", "courses:write",
  "cohorts:read", "cohorts:write", "cohorts:links",
  "coupons:read", "coupons:write",
  "curriculum:read", "curriculum:write",
  "audit:read",
  "learners:read",
  "keys:read", "keys:write",
  "import:run",
  "openapi:read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
export type Role = "owner" | "key-admin" | "key-staff";

const READ_ONLY = PERMISSIONS.filter((p) => p.endsWith(":read")) as Permission[];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: PERMISSIONS,
  "key-admin": PERMISSIONS.filter((p) => p !== "keys:write" && p !== "keys:read" && p !== "import:run"),   // a key cannot mint or list keys, nor run the one-off import
  "key-staff": READ_ONLY.filter((p) => p !== "keys:read"),
};

export const roleCan = (role: Role, permission: Permission): boolean => ROLE_PERMISSIONS[role].includes(permission);
