// lib/catalog/mail.ts
// Pure rule for the e-mail templates saved in the admin portal (owner decision, 2026-11-06): a mail uses a template ONLY when the owner has saved
// one for it; otherwise today's mail is sent unchanged (and a free enrolment sends no mail at all). A saved template that no longer passes the
// rules is ignored too, so a mail never goes out with broken text. Everything typed is escaped by the renderer (lib/adminApi/emailTemplates.ts).
import { TEMPLATES, renderTemplate, templateProblems, type TemplateKey } from "@/lib/adminApi/emailTemplates";

export type SavedTemplate = { subject?: unknown; body?: unknown } | null | undefined;
export type RenderedMail = { subject: string; text: string; html: string };

const frame = (inner: string) => `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1c1917; line-height: 1.6; font-size: 16px;">${inner}</div>`;

export function renderSaved(key: TemplateKey, saved: SavedTemplate, values: Record<string, string>): RenderedMail | null {
  if (!saved || typeof saved.subject !== "string" || typeof saved.body !== "string") return null;
  if (Object.keys(templateProblems(key, saved.subject, saved.body)).length) return null;
  const only = Object.fromEntries(TEMPLATES[key].placeholders.map((k) => [k, String(values[k] ?? "")]));
  const r = renderTemplate(key, saved.subject.trim(), saved.body.replace(/\r\n/g, "\n").trim(), only);
  if (!r.subject) return null;
  return { subject: r.subject, text: r.text, html: frame(r.html) };
}
