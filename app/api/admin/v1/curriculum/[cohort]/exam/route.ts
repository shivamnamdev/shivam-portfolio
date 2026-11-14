import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { conflict, handle } from "@/lib/adminApi/envelope";
import { clearExam, examLessonId, setExam } from "@/lib/adminApi/curriculum";
import { curriculumWrite, cohortParam, writeActor } from "@/lib/adminApi/curriculumStore";
import { parseObject, readBody, optional, str, type Check } from "@/lib/adminApi/validate";
import { examGraderExists } from "@/lib/examGraders";

// R6 (amended 2026-11-14, docs/architecture/exam-switch.md): the ONLY call that may set, move or remove the final exam. The generic lesson calls still refuse the exam flags.
// Owner and admin keys (permission curriculum:write). The course must already have a grader in code (E1); removing the exam is refused once a learner has passed it (E6).
const lesson: Check<string | null> = (v) => (v === null ? { ok: true, value: null } : str({ max: 70, pattern: /^[A-Za-z0-9_-]{11}$/ })(v));
const outcome: Check<string> = (v) => (v === "" ? { ok: true, value: "" } : str({ max: 2000, pattern: /^https:\/\/raw\.githubusercontent\.com\/\S+$/ })(v));

export async function PUT(req: NextRequest, props: { params: Promise<{ cohort: string }> }) {
  const params = await props.params;
  return handle(async () => {
    const actor = await writeActor(req);
    const cohort = cohortParam(params.cohort);
    const input = parseObject(await readBody(req), { lessonId: lesson, expectedOutcomeUrl: optional(outcome) });
    if (input.lessonId === null) {
      const { count, error } = await supabaseAdmin.from("exam_progress").select("user_id", { count: "exact", head: true }).eq("course_slug", cohort).eq("is_passed", true);
      if (error) throw error;
      if (count) throw conflict(`${count} learner(s) have passed this exam, and passing it unlocked their advanced lessons. Move the exam to another lesson instead of removing it`);
      return curriculumWrite(req, cohort, (doc) => ({ ...doc, modules: clearExam(doc.modules) }), { actor, action: "exam.clear", allowProtected: true, resourceNote: { exam: null } });
    }
    const id = input.lessonId;
    return curriculumWrite(req, cohort, (doc) => ({ ...doc, modules: setExam(doc.modules, id, { graderExists: examGraderExists(cohort), expectedOutcomeUrl: input.expectedOutcomeUrl }) }),
      { actor, action: "exam.set", allowProtected: true, resourceNote: { exam: id } });
  });
}
