// lib/adminApi/couponRedemption.ts
// One-time codes (kind `single-use`). Each step is ONE conditional statement, so parallel callers cannot both win:
//   reserve  - when the order is created: holds the code for this user for RESERVATION_MINUTES
//   consume  - when the payment is verified (or the free enrolment is created): the code is spent
//   release  - when the payment fails or is abandoned: the code is free again
// Used by create-order, verify-payment and enroll-free once the learner portal reads database coupons (phase 5).
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { RESERVATION_MINUTES } from "./coupons";

export async function reserveSingleUse(code: string, userId: string): Promise<boolean> {
  const now = new Date();
  const until = new Date(now.getTime() + RESERVATION_MINUTES * 60_000).toISOString();
  const { data, error } = await supabaseAdmin.from("coupons")
    .update({ reserved_by: userId, reserved_until: until })
    .eq("code", code.toUpperCase()).eq("kind", "single-use").eq("active", true).is("redeemed_at", null).gt("expires_at", now.toISOString())
    .or(`reserved_by.is.null,reserved_until.lt.${now.toISOString()},reserved_by.eq.${userId}`)
    .select("code");
  if (error) throw error;
  return (data?.length ?? 0) === 1;
}

export async function consumeSingleUse(code: string, userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.from("coupons")
    .update({ redeemed_by: userId, redeemed_at: new Date().toISOString(), redemptions: 1, reserved_by: null, reserved_until: null })
    .eq("code", code.toUpperCase()).eq("kind", "single-use").eq("reserved_by", userId).is("redeemed_at", null)
    .select("code");
  if (error) throw error;
  return (data?.length ?? 0) === 1;
}

export async function releaseSingleUse(code: string, userId: string): Promise<void> {
  const { error } = await supabaseAdmin.from("coupons")
    .update({ reserved_by: null, reserved_until: null })
    .eq("code", code.toUpperCase()).eq("kind", "single-use").eq("reserved_by", userId).is("redeemed_at", null);
  if (error) throw error;
}
