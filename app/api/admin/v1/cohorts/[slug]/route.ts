import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { badRequest, handle, notFound, ok, unprocessable } from "@/lib/adminApi/envelope";
import { ifMatchVersion, limitWrites } from "@/lib/adminApi/request";
import { parseObject, readBody, slug as slugCheck } from "@/lib/adminApi/validate";
import { buildCohortDoc, checkPricing, cohortUpdateShape, publicCohort, type Pricing } from "@/lib/adminApi/cohorts";
import { checkCohortAgainstCoupons } from "@/lib/adminApi/coupons";
import { deleteRow, getRow, shape, updateRow } from "@/lib/adminApi/docStore";
import { writeAudit } from "@/lib/adminApi/audit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Ctx = { params: { slug: string } };
const checkSlug = (s: string) => { if (!slugCheck(s).ok) throw notFound("cohort not found"); return s; };
const view = (r: Parameters<typeof shape>[0]) => ({ ...shape(r), ...publicCohort(r.doc) });
const planIds = (p?: Pricing) => (p && p.kind === "plans" ? p.plans.map((x) => x.id) : []);

export async function GET(req: NextRequest, { params }: Ctx) {
  return handle(async () => { await authorize(req, "cohorts:read"); return ok(view(await getRow("cohort", checkSlug(params.slug)))); });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const actor = await authorize(req, "cohorts:write");
    await limitWrites(actor);
    const slug = checkSlug(params.slug);
    const version = ifMatchVersion(req);
    const input = parseObject(await readBody(req), cohortUpdateShape);
    if (!Object.values(input).some((v) => v !== undefined)) throw badRequest("Nothing to change");
    const before = await getRow("cohort", slug);
    if (input.pricing) {
      const next = input.pricing as Pricing;
      checkPricing(next);
      const removed = planIds(before.doc.pricing as Pricing).filter((id) => !planIds(next).includes(id));
      if (removed.length) {
        const used = await supabaseAdmin.from("user_enrollments").select("id", { count: "exact", head: true }).eq("course_slug", slug).in("plan_id", removed);
        if (used.error && used.error.code !== "42703") throw used.error;   // 42703: plan_id column not added yet, nothing can be using a plan
        if (!used.error && (used.count ?? 0) > 0) throw unprocessable(`Learners bought the plan(s) ${removed.join(", ")}. Keep the plan, or hide it by closing enrolment`);
      }
      await checkCohortAgainstCoupons(slug, next);
    }
    const updated = await updateRow("cohort", slug, version, { doc: buildCohortDoc(input, before.doc) }, actor.id);
    await writeAudit({ actor, action: "update", resource: "cohort", resourceId: slug, before: view(before), after: view(updated) });
    return ok(view(updated));
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const actor = await authorize(req, "cohorts:write");
    await limitWrites(actor);
    const slug = checkSlug(params.slug);
    const before = await getRow("cohort", slug);
    const enrolments = await supabaseAdmin.from("user_enrollments").select("id", { count: "exact", head: true }).eq("course_slug", slug);
    if (enrolments.error) throw enrolments.error;
    if ((enrolments.count ?? 0) > 0) throw unprocessable("Learners are enrolled in this cohort. Close enrolment, unlist or archive it instead of deleting it");
    await deleteRow("cohort", slug);
    await writeAudit({ actor, action: "delete", resource: "cohort", resourceId: slug, before: view(before) });
    return ok({ deleted: slug });
  });
}
