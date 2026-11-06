import { NextRequest } from "next/server";
import { handle } from "@/lib/adminApi/envelope";
import { parseObject, readBody } from "@/lib/adminApi/validate";
import { replaceModules, wholeShape } from "@/lib/adminApi/curriculum";
import { curriculumRead, curriculumWrite, writeActor } from "@/lib/adminApi/curriculumStore";

type Ctx = { params: { cohort: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  return handle(() => curriculumRead(req, params.cohort));
}

// Replaces the whole working copy (the published copy is not touched). Used for import and export.
export async function PUT(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const actor = await writeActor(req);
    const body = parseObject(await readBody(req), wholeShape);
    return curriculumWrite(req, params.cohort, (doc) => ({ ...doc, modules: replaceModules(body.modules) }), { actor, action: "replace" });
  });
}
