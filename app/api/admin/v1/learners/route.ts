import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { handle, ok } from "@/lib/adminApi/envelope";
import { listParams } from "@/lib/adminApi/request";
import { offsetCursor } from "@/lib/adminApi/progress";
import { directoryPage } from "@/lib/adminApi/learners";

// Signed-up users, newest first (read only, admin only): the directory screen and the picker behind "selected students" coupons.
// Each item has id, email and name, plus joinedAt, enrolments and status (enrolled or lead). The cursor is a position in that order.
export async function GET(req: NextRequest) {
  return handle(async () => {
    await authorize(req, "learners:read");
    const p = listParams(req);
    const { items, next } = await directoryPage(p.q, p.limit, offsetCursor(p.cursor));
    return ok({ items, nextCursor: next });
  });
}
