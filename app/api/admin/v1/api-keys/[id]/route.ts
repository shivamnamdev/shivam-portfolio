import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { handle, notFound, ok } from "@/lib/adminApi/envelope";
import { limitWrites } from "@/lib/adminApi/request";
import { writeAudit } from "@/lib/adminApi/audit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Revokes a key (it stops working at once). Revoking twice is fine.
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return handle(async () => {
    const actor = await authorize(req, "keys:write");
    await limitWrites(actor);
    if (!/^[a-z0-9]{8,16}$/.test(params.id)) throw notFound("API key not found");
    const { data, error } = await supabaseAdmin.from("api_keys").select("id, revoked_at").eq("id", params.id).maybeSingle();
    if (error) throw error;
    if (!data) throw notFound("API key not found");
    if (!data.revoked_at) {
      const upd = await supabaseAdmin.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", params.id);
      if (upd.error) throw upd.error;
      await writeAudit({ actor, action: "revoke", resource: "api-key", resourceId: params.id });
    }
    return ok({ revoked: params.id });
  });
}
