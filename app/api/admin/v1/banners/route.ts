import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { handle, ok } from "@/lib/adminApi/envelope";
import { limitWrites, listParams } from "@/lib/adminApi/request";
import { parseObject, readBody } from "@/lib/adminApi/validate";
import { assertBanner, bannerCreateShape, bannerDefaults, cleanBanner } from "@/lib/adminApi/banners";
import { insertRow, listRows, shape } from "@/lib/adminApi/docStore";
import { assertCohortAudience, withoutUndefined } from "@/lib/adminApi/engagementStore";
import { writeAudit } from "@/lib/adminApi/audit";

export async function GET(req: NextRequest) {
  return handle(async () => {
    await authorize(req, "banners:read");
    const { rows, next } = await listRows("banner", listParams(req));
    return ok({ items: rows.map(shape), nextCursor: next });
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const actor = await authorize(req, "banners:write");
    await limitWrites(actor);
    const { slug, ...input } = parseObject(await readBody(req), bannerCreateShape);
    const doc = cleanBanner({ ...bannerDefaults, ...withoutUndefined(input) });
    assertBanner(doc);
    await assertCohortAudience(doc.audience);
    const row = await insertRow("banner", slug, doc as unknown as Record<string, unknown>, actor.id);
    await writeAudit({ actor, action: "create", resource: "banner", resourceId: slug, after: shape(row) });
    return ok(shape(row), 201);
  });
}
