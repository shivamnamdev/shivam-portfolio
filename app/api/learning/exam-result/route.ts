// POST /api/learning/exam-result  ->  410 Gone
// Exam scores used to be computed in the browser and posted here, which let anyone post a pass.
// Grading now happens in POST /api/learning/exam-grade, which runs the learner's code on the server.
import { fail } from "@/lib/learnerApi";

export async function POST() {
  return fail(410, "Exam scores are graded on the server now (POST /api/learning/exam-grade)");
}
