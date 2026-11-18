import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { handle, ok } from "@/lib/adminApi/envelope";
import { listParams } from "@/lib/adminApi/request";
import { parseFilters } from "@/lib/adminApi/progress";
import { listExamAttempts } from "@/lib/adminApi/examAttemptStore";

// Read only: every exam submission (who, which cohort, attempt, score, passed, e-mail status), newest first. Never the code or the notes (see exam-attempts/{id}).
export async function GET(req: NextRequest) {
  return handle(async () => {
    await authorize(req, "submissions:read");
    const { items, next } = await listExamAttempts(listParams(req), parseFilters(new URL(req.url)));
    return ok({ items, nextCursor: next });
  });
}
