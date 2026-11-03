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
