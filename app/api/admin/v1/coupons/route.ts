import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { badRequest, handle, ok } from "@/lib/adminApi/envelope";
import { limitWrites, listParams } from "@/lib/adminApi/request";
import { parseObject, readBody } from "@/lib/adminApi/validate";
import { checkCouponAgainstPrices, couponCreateShape, idsForEmails, insertCoupon, listCoupons, shapeCoupon, usersForCoupon } from "@/lib/adminApi/coupons";
import { writeAudit } from "@/lib/adminApi/audit";

export async function GET(req: NextRequest) {
  return handle(async () => {
    await authorize(req, "coupons:read");
    const p = listParams(req);
    const { rows, next } = await listCoupons({ ...p, state: new URL(req.url).searchParams.get("state") });
    const items = rows.map((r) => { const { users, ...rest } = shapeCoupon(r) as ReturnType<typeof shapeCoupon> & { users?: unknown[] }; return users ? { ...rest, userCount: users.length } : rest; });
    return ok({ items, nextCursor: next });
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const actor = await authorize(req, "coupons:write");
    await limitWrites(actor);
    const input = parseObject(await readBody(req), couponCreateShape);
    if (input.kind === "selected" && !input.users) throw badRequest("A selected-students coupon needs at least one signed-up student", { users: "is required for kind selected" });
    if (input.kind !== "selected" && input.users) throw badRequest("Only a selected-students coupon has a list of students", { users: "is only allowed for kind selected" });
    await checkCouponAgainstPrices(input.discount, input.appliesTo);
    const people = input.users ? await idsForEmails(input.users) : [];
    const row = await insertCoupon({
      code: input.code, kind: input.kind, discount: input.discount, expires_at: input.expiresAt, active: true, user_ids: people.map((p) => p.id),
      applies_to: input.appliesTo ?? null, max_redemptions: input.kind === "single-use" ? 1 : input.maxRedemptions ?? null, batch_id: null, created_by: actor.id,
    });
    const shaped = shapeCoupon(row, people);
    await writeAudit({ actor, action: "create", resource: "coupon", resourceId: row.code, after: shaped });
    return ok(shaped, 201);
  });
}
