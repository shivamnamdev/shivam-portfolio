import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { badRequest, handle, ok } from "@/lib/adminApi/envelope";
import { listParams } from "@/lib/adminApi/request";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Read only. Newest first; filter with ?resource=coupon&action=create; page with the cursor.
export async function GET(req: NextRequest) {
  return handle(async () => {
    await authorize(req, "audit:read");
    const p = listParams(req);
    const u = new URL(req.url);
    let q = supabaseAdmin.from("admin_audit").select("id, at, actor, action, resource, resource_id, before, after").order("id", { ascending: false }).limit(p.limit + 1);
    for (const f of ["resource", "action"] as const) { const v = u.searchParams.get(f); if (v) q = q.eq(f, v.slice(0, 40)); }
    const resourceId = u.searchParams.get("resourceId"); if (resourceId) q = q.eq("resource_id", resourceId.slice(0, 120));
    if (p.cursor) { const id = Number(p.cursor); if (!Number.isInteger(id)) throw badRequest("cursor is not valid"); q = q.lt("id", id); }
    const { data, error } = await q;
    if (error) throw error;
    const rows = data ?? [];
    const more = rows.length > p.limit;
    const items = rows.slice(0, p.limit).map((r) => ({ id: r.id, at: r.at, actor: r.actor, action: r.action, resource: r.resource, resourceId: r.resource_id, before: r.before, after: r.after }));
    return ok({ items, nextCursor: more ? String(items[items.length - 1].id) : null });
  });
}
