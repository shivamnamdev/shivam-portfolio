import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { handle, ok } from "@/lib/adminApi/envelope";
import { listParams } from "@/lib/adminApi/request";
import { listEngagement } from "@/lib/adminApi/progressStore";

// Read only: time spent, current streak and last active day per learner, most time first. The cursor is a position in that order.
export async function GET(req: NextRequest) {
  return handle(async () => {
    await authorize(req, "engagement:read");
    const { items, next } = await listEngagement(listParams(req));
    return ok({ items, nextCursor: next });
  });
}
