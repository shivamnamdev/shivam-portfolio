import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { handle, notFound, ok } from "@/lib/adminApi/envelope";
import { limitWrites } from "@/lib/adminApi/request";
import { slug as slugCheck } from "@/lib/adminApi/validate";
import { getRow, shape, updateRow } from "@/lib/adminApi/docStore";
import { publicCohort } from "@/lib/adminApi/cohorts";
import { writeAudit } from "@/lib/adminApi/audit";

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  return handle(async () => {
    const actor = await authorize(req, "cohorts:write");
    await limitWrites(actor);
    if (!slugCheck(params.slug).ok) throw notFound("cohort not found");
    const before = await getRow("cohort", params.slug);
    const updated = await updateRow("cohort", params.slug, before.version, { doc: { ...before.doc, enrollmentClosed: false } }, actor.id);
    await writeAudit({ actor, action: "open-enrolment", resource: "cohort", resourceId: params.slug, before: { enrollmentClosed: before.doc.enrollmentClosed }, after: { enrollmentClosed: false } });
    return ok({ ...shape(updated), ...publicCohort(updated.doc) });
  });
}
