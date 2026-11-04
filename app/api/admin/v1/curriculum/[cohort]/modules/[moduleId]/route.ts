import { NextRequest } from "next/server";
import { badRequest, handle, notFound } from "@/lib/adminApi/envelope";
import { parseObject, readBody } from "@/lib/adminApi/validate";
import { modulePatchShape, patchModule, removeModule } from "@/lib/adminApi/curriculum";
import { curriculumWrite, writeActor } from "@/lib/adminApi/curriculumStore";

type Ctx = { params: { cohort: string; moduleId: string } };
const idOf = (s: string) => { if (!/^m-[a-z0-9]{8}$/.test(s)) throw notFound("module not found"); return s; };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const actor = await writeActor(req);
    const id = idOf(params.moduleId);
    const input = parseObject(await readBody(req), modulePatchShape);
    const change = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
    if (!Object.keys(change).length) throw badRequest("Nothing to change");
    return curriculumWrite(req, params.cohort, (doc) => ({ ...doc, modules: patchModule(doc.modules, id, change) }), { actor, action: "module.update", resourceNote: { moduleId: id } });
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const actor = await writeActor(req);
    const id = idOf(params.moduleId);
    return curriculumWrite(req, params.cohort, (doc) => ({ ...doc, modules: removeModule(doc.modules, id) }), { actor, action: "module.delete", resourceNote: { moduleId: id } });
  });
}
