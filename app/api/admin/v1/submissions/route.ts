import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { handle, ok } from "@/lib/adminApi/envelope";
import { listParams } from "@/lib/adminApi/request";
import { parseFilters } from "@/lib/adminApi/progress";
import { listSubmissions } from "@/lib/adminApi/progressStore";

// Read only: who submitted which lesson and when. The code itself is never in a list (see submissions/{id}).
export async function GET(req: NextRequest) {
  return handle(async () => {
    await authorize(req, "submissions:read");
    const { items, next } = await listSubmissions(listParams(req), parseFilters(new URL(req.url)));
    return ok({ items, nextCursor: next });
  });
}
