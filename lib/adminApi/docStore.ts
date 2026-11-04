// lib/adminApi/docStore.ts
// Courses and cohorts live as validated JSON in content_docs (one row each). Updates are one conditional statement on the version,
// so two admins cannot silently overwrite each other (the loser gets 409). Every write is audited by the caller.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { conflict, notFound } from "./envelope";
import type { ListParams } from "./request";
import { likeSafe } from "./request";

export type DocKind = "course" | "cohort";
type Row = { kind: string; key: string; status: string; version: number; doc: Record<string, unknown>; created_by: string; updated_by: string; created_at: string; updated_at: string };

// Never returns the `private` part of a document (cohort links): that is only served by the dedicated links route.
export const shape = (r: Row) => {
  const { private: _private, ...doc } = r.doc as Record<string, unknown>;
  return { slug: r.key, status: r.status, version: r.version, ...doc, createdAt: r.created_at, updatedAt: r.updated_at, updatedBy: r.updated_by };
};

const COLS = "kind, key, status, version, doc, created_by, updated_by, created_at, updated_at";

export async function getRow(kind: DocKind, key: string): Promise<Row> {
  const { data, error } = await supabaseAdmin.from("content_docs").select(COLS).eq("kind", kind).eq("key", key).maybeSingle();
  if (error) throw error;
  if (!data) throw notFound(`${kind} not found`);
  return data as Row;
}

export async function listRows(kind: DocKind, p: ListParams, extra?: (q: any) => any): Promise<{ rows: Row[]; next: string | null }> {
  let q = supabaseAdmin.from("content_docs").select(COLS).eq("kind", kind).order("key", { ascending: true }).limit(p.limit + 1);
  if (p.status) q = q.eq("status", p.status);
  if (p.cursor) q = q.gt("key", p.cursor);
  if (p.q) q = q.or(`key.ilike.%${likeSafe(p.q)}%,doc->>title.ilike.%${likeSafe(p.q)}%`);
  if (extra) q = extra(q);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as Row[];
  const more = rows.length > p.limit;
  return { rows: rows.slice(0, p.limit), next: more ? rows[p.limit - 1].key : null };
}

export async function insertRow(kind: DocKind, key: string, doc: Record<string, unknown>, actorId: string): Promise<Row> {
  const { data, error } = await supabaseAdmin.from("content_docs")
    .insert([{ kind, key, doc, status: "draft", created_by: actorId, updated_by: actorId }]).select(COLS).single();
  if (error) {
    if (error.code === "23505") throw conflict(`A ${kind} with the slug "${key}" already exists`);
    throw error;
  }
  return data as Row;
}

// expectedVersion must match; changes are applied in one statement.
export async function updateRow(kind: DocKind, key: string, expectedVersion: number, change: { doc?: Record<string, unknown>; status?: string }, actorId: string): Promise<Row> {
  const patch: Record<string, unknown> = { version: expectedVersion + 1, updated_by: actorId, updated_at: new Date().toISOString() };
  if (change.doc) patch.doc = change.doc;
  if (change.status) patch.status = change.status;
  const { data, error } = await supabaseAdmin.from("content_docs").update(patch)
    .eq("kind", kind).eq("key", key).eq("version", expectedVersion).select(COLS);
  if (error) throw error;
  if (data && data.length === 1) return data[0] as Row;
  await getRow(kind, key);   // 404 when it does not exist
  throw conflict("This record was changed by someone else. Reload it and try again");
}

export async function deleteRow(kind: DocKind, key: string): Promise<void> {
  const { error } = await supabaseAdmin.from("content_docs").delete().eq("kind", kind).eq("key", key);
  if (error) throw error;
}
