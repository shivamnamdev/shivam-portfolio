import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { handle, ok } from "@/lib/adminApi/envelope";
import { examAttemptId, getExamAttempt } from "@/lib/adminApi/examAttemptStore";

// One exam attempt with the learner's code and the improvement note. Owner and admin keys only (submissions:read-code), like assignment code.
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return handle(async () => {
    await authorize(req, "submissions:read-code");
    return ok(await getExamAttempt(examAttemptId(params.id)));
  });
}
