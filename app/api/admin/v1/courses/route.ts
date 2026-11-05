import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { handle, ok } from "@/lib/adminApi/envelope";
import { limitWrites, listParams } from "@/lib/adminApi/request";
import { parseObject, readBody } from "@/lib/adminApi/validate";
import { courseCreateShape } from "@/lib/adminApi/courses";
import { insertRow, listRows, shape } from "@/lib/adminApi/docStore";
import { writeAudit } from "@/lib/adminApi/audit";

export async function GET(req: NextRequest) {
  return handle(async () => {
    await authorize(req, "courses:read");
    const { rows, next } = await listRows("course", listParams(req));
    return ok({ items: rows.map(shape), nextCursor: next });
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const actor = await authorize(req, "courses:write");
    await limitWrites(actor);
    const { slug, ...doc } = parseObject(await readBody(req), courseCreateShape);
    const clean = Object.fromEntries(Object.entries(doc).filter(([, v]) => v !== undefined));
    const row = await insertRow("course", slug, clean, actor.id);
    await writeAudit({ actor, action: "create", resource: "course", resourceId: slug, after: shape(row) });
    return ok(shape(row), 201);
  });
}
