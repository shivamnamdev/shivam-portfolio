import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { badRequest, handle, notFound, ok } from "@/lib/adminApi/envelope";
import { parseObject } from "@/lib/adminApi/validate";
import { assertTemplate, isTemplateKey, renderTemplate, sampleValues } from "@/lib/adminApi/emailTemplates";
import { getRow } from "@/lib/adminApi/docStore";
import { templateView } from "@/lib/adminApi/engagementStore";

const anything = (v: unknown) => ({ ok: true as const, value: v });

// Shows what the e-mail would look like with sample values. Sends nothing and saves nothing. An empty request previews the saved (or built-in)
// template; { subject, body } previews text that has not been saved yet.
export async function POST(req: NextRequest, props: { params: Promise<{ key: string }> }) {
  const params = await props.params;
  return handle(async () => {
    await authorize(req, "templates:read");
    if (!isTemplateKey(params.key)) throw notFound("template not found");
    const key = params.key;
    const text = await req.text();
    let raw: unknown = {};
    if (text.trim()) { try { raw = JSON.parse(text); } catch { throw badRequest("Request body must be valid JSON"); } }
    const input = parseObject(raw, { subject: (v: unknown) => (v === undefined ? { ok: true as const, value: undefined } : anything(v)), body: (v: unknown) => (v === undefined ? { ok: true as const, value: undefined } : anything(v)) });
    let saved: Awaited<ReturnType<typeof getRow>> | undefined;
    try { saved = await getRow("email_template", key); } catch (e) { if ((e as { status?: number }).status !== 404) throw e; }
    const current = templateView(key, saved);
    const doc = assertTemplate(key, input.subject ?? current.subject, input.body ?? current.body);
    return ok({ key, ...renderTemplate(key, doc.subject, doc.body, sampleValues(key)), values: sampleValues(key) });
  });
}
