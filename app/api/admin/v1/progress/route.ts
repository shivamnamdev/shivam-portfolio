import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { handle, ok } from "@/lib/adminApi/envelope";
import { listParams } from "@/lib/adminApi/request";
import { parseFilters } from "@/lib/adminApi/progress";
import { listProgress } from "@/lib/adminApi/progressStore";

// Read only: one row per enrolment with videos and assignments done, the course totals and a percent. No code, no payment or link fields.
export async function GET(req: NextRequest) {
  return handle(async () => {
    await authorize(req, "progress:read");
    const { items, next } = await listProgress(listParams(req), parseFilters(new URL(req.url)));
    return ok({ items, nextCursor: next });
  });
}
