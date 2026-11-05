// lib/adminApi/emailTemplates.ts
// E-mail templates (content_docs kind 'email_template'). The admin writes PLAIN TEXT; the server turns it into safe HTML. Nothing the admin
// or a learner types is ever treated as HTML: everything is escaped first, then only **bold** and [label](https://link) are recognised.
// Placeholders come from a fixed list per template and their values are escaped when substituted (after formatting, so a value cannot
// inject formatting either).
import { badRequest } from "./envelope";
import { escapeHtml } from "../escapeHtml";

export type TemplateKey = "welcome" | "payment-receipt" | "free-enrolment";
type Definition = { placeholders: string[]; sample: Record<string, string>; subject: string; body: string };

export const TEMPLATES: Record<TemplateKey, Definition> = {
  welcome: {
    placeholders: ["name", "course"], sample: { name: "Asha", course: "Python for Beginners" },
    subject: "Welcome to {{course}}",
    body: "Hi {{name}},\n\nWelcome to **{{course}}**. Your seat is confirmed.\n\nOpen your dashboard to start learning: [Go to my courses](https://shivamnamdev.com/dashboard)",
  },
  "payment-receipt": {
    placeholders: ["name", "course", "amount", "orderId"], sample: { name: "Asha", course: "Python for Beginners", amount: "₹1,999", orderId: "order_QA123456" },
    subject: "Payment received for {{course}}",
    body: "Hi {{name}},\n\nThank you. We received **{{amount}}** for {{course}}.\n\nOrder id: {{orderId}}\n\nKeep this e-mail as your receipt.",
  },
  "free-enrolment": {
    placeholders: ["name", "course"], sample: { name: "Asha", course: "Git for Beginners" },
    subject: "You are enrolled in {{course}}",
    body: "Hi {{name}},\n\nYou are enrolled in **{{course}}**, free of charge.\n\nOpen your dashboard to begin: [Go to my courses](https://shivamnamdev.com/dashboard)",
  },
};
export const TEMPLATE_KEYS = Object.keys(TEMPLATES) as TemplateKey[];
export const isTemplateKey = (k: string): k is TemplateKey => Object.prototype.hasOwnProperty.call(TEMPLATES, k);

export const LIMITS = { subject: 150, body: 5000 };

// Names used in a text, in order. Anything that looks like a placeholder but is not exactly {{name}} is reported as is.
export const placeholdersIn = (text: string): string[] => Array.from(text.matchAll(/\{\{([^{}]*)\}\}/g), (m) => m[1]);

// Returns the problems found in a subject and body for this template (empty when it can be saved).
export function templateProblems(key: TemplateKey, subject: unknown, body: unknown): Record<string, string> {
  const f: Record<string, string> = {};
  const allowed = TEMPLATES[key].placeholders;
  const check = (field: "subject" | "body", v: unknown, max: number) => {
    if (typeof v !== "string" || !v.trim()) { f[field] = "is required"; return; }
    if (v.length > max) { f[field] = `must be at most ${max} characters`; return; }
    if (field === "subject" && /[\r\n\u0000-\u001f\u007f]/.test(v)) { f.subject = "must be one line"; return; }
    if (field === "body" && /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v)) { f.body = "contains control characters"; return; }
    const unknownName = placeholdersIn(v).find((n) => !allowed.includes(n));
    if (unknownName !== undefined) { f[field] = `uses {{${unknownName}}}, which is not available here. Use: ${allowed.map((n) => `{{${n}}}`).join(", ")}`; return; }
    if (v.replace(/\{\{[^{}]*\}\}/g, "").match(/\{\{|\}\}/)) f[field] = "has an unfinished {{placeholder}}";
  };
  check("subject", subject, LIMITS.subject);
  check("body", body, LIMITS.body);
  return f;
}
export function assertTemplate(key: TemplateKey, subject: unknown, body: unknown): { subject: string; body: string } {
  const f = templateProblems(key, subject, body);
  if (Object.keys(f).length) throw badRequest("Some fields are not valid", f);
  return { subject: (subject as string).trim(), body: (body as string).replace(/\r\n/g, "\n").trim() };
}

const clean = (v: unknown) => String(v ?? "");
const oneLine = (v: unknown) => clean(v).replace(/[\r\n\u0000-\u001f\u007f]+/g, " ").trim();

function substitute(text: string, values: Record<string, string>, map: (v: string) => string): string {
  return text.replace(/\{\{([^{}]*)\}\}/g, (_m, name: string) => (name in values ? map(clean(values[name])) : ""));
}

export type Rendered = { subject: string; text: string; html: string };

const LINK = /\[([^\]\n]{1,100})\]\((https:\/\/[^\s(){}]{1,500})\)/g;
const BOLD = /\*\*([^*\n]{1,200})\*\*/g;

// The one formatter for admin-written text. HTML: escape the whole body first, then format, then substitute escaped values (so a value can
// neither add formatting nor markup). `values` is empty for text with no placeholders (notifications): braces then stay as typed.
function format(body: string, values: Record<string, string> | null): { text: string; html: string } {
  const text0 = body.replace(/\r\n/g, "\n");
  const paragraphs = text0.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).map((p) => {
    let h = escapeHtml(p).replace(LINK, (_m, label: string, url: string) => `<a href="${url}">${label}</a>`).replace(BOLD, "<strong>$1</strong>");
    if (values) h = substitute(h, values, escapeHtml);
    return `<p>${h.replace(/\n/g, "<br>")}</p>`;
  });
  const plain = text0.replace(LINK, "$1 ($2)").replace(BOLD, "$1");
  return { text: values ? substitute(plain, values, (v) => v) : plain, html: paragraphs.join("\n") };
}

export function renderTemplate(key: TemplateKey, subject: string, body: string, values: Record<string, string>): Rendered {
  const allowed = TEMPLATES[key].placeholders;
  const only = Object.fromEntries(Object.entries(values).filter(([k]) => allowed.includes(k)));
  return { subject: substitute(subject, only, oneLine).trim(), ...format(body, only) };
}

// Text with no placeholders (an announcement e-mail): same safe formatting, nothing substituted.
export const renderPlain = (body: string): { text: string; html: string } => format(body, null);

export const sampleValues = (key: TemplateKey): Record<string, string> => TEMPLATES[key].sample;
