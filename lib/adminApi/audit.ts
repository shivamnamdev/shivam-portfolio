// lib/adminApi/audit.ts
// Every admin write records who did what, with the data before and after. If the entry cannot be written the whole request fails
// (the caller awaits this BEFORE reporting success), so a change never exists without its history.
import { revalidateTag } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { CATALOG_TAG, LEARNING_TAG, touchesCatalog, touchesLearning } from "@/lib/catalog/tags";
import { ApiError } from "./envelope";
import type { Actor } from "./guard";

const SECRET_KEYS = new Set(["hash", "secret", "token", "password", "authorization"]);

// Removes secret-looking keys (deeply) before anything is stored in the log.
export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([k]) => !SECRET_KEYS.has(k.toLowerCase())).map(([k, v]) => [k, redact(v)]));
  }
  return value;
}

export async function writeAudit(entry: { actor: Actor; action: string; resource: string; resourceId: string; before?: unknown; after?: unknown }): Promise<void> {
  const { error } = await supabaseAdmin.from("admin_audit").insert([{
    actor: entry.actor.id, action: entry.action, resource: entry.resource, resource_id: entry.resourceId,
    before: entry.before === undefined ? null : redact(entry.before), after: entry.after === undefined ? null : redact(entry.after),
  }]);
  if (error) {
    console.error("audit write failed:", error);
    throw new ApiError(500, "audit_failed", "The change was not saved because it could not be recorded");
  }
  // A saved change to a course, cohort or setting refreshes the cached course list and sales pages at once (the 60-second timer is only a backstop).
  if (touchesCatalog(entry.resource, entry.action)) {
    try { revalidateTag(CATALOG_TAG); } catch (e) { console.error("catalog revalidation failed:", (e as Error).message?.slice(0, 80)); }
  }
  // The same for what the learning area reads (curriculum, cohort, course).
  if (touchesLearning(entry.resource)) {
    try { revalidateTag(LEARNING_TAG); } catch (e) { console.error("learning revalidation failed:", (e as Error).message?.slice(0, 80)); }
  }
}
