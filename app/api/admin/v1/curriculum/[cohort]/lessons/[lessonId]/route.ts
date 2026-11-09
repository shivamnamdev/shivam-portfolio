import { NextRequest } from "next/server";
import { badRequest, handle, notFound } from "@/lib/adminApi/envelope";
import { parseObject, readBody } from "@/lib/adminApi/validate";
import { lessonPatchShape, patchLesson, removeLesson } from "@/lib/adminApi/curriculum";
import { curriculumWrite, writeActor } from "@/lib/adminApi/curriculumStore";

type Ctx = { params: Promise<{ cohort: string; lessonId: string }> };
const idOf = (s: string) => { if (!/^(doc-[A-Za-z0-9_-]{1,60}|[A-Za-z0-9_-]{11})$/.test(s)) throw notFound("lesson not found"); return s; };

export async function PATCH(req: NextRequest, props: Ctx) {
  const params = await props.params;
  return handle(async () => {
    const actor = await writeActor(req);
    const id = idOf(params.lessonId);
    const input = parseObject(await readBody(req), lessonPatchShape);
    const change = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
    if (!Object.keys(change).length) throw badRequest("Nothing to change");
    return curriculumWrite(req, params.cohort, (doc) => ({ ...doc, modules: patchLesson(doc.modules, id, change) }), { actor, action: "lesson.update", resourceNote: { lessonId: id } });
  });
}

export async function DELETE(req: NextRequest, props: Ctx) {
  const params = await props.params;
  return handle(async () => {
    const actor = await writeActor(req);
    const id = idOf(params.lessonId);
    return curriculumWrite(req, params.cohort, (doc) => ({ ...doc, modules: removeLesson(doc.modules, id) }), { actor, action: "lesson.delete", resourceNote: { lessonId: id } });
  });
}
