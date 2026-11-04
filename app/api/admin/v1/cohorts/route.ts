import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { badRequest, handle, ok } from "@/lib/adminApi/envelope";
import { limitWrites, listParams } from "@/lib/adminApi/request";
import { parseObject, readBody } from "@/lib/adminApi/validate";
import { buildCohortDoc, checkPricing, cohortCreateShape, publicCohort, type Pricing } from "@/lib/adminApi/cohorts";
import { checkCohortAgainstCoupons } from "@/lib/adminApi/coupons";
import { getRow, insertRow, listRows, shape } from "@/lib/adminApi/docStore";
import { writeAudit } from "@/lib/adminApi/audit";

const view = (r: Parameters<typeof shape>[0]) => ({ ...shape(r), ...publicCohort(r.doc) });

export async function GET(req: NextRequest) {
  return handle(async () => {
    await authorize(req, "cohorts:read");
    const course = new URL(req.url).searchParams.get("courseSlug");
    const { rows, next } = await listRows("cohort", listParams(req), course ? (q) => q.eq("doc->>courseSlug", course) : undefined);
    return ok({ items: rows.map(view), nextCursor: next });
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const actor = await authorize(req, "cohorts:write");
    await limitWrites(actor);
    const input = parseObject(await readBody(req), cohortCreateShape);
    try { await getRow("course", input.courseSlug); } catch { throw badRequest("The course does not exist", { courseSlug: "no course with this slug" }); }
    checkPricing(input.pricing as Pricing);
    await checkCohortAgainstCoupons(input.slug, input.pricing as Pricing);
    const row = await insertRow("cohort", input.slug, buildCohortDoc(input), actor.id);
    await writeAudit({ actor, action: "create", resource: "cohort", resourceId: input.slug, after: view(row) });
    return ok(view(row), 201);
  });
}
