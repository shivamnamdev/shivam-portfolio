// lib/adminApi/validate.ts
// Small hand-written validators (owner decision D7: no new packages). Each validator turns `unknown` into a typed value or a message.
// `parseObject` collects every field error, rejects unknown fields and never throws on hostile input.
import { badRequest, type FieldErrors } from "./envelope";

export type Check<T> = (value: unknown) => { ok: true; value: T } | { ok: false; message: string };
const good = <T,>(value: T) => ({ ok: true as const, value });
const bad = (message: string) => ({ ok: false as const, message });

export const str = (o: { min?: number; max: number; pattern?: RegExp; trim?: boolean }): Check<string> => (v) => {
  if (typeof v !== "string") return bad("must be text");
  const s = o.trim === false ? v : v.trim();
  if (s.length < (o.min ?? 1)) return bad(o.min && o.min > 1 ? `must be at least ${o.min} characters` : "is required");
  if (s.length > o.max) return bad(`must be at most ${o.max} characters`);
  if (o.pattern && !o.pattern.test(s)) return bad("has an invalid format");
  return good(s);
};

export const slug: Check<string> = str({ max: 100, pattern: /^[a-z0-9][a-z0-9_-]*$/ });

export const int = (o: { min?: number; max?: number }): Check<number> => (v) => {
  if (typeof v !== "number" || !Number.isInteger(v)) return bad("must be a whole number");
  if (o.min !== undefined && v < o.min) return bad(`must be at least ${o.min}`);
  if (o.max !== undefined && v > o.max) return bad(`must be at most ${o.max}`);
  return good(v);
};

export const num = (o: { gt?: number; min?: number; max?: number }): Check<number> => (v) => {
  if (typeof v !== "number" || !Number.isFinite(v)) return bad("must be a number");
  if (o.gt !== undefined && v <= o.gt) return bad(`must be greater than ${o.gt}`);
  if (o.min !== undefined && v < o.min) return bad(`must be at least ${o.min}`);
  if (o.max !== undefined && v > o.max) return bad(`must be at most ${o.max}`);
  return good(v);
};

export const bool: Check<boolean> = (v) => (typeof v === "boolean" ? good(v) : bad("must be true or false"));

export const oneOf = <T extends string>(...allowed: T[]): Check<T> => (v) =>
  typeof v === "string" && (allowed as string[]).includes(v) ? good(v as T) : bad(`must be one of: ${allowed.join(", ")}`);

// Only https links, no credentials in the URL, a sane length. Blocks javascript:, data:, http:, file: and relative links.
export const httpsUrl: Check<string> = (v) => {
  if (typeof v !== "string" || v.length > 2000) return bad("must be an https link");
  try {
    const u = new URL(v.trim());
    if (u.protocol !== "https:" || u.username || u.password || !u.hostname.includes(".")) return bad("must be an https link");
    return good(u.toString());
  } catch { return bad("must be an https link"); }
};

// Calendar timestamp in ISO form (the database stores timestamptz).
export const isoDate: Check<string> = (v) => {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2})?)?$/.test(v)) return bad("must be an ISO date");
  const t = Date.parse(v);
  return Number.isNaN(t) ? bad("must be a real date") : good(new Date(t).toISOString());
};

export const futureDate: Check<string> = (v) => {
  const d = isoDate(v);
  if (!d.ok) return d;
  return Date.parse(d.value) > Date.now() ? d : bad("must be in the future");
};

export const arrayOf = <T,>(item: Check<T>, o: { min?: number; max: number }): Check<T[]> => (v) => {
  if (!Array.isArray(v)) return bad("must be a list");
  if (v.length < (o.min ?? 0)) return bad(`needs at least ${o.min} item${o.min === 1 ? "" : "s"}`);
  if (v.length > o.max) return bad(`can have at most ${o.max} items`);
  const out: T[] = [];
  for (let i = 0; i < v.length; i++) {
    const r = item(v[i]);
    if (!r.ok) return bad(`item ${i + 1} ${r.message}`);
    out.push(r.value);
  }
  return good(out);
};

export const optional = <T,>(check: Check<T>): Check<T | undefined> => (v) => (v === undefined || v === null ? good(undefined) : check(v));

type Shape = Record<string, Check<unknown>>;
type Parsed<S extends Shape> = { [K in keyof S]: S[K] extends Check<infer T> ? T : never };

function runShape(input: unknown, shape: Shape): { value: Record<string, unknown>; fields: FieldErrors } | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const fields: FieldErrors = {};
  const body = input as Record<string, unknown>;
  for (const key of Object.keys(body)) if (!(key in shape)) fields[key] = "is not a known field";
  const value: Record<string, unknown> = {};
  for (const [key, check] of Object.entries(shape)) {
    const r = check(body[key]);
    if (r.ok) value[key] = r.value; else fields[key] = r.message;
  }
  return { value, fields };
}

export function parseObject<S extends Shape>(input: unknown, shape: S): Parsed<S> {
  const run = runShape(input, shape);
  if (!run) throw badRequest("Request body must be a JSON object");
  if (Object.keys(run.fields).length) throw badRequest("Some fields are not valid", run.fields);
  return run.value as Parsed<S>;
}

// A nested object as a Check (reports the first problem with its path).
export const objectOf = <S extends Shape>(shape: S): Check<Parsed<S>> => (v) => {
  const run = runShape(v, shape);
  if (!run) return bad("must be an object");
  const first = Object.entries(run.fields)[0];
  return first ? bad(`${first[0]} ${first[1]}`) : good(run.value as Parsed<S>);
};

// Free-form JSON with limits (used for page copy until the screens define exact blocks): plain data only, bounded size, depth and string length.
export const boundedJson = (o: { maxBytes: number; maxDepth: number; maxString: number }): Check<Record<string, unknown>> => (v) => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return bad("must be an object");
  let bytes = 0;
  const walk = (x: unknown, depth: number): string | null => {
    if (depth > o.maxDepth) return "is nested too deeply";
    if (typeof x === "string") { bytes += x.length; return x.length > o.maxString ? `has a text longer than ${o.maxString} characters` : null; }
    if (x === null || typeof x === "number" || typeof x === "boolean") { bytes += 8; return null; }
    if (Array.isArray(x)) { for (const i of x) { const r = walk(i, depth + 1); if (r) return r; } return null; }
    if (typeof x === "object") { for (const [k, i] of Object.entries(x as object)) { bytes += k.length; const r = walk(i, depth + 1); if (r) return r; } return null; }
    return "contains a value that is not plain data";
  };
  const problem = walk(v, 0);
  if (problem) return bad(problem);
  return bytes > o.maxBytes ? bad(`is larger than ${o.maxBytes} characters`) : good(v as Record<string, unknown>);
};

export const email: Check<string> = (v) => {
  const s = str({ max: 254, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ })(v);
  return s.ok ? good(s.value.toLowerCase()) : s;
};

// Reads the JSON body; anything that is not valid JSON is a 400, never a 500.
export async function readBody(req: Request): Promise<unknown> {
  try { return await req.json(); } catch { throw badRequest("Request body must be valid JSON"); }
}
