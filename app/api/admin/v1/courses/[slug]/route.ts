import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { badRequest, handle, notFound, ok, unprocessable } from "@/lib/adminApi/envelope";
import { ifMatchVersion, limitWrites } from "@/lib/adminApi/request";
import { parseObject, readBody, slug as slugCheck } from "@/lib/adminApi/validate";
import { courseUpdateShape } from "@/lib/adminApi/courses";
import { deleteRow, getRow, shape, updateRow } from "@/lib/adminApi/docStore";
import { writeAudit } from "@/lib/adminApi/audit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Ctx = { params: { slug: string } };
const checkSlug = (s: string) => { if (!slugCheck(s).ok) throw notFound("course not found"); return s; };

export async function GET(req: NextRequest, { params }: Ctx) {
  return handle(async () => { await authorize(req, "courses:read"); return ok(shape(await getRow("course", checkSlug(params.slug)))); });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const actor = await authorize(req, "courses:write");
    await limitWrites(actor);
    const slug = checkSlug(params.slug);
    const version = ifMatchVersion(req);
    const input = parseObject(await readBody(req), courseUpdateShape);
    const change = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
    if (!Object.keys(change).length) throw badRequest("Nothing to change");
    const before = await getRow("course", slug);
    const updated = await updateRow("course", slug, version, { doc: { ...before.doc, ...change } }, actor.id);
    await writeAudit({ actor, action: "update", resource: "course", resourceId: slug, before: shape(before), after: shape(updated) });
    return ok(shape(updated));
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const actor = await authorize(req, "courses:write");
    await limitWrites(actor);
    const slug = checkSlug(params.slug);
    const before = await getRow("course", slug);
    const cohorts = await supabaseAdmin.from("content_docs").select("key", { count: "exact", head: true }).eq("kind", "cohort").eq("doc->>courseSlug", slug);
    if (cohorts.error) throw cohorts.error;
    if ((cohorts.count ?? 0) > 0) throw unprocessable("This course still has cohorts. Delete or move them first, or archive the course");
    const enrolments = await supabaseAdmin.from("user_enrollments").select("id", { count: "exact", head: true }).eq("course_slug", slug);
    if (enrolments.error) throw enrolments.error;
    if ((enrolments.count ?? 0) > 0) throw unprocessable("Learners are enrolled in this course. Archive it instead of deleting it");
    await deleteRow("course", slug);
    await writeAudit({ actor, action: "delete", resource: "course", resourceId: slug, before: shape(before) });
    return ok({ deleted: slug });
  });
}
