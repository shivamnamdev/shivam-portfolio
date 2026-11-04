// lib/adminApi/importCurriculum.ts
// Plans the copy of today's data/learning-content.ts into the curriculum tables. Pure (unit-tested): the route reads the database and applies the plan.
// Safe by default: an existing curriculum that differs from the files is NEVER overwritten unless `overwrite` is asked for (an admin may have edited it).
import { fromLegacy, summary, type CurriculumDoc, type Module } from "./curriculum";

export type ImportAction = "create" | "unchanged" | "differs" | "overwrite";
export type ImportPlan = { cohort: string; action: ImportAction; doc: CurriculumDoc; counts: { modules: number; lessons: number }; dropped: string[]; existing?: { modules: number; lessons: number } };

// Key order is not stable in jsonb, so equality is compared on a canonical form (keys sorted).
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(",")}}`;
  return JSON.stringify(v);
}

export function planCurriculumImport(cohort: string, legacy: Parameters<typeof fromLegacy>[1], existing: CurriculumDoc | null, overwrite: boolean, now = new Date().toISOString()): ImportPlan {
  const { modules, dropped } = fromLegacy(cohort, legacy);
  const doc: CurriculumDoc = { modules, published: modules, publishedAt: now };   // the files are what learners see today, so the import is published
  const base = { cohort, doc, counts: summary(modules), dropped };
  if (!existing) return { ...base, action: "create" };
  const same = existing.published !== null && canonical(existing.modules) === canonical(modules) && canonical(existing.published) === canonical(modules);
  const was = summary((existing.modules ?? []) as Module[]);
  if (same) return { ...base, action: "unchanged", existing: was };
  return { ...base, action: overwrite ? "overwrite" : "differs", existing: was };
}
