// lib/adminApi/guard.ts
// The single entry check for every /api/admin/v1 route: `const actor = await authorize(req, 'courses:write')`.
// Accepts the admin's Clerk session (role owner) or an admin API key (`Authorization: Bearer tmk_...`).
// 401 = nobody identified (the answer is identical for a missing, malformed, unknown or revoked key); 403 = identified but not allowed.
import { auth, currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getPrimaryEmail } from "@/lib/serverAuth";
import { isAdminEmail } from "@/lib/admin";
import { ApiError } from "./envelope";
import { parseApiKey, secretMatches } from "./apiKeys";
import { roleCan, type Permission, type Role } from "./permissions";

export type Actor = { id: string; label: string; role: Role };

const unauthorized = () => new ApiError(401, "unauthorized", "Authentication required");
const forbidden = () => new ApiError(403, "forbidden", "You do not have permission to do this");

export async function authorize(req: Request, permission: Permission): Promise<Actor> {
  const header = req.headers.get("authorization");
  const actor = header ? await actorFromKey(header) : await actorFromSession();
  if (!roleCan(actor.role, permission)) throw forbidden();
  return actor;
}

async function actorFromKey(header: string): Promise<Actor> {
  const m = /^Bearer\s+(.+)$/i.exec(header);
  const parsed = parseApiKey(m?.[1]);
  if (!parsed) throw unauthorized();
  const { data, error } = await supabaseAdmin.from("api_keys").select("id, name, level, hash, revoked_at").eq("id", parsed.id).maybeSingle();
  if (error) throw error;
  if (!data || data.revoked_at || !secretMatches(parsed.secret, data.hash as string)) throw unauthorized();
  void supabaseAdmin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", parsed.id).then(() => undefined);   // best effort
  return { id: `key:${data.id}`, label: `API key "${data.name}"`, role: data.level === "admin" ? "key-admin" : "key-staff" };
}

// Asking Clerk who the user is costs an API call, and Clerk rate limits them. The answer (admin or not) is kept for 60 seconds per
// server instance; a changed admin e-mail therefore takes up to a minute to take effect, which is acceptable for a single owner.
const SESSION_TTL_MS = 60_000;
const sessionCache = new Map<string, { email: string | null; admin: boolean; until: number }>();

async function actorFromSession(): Promise<Actor> {
  const { userId } = await auth();
  if (!userId) throw unauthorized();
  let hit = sessionCache.get(userId);
  if (!hit || hit.until < Date.now()) {
    const email = getPrimaryEmail(await currentUser());
    hit = { email, admin: isAdminEmail(email), until: Date.now() + SESSION_TTL_MS };
    if (sessionCache.size > 200) sessionCache.clear();
    sessionCache.set(userId, hit);
  }
  if (!hit.admin) throw forbidden();
  return { id: userId, label: hit.email ?? userId, role: "owner" };
}
