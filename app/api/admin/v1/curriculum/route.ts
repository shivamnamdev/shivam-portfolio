import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { handle, ok } from "@/lib/adminApi/envelope";
import { listParams } from "@/lib/adminApi/request";
import { listRows } from "@/lib/adminApi/docStore";
import { view } from "@/lib/adminApi/curriculumStore";

export async function GET(req: NextRequest) {
  return handle(async () => {
    await authorize(req, "curriculum:read");
    const { rows, next } = await listRows("curriculum", listParams(req));
    return ok({ items: rows.map((r) => { const { modules: _m, published: _p, ...rest } = view(r); return rest; }), nextCursor: next });
  });
}
