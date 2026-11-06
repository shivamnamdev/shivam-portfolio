import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { handle, notFound, ok } from "@/lib/adminApi/envelope";
import { ifMatchVersion, limitWrites } from "@/lib/adminApi/request";
import { parseObject, readBody } from "@/lib/adminApi/validate";
import { assertTemplate, isTemplateKey } from "@/lib/adminApi/emailTemplates";
import { getRow, insertRow, updateRow } from "@/lib/adminApi/docStore";
import { templateView } from "@/lib/adminApi/engagementStore";
import { writeAudit } from "@/lib/adminApi/audit";

type Ctx = { params: { key: string } };
const find = async (key: string) => { try { return await getRow("email_template", key); } catch (e) { if ((e as { status?: number }).status === 404) return undefined; throw e; } };
const anything = (v: unknown) => ({ ok: true as const, value: v });

export async function GET(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    await authorize(req, "templates:read");
    if (!isTemplateKey(params.key)) throw notFound("template not found");
    return ok(templateView(params.key, await find(params.key)));
  });
}

// Replaces one template (subject and body, plain text). The first save needs no version; later saves send If-Match.
export async function PUT(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const actor = await authorize(req, "templates:write");
    await limitWrites(actor);
    if (!isTemplateKey(params.key)) throw notFound("template not found");
    const key = params.key;
    const existing = await find(key);
    const expected = existing ? ifMatchVersion(req) : 0;
    const input = parseObject(await readBody(req), { subject: anything, body: anything });
    const doc = assertTemplate(key, input.subject, input.body);
    const saved = existing ? await updateRow("email_template", key, expected, { doc }, actor.id) : await insertRow("email_template", key, doc, actor.id, "published");
    await writeAudit({ actor, action: existing ? "update" : "create", resource: "email_template", resourceId: key, before: templateView(key, existing), after: templateView(key, saved) });
    return ok(templateView(key, saved), existing ? 200 : 201);
  });
}
