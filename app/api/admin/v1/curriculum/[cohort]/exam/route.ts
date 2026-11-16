import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { conflict, handle } from "@/lib/adminApi/envelope";
import { checkExamChange, chooseExamId, clearExam, setExam } from "@/lib/adminApi/curriculum";
import { curriculumWrite, cohortParam, writeActor } from "@/lib/adminApi/curriculumStore";
import { parseObject, readBody, optional, str, type Check } from "@/lib/adminApi/validate";
import { courseDefaultExam, examIdExists } from "@/lib/examGraders";

// R6 (amended 2026-11-14, docs/architecture/exam-switch.md): the ONLY call that may set, move or remove the final exam. The generic lesson calls still refuse the exam flags.
// Owner and admin keys (permission curriculum:write). Exam library, step 1 (docs/architecture/exam-library.md): `examId` picks which library exam the course uses (X1, X2);
// removing the exam, or changing which exam the course uses, is refused once a learner has passed it (E6, X3).
const lesson: Check<string | null> = (v) => (v === null ? { ok: true, value: null } : str({ max: 70, pattern: /^[A-Za-z0-9_-]{11}$/ })(v));
const outcome: Check<string> = (v) => (v === "" ? { ok: true, value: "" } : str({ max: 2000, pattern: /^https:\/\/raw\.githubusercontent\.com\/\S+$/ })(v));
const examId: Check<string> = str({ max: 64, pattern: /^[a-z0-9][a-z0-9-]*$/ });

async function passedCount(cohort: string): Promise<number> {
  const { count, error } = await supabaseAdmin.from("exam_progress").select("user_id", { count: "exact", head: true }).eq("course_slug", cohort).eq("is_passed", true);
  if (error) throw error;
  return count ?? 0;
}

export async function PUT(req: NextRequest, props: { params: Promise<{ cohort: string }> }) {
  const params = await props.params;
  return handle(async () => {
    const actor = await writeActor(req);
    const cohort = cohortParam(params.cohort);
    const input = parseObject(await readBody(req), { lessonId: lesson, expectedOutcomeUrl: optional(outcome), examId: optional(examId) });
    if (input.lessonId === null) {
      const count = await passedCount(cohort);
      if (count) throw conflict(`${count} learner(s) have passed this exam, and passing it unlocked their advanced lessons. Move the exam to another lesson instead of removing it`);
      return curriculumWrite(req, cohort, (doc) => { const { examId: _drop, ...rest } = doc; return { ...rest, modules: clearExam(doc.modules) }; }, { actor, action: "exam.clear", allowProtected: true, resourceNote: { exam: null } });
    }
    const id = input.lessonId;
    const passed = input.examId ? await passedCount(cohort) : 0;
    return curriculumWrite(req, cohort, (doc) => {
      const chosen = chooseExamId({ requested: input.examId, stored: doc.examId, courseDefault: courseDefaultExam(cohort), exists: examIdExists });
      const current = doc.examId && examIdExists(doc.examId) ? doc.examId : courseDefaultExam(cohort);
      checkExamChange({ current, chosen, passed });
      return { ...doc, examId: chosen, modules: setExam(doc.modules, id, { graderExists: true, expectedOutcomeUrl: input.expectedOutcomeUrl }) };
    }, { actor, action: "exam.set", allowProtected: true, resourceNote: { exam: id, examId: input.examId ?? null } });
  });
}
