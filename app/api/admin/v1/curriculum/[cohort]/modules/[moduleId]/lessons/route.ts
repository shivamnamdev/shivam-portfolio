import { NextRequest } from "next/server";
import { handle, notFound } from "@/lib/adminApi/envelope";
import { parseObject, readBody } from "@/lib/adminApi/validate";
import { addLesson, clean, lessonCreateShape, type Lesson } from "@/lib/adminApi/curriculum";
import { curriculumWrite, writeActor } from "@/lib/adminApi/curriculumStore";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ cohort: string; moduleId: string }> }
) {
  const params = await props.params;
  return handle(async () => {
    const actor = await writeActor(req);
    if (!/^m-[a-z0-9]{8}$/.test(params.moduleId)) throw notFound("module not found");
    const { position, ...input } = parseObject(await readBody(req), lessonCreateShape);
    const lesson = clean({ ...input, kind: input.id.startsWith("doc-") ? "document" : "video" }) as Lesson;
    return curriculumWrite(req, params.cohort, (doc) => ({ ...doc, modules: addLesson(doc.modules, params.moduleId, lesson, position) }), { actor, action: "lesson.add", resourceNote: { moduleId: params.moduleId, lessonId: lesson.id } });
  });
}
