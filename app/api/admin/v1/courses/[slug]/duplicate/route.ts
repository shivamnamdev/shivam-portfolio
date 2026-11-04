import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { handle, notFound, ok } from "@/lib/adminApi/envelope";
import { limitWrites } from "@/lib/adminApi/request";
import { optional, parseObject, readBody, slug as slugCheck, str, slug } from "@/lib/adminApi/validate";
import { getRow, insertRow, shape } from "@/lib/adminApi/docStore";
import { writeAudit } from "@/lib/adminApi/audit";

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  return handle(async () => {
    const actor = await authorize(req, "courses:write");
    await limitWrites(actor);
    if (!slugCheck(params.slug).ok) throw notFound("course not found");
    const input = parseObject(await readBody(req), { slug, title: optional(str({ max: 200 })) });
    const source = await getRow("course", params.slug);
    const doc = { ...source.doc, ...(input.title ? { title: input.title } : {}) };
    const row = await insertRow("course", input.slug, doc, actor.id);   // always a draft, no cohorts, no enrolments
    await writeAudit({ actor, action: "duplicate", resource: "course", resourceId: input.slug, before: { from: params.slug }, after: shape(row) });
    return ok(shape(row), 201);
  });
}
