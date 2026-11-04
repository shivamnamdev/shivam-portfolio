import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { handle, ok } from "@/lib/adminApi/envelope";
import { listParams } from "@/lib/adminApi/request";
import { searchLearners } from "@/lib/adminApi/learners";

// The picker behind "selected students" coupons: signed-up users by name or e-mail (read only, admin only).
export async function GET(req: NextRequest) {
  return handle(async () => {
    await authorize(req, "learners:read");
    const p = listParams(req);
    return ok({ items: await searchLearners(p.q, Math.min(p.limit, 50)) });
  });
}
