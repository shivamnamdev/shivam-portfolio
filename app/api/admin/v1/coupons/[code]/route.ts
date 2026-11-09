import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { badRequest, handle, notFound, ok, unprocessable } from "@/lib/adminApi/envelope";
import { limitWrites } from "@/lib/adminApi/request";
import { parseObject, readBody } from "@/lib/adminApi/validate";
import { CODE_PATTERN, checkCouponAgainstPrices, couponUpdateShape, getCoupon, idsForEmails, shapeCoupon, usersForCoupon } from "@/lib/adminApi/coupons";
import { writeAudit } from "@/lib/adminApi/audit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Ctx = { params: Promise<{ code: string }> };
const checkCode = (c: string) => { const up = c.toUpperCase(); if (!CODE_PATTERN.test(up)) throw notFound("Coupon not found"); return up; };

export async function GET(req: NextRequest, props: Ctx) {
  const params = await props.params;
  return handle(async () => {
    await authorize(req, "coupons:read");
    const row = await getCoupon(checkCode(params.code));
    return ok(shapeCoupon(row, await usersForCoupon(row)));
  });
}

export async function PATCH(req: NextRequest, props: Ctx) {
  const params = await props.params;
  return handle(async () => {
    const actor = await authorize(req, "coupons:write");
    await limitWrites(actor);
    const code = checkCode(params.code);
    const input = parseObject(await readBody(req), couponUpdateShape);
    if (!Object.values(input).some((v) => v !== undefined)) throw badRequest("Nothing to change");
    const before = await getCoupon(code);
    if (before.redeemed_at) throw unprocessable("This code has been used and can no longer be changed");
    if (input.users && before.kind !== "selected") throw badRequest("Only a selected-students coupon has a list of students", { users: "is only allowed for kind selected" });
    if (input.maxRedemptions !== undefined && before.kind === "single-use") throw badRequest("A one-time code is always limited to one use", { maxRedemptions: "cannot be changed for a one-time code" });
    const discount = input.discount ?? before.discount;
    const scope = input.appliesTo ?? before.applies_to;
    if (input.discount || input.appliesTo) await checkCouponAgainstPrices(discount, scope);
    const people = input.users ? await idsForEmails(input.users) : null;
    const patch: Record<string, unknown> = {};
    if (input.discount) patch.discount = input.discount;
    if (input.expiresAt) patch.expires_at = input.expiresAt;
    if (input.active !== undefined) patch.active = input.active;
    if (input.appliesTo) patch.applies_to = input.appliesTo;
    if (input.maxRedemptions !== undefined) patch.max_redemptions = input.maxRedemptions;
    if (people) patch.user_ids = people.map((p) => p.id);
    const { data, error } = await supabaseAdmin.from("coupons").update(patch).eq("code", code).is("redeemed_at", null).select().maybeSingle();
    if (error) throw error;
    if (!data) throw unprocessable("This code has been used and can no longer be changed");
    const shaped = shapeCoupon(data as never, people ?? (await usersForCoupon(data as never)));
    await writeAudit({ actor, action: "update", resource: "coupon", resourceId: code, before: shapeCoupon(before), after: shaped });
    return ok(shaped);
  });
}

export async function DELETE(req: NextRequest, props: Ctx) {
  const params = await props.params;
  return handle(async () => {
    const actor = await authorize(req, "coupons:write");
    await limitWrites(actor);
    const code = checkCode(params.code);
    const before = await getCoupon(code);
    if (before.redeemed_at || before.redemptions > 0) throw unprocessable("This coupon has been used. Deactivate it instead of deleting it");
    const { error } = await supabaseAdmin.from("coupons").delete().eq("code", code);
    if (error) throw error;
    await writeAudit({ actor, action: "delete", resource: "coupon", resourceId: code, before: shapeCoupon(before) });
    return ok({ deleted: code });
  });
}
