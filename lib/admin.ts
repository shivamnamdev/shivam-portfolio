// lib/admin.ts
// Single source of truth for the admin identity. Safe to import from client and server code.

export const ADMIN_EMAIL = "shivamnamdev.corp@gmail.com";

export function isAdminEmail(email?: string | null): boolean {
  return !!email && email.trim().toLowerCase() === ADMIN_EMAIL;
}
