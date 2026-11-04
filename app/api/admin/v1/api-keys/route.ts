import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { handle, ok } from "@/lib/adminApi/envelope";
import { limitWrites } from "@/lib/adminApi/request";
import { oneOf, parseObject, readBody, str } from "@/lib/adminApi/validate";
import { newApiKey } from "@/lib/adminApi/apiKeys";
import { writeAudit } from "@/lib/adminApi/audit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const COLS = "id, name, level, created_by, created_at, last_used_at, revoked_at";
const view = (r: Record<string, unknown>) => ({ id: r.id, name: r.name, level: r.level, createdBy: r.created_by, createdAt: r.created_at, lastUsedAt: r.last_used_at, revokedAt: r.revoked_at });

// Only the owner (admin session) can list or create keys; a key can never manage keys.
export async function GET(req: NextRequest) {
  return handle(async () => {
    await authorize(req, "keys:read");
    const { data, error } = await supabaseAdmin.from("api_keys").select(COLS).order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return ok({ items: (data ?? []).map(view) });
  });
}

// The secret appears in this answer once and is never stored (only its hash).
export async function POST(req: NextRequest) {
  return handle(async () => {
    const actor = await authorize(req, "keys:write");
    await limitWrites(actor);
    const input = parseObject(await readBody(req), { name: str({ max: 60 }), level: oneOf("admin", "staff") });
    const key = newApiKey();
    const { data, error } = await supabaseAdmin.from("api_keys").insert([{ id: key.id, name: input.name, level: input.level, hash: key.hash, created_by: actor.id }]).select(COLS).single();
    if (error) throw error;
    await writeAudit({ actor, action: "create", resource: "api-key", resourceId: key.id, after: view(data) });
    return ok({ ...view(data), token: key.token, note: "Copy the token now. It is not shown again." }, 201);
  });
}
