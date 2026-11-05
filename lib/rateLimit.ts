// lib/rateLimit.ts
// Server-only. Fixed-window counter in Supabase (docs/testing/sql/step6-rate-limits.sql), shared by every serverless instance.
// Returns true when the call is within the limit. If the counter cannot be reached (table or function missing, database down)
// it returns true and logs loudly: a broken limiter must not take the contact form or the learning page down.
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function rateLimitAllows(key: string, windowSeconds: number, limit: number): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.rpc("rate_limit_hit", { p_key: key, p_window_seconds: windowSeconds, p_limit: limit });
    if (error) throw error;
    return data !== false;
  } catch (err) {
    console.error("rate limit unavailable (failing open):", key.split(":")[0], err);
    return true;
  }
}

// The caller's address as Vercel reports it (first entry of x-forwarded-for); "unknown" groups the rest together.
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "unknown";
}

// Takes `amount` from a budget all at once (all or nothing): used where a batch must not half-pass, such as an announcement e-mail.
// Unlike rateLimitAllows this FAILS CLOSED ("unavailable"): a broken counter must never let an e-mail batch past its cap.
export async function rateLimitTake(key: string, windowSeconds: number, amount: number, limit: number): Promise<"ok" | "denied" | "unavailable"> {
  try {
    const { data, error } = await supabaseAdmin.rpc("rate_limit_take", { p_key: key, p_window_seconds: windowSeconds, p_amount: amount, p_limit: limit });
    if (error) throw error;
    return data === true ? "ok" : "denied";
  } catch (err) {
    console.error("rate limit take unavailable (failing closed):", key.split(":")[0], err);
    return "unavailable";
  }
}
