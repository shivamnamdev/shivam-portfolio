import { NextRequest } from "next/server";
import { handle } from "@/lib/adminApi/envelope";
import { parseObject, readBody } from "@/lib/adminApi/validate";
import { reorderModules, reorderModulesShape } from "@/lib/adminApi/curriculum";
import { curriculumWrite, writeActor } from "@/lib/adminApi/curriculumStore";

export async function POST(req: NextRequest, props: { params: Promise<{ cohort: string }> }) {
  const params = await props.params;
  return handle(async () => {
    const actor = await writeActor(req);
    const body = parseObject(await readBody(req), reorderModulesShape);
    return curriculumWrite(req, params.cohort, (doc) => ({ ...doc, modules: reorderModules(doc.modules, body.moduleIds) }), { actor, action: "module.reorder" });
  });
}
