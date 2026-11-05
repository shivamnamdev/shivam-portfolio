// lib/adminApi/engagementStore.ts
// Database side of banners, settings and e-mail templates (all in content_docs). Pure rules live in banners.ts, settings.ts, emailTemplates.ts.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notFound, unprocessable } from "./envelope";
import { getRow, listRows, shape } from "./docStore";
import { slug as slugCheck } from "./validate";
import { SETTINGS, effectiveSettings, type Effective } from "./settings";
import { TEMPLATES, type TemplateKey } from "./emailTemplates";
import type { Audience } from "./banners";

export const slugParam = (s: string, what: string): string => { if (!slugCheck(s).ok) throw notFound(`${what} not found`); return s; };
export const withoutUndefined = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

// A banner aimed at one cohort must point at a cohort that exists (a typo would make it silently show to nobody).
export async function assertCohortAudience(a: Audience | undefined): Promise<void> {
  if (a?.kind !== "cohort") return;
  const { data, error } = await supabaseAdmin.from("content_docs").select("key").eq("kind", "cohort").eq("key", a.cohortSlug).maybeSingle();
  if (error) throw error;
  if (!data) throw unprocessable(`cohort not found: ${a.cohortSlug}`);
}

type SettingRow = Awaited<ReturnType<typeof getRow>>;
const ALL = { limit: 100, cursor: null, q: null, status: null };

export async function savedSettings(): Promise<{ rows: Record<string, SettingRow>; values: Record<string, unknown> }> {
  const { rows } = await listRows("setting", ALL);
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
  return { rows: byKey, values: Object.fromEntries(rows.filter((r) => r.key in SETTINGS).map((r) => [r.key, (r.doc as { value: unknown }).value])) };
}
export const settingView = (key: string, row: SettingRow | undefined) => ({
  key, value: row ? (row.doc as { value: unknown }).value : SETTINGS[key].default, default: SETTINGS[key].default, source: row ? "custom" : "default",
  description: SETTINGS[key].description, version: row?.version ?? null, updatedAt: row?.updated_at ?? null, updatedBy: row?.updated_by ?? null,
});
export const effective = (values: Record<string, unknown>): Effective => effectiveSettings(values);

export const templateView = (key: TemplateKey, row: SettingRow | undefined) => {
  const doc = row ? (row.doc as { subject: string; body: string }) : TEMPLATES[key];
  return {
    key, subject: doc.subject, body: doc.body, source: row ? "custom" : "default", placeholders: TEMPLATES[key].placeholders,
    status: row?.status ?? "published", version: row?.version ?? null, updatedAt: row?.updated_at ?? null, updatedBy: row?.updated_by ?? null,
  };
};
export async function savedTemplates(): Promise<Record<string, SettingRow>> {
  const { rows } = await listRows("email_template", ALL);
  return Object.fromEntries(rows.map((r) => [r.key, r]));
}
export { shape };
