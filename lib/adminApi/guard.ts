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

async function actorFromSession(): Promise<Actor> {
  const { userId } = auth();
  if (!userId) throw unauthorized();
  const email = getPrimaryEmail(await currentUser());
  if (!isAdminEmail(email)) throw forbidden();
  return { id: userId, label: email ?? userId, role: "owner" };
}
