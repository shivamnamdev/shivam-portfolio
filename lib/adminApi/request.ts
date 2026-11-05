// lib/adminApi/request.ts
// Shared request helpers for the admin routes: list parameters, If-Match, and the write rate limit.
import { ApiError, badRequest } from "./envelope";
import { rateLimitAllows } from "@/lib/rateLimit";
import type { Actor } from "./guard";

export type ListParams = { limit: number; cursor: string | null; q: string | null; status: string | null };

export function listParams(req: Request): ListParams {
  const u = new URL(req.url);
  const limit = Number(u.searchParams.get("limit") ?? 25);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw badRequest("limit must be a whole number from 1 to 100");
  const clean = (name: string, max: number) => {
    const v = u.searchParams.get(name);
    if (v === null || v === "") return null;
    if (v.length > max) throw badRequest(`${name} is too long`);
    return v;
  };
  return { limit, cursor: clean("cursor", 300), q: clean("q", 100), status: clean("status", 20) };
}

// Updates must say which version they were made from (optimistic concurrency): `If-Match: 3` or `If-Match: "3"`.
export function ifMatchVersion(req: Request): number {
  const raw = req.headers.get("if-match");
  if (raw === null) throw new ApiError(428, "precondition_required", "Send the version you are updating in the If-Match header");
  const n = Number(raw.replace(/"/g, "").trim());
  if (!Number.isInteger(n) || n < 1) throw badRequest("If-Match must be the version number");
  return n;
}

// 120 writes a minute per actor (admin session or key). Fails open if the counter is unreachable (lib/rateLimit.ts logs it).
export async function limitWrites(actor: Actor): Promise<void> {
  if (!(await rateLimitAllows(`admin-write:${actor.id}`, 60, 120))) throw new ApiError(429, "rate_limited", "Too many changes in a short time, please wait a minute");
}

export const likeSafe = (q: string) => q.replace(/[%_,()]/g, " ").trim();
