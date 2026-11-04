import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { badRequest, handle, ok } from "@/lib/adminApi/envelope";
import { limitWrites } from "@/lib/adminApi/request";
import { parseObject, readBody } from "@/lib/adminApi/validate";
import { checkCouponAgainstPrices, generateShape, newCode, shapeCoupon } from "@/lib/adminApi/coupons";
import { writeAudit } from "@/lib/adminApi/audit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { randomUUID } from "node:crypto";

const COLS = "code, kind, discount, expires_at, active, user_ids, applies_to, max_redemptions, redemptions, reserved_by, reserved_until, redeemed_by, redeemed_at, batch_id, created_by, created_at";

// Generates 1 to 200 random one-time codes in one call. An Idempotency-Key makes a retry return the same batch instead of making new codes.
export async function POST(req: NextRequest) {
  return handle(async () => {
    const actor = await authorize(req, "coupons:write");
    await limitWrites(actor);
    const key = req.headers.get("idempotency-key");
    if (key !== null && !/^[A-Za-z0-9_-]{8,100}$/.test(key)) throw badRequest("Idempotency-Key must be 8 to 100 letters, numbers, - or _");
    const input = parseObject(await readBody(req), generateShape);
    const batchId = key ? `idem-${key}` : randomUUID();
    if (key) {
      const existing = await supabaseAdmin.from("coupons").select(COLS).eq("batch_id", batchId).order("code");
      if (existing.error) throw existing.error;
      if (existing.data?.length) return ok({ batchId, count: existing.data.length, codes: existing.data.map((r) => shapeCoupon(r as never)), repeated: true });
    }
    await checkCouponAgainstPrices(input.discount, input.appliesTo);
    for (let attempt = 0; attempt < 3; attempt++) {
      const codes = new Set<string>();
      while (codes.size < input.count) codes.add(newCode());
      const { data, error } = await supabaseAdmin.from("coupons").insert([...codes].map((code) => ({
        code, kind: "single-use", discount: input.discount, expires_at: input.expiresAt, active: true, user_ids: [], applies_to: input.appliesTo ?? null,
        max_redemptions: 1, batch_id: batchId, created_by: actor.id,
      }))).select(COLS);
      if (error?.code === "23505") continue;   // a random code collided with an existing one: try a new set
      if (error) throw error;
      const shaped = (data ?? []).map((r) => shapeCoupon(r as never));
      await writeAudit({ actor, action: "generate", resource: "coupon", resourceId: batchId, after: { count: shaped.length, expiresAt: input.expiresAt, discount: input.discount } });
      return ok({ batchId, count: shaped.length, codes: shaped }, 201);
    }
    throw badRequest("Could not generate unique codes, please try again");
  });
}
