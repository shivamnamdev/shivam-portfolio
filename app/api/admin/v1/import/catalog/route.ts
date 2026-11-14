import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { badRequest, handle, ok } from "@/lib/adminApi/envelope";
import { limitWrites } from "@/lib/adminApi/request";
import { arrayOf, bool, optional, parseObject, readBody, slug } from "@/lib/adminApi/validate";
import { getRow, insertRow, updateRow, type DocKind } from "@/lib/adminApi/docStore";
import { writeAudit } from "@/lib/adminApi/audit";
import { planCatalogImport, type FileCourse } from "@/lib/adminApi/importCatalog";
import { activeCourses, isQaFixture } from "@/data/courses";

// One-off, owner only: copies the courses and cohorts of data/courses.ts into the admin portal (one course per cohort, same slug), published.
// Dry run unless `apply` is true. Repeatable: a second run reports "unchanged". A record an admin has edited is left alone unless `overwrite`.
// The report says whether a private link is set, never the link itself.
async function find(kind: DocKind, key: string) {
  try { return await getRow(kind, key); } catch (e) { if ((e as { status?: number }).status !== 404) throw e; return null; }
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const actor = await authorize(req, "import:run");
    const body = parseObject(await readBody(req), { slugs: optional(arrayOf(slug, { min: 1, max: 20 })), apply: optional(bool), overwrite: optional(bool) });
    const apply = body.apply === true;
    if (apply) await limitWrites(actor);

    const all = (activeCourses as unknown as FileCourse[]).filter((c) => !isQaFixture(c.slug));
    const unknown = (body.slugs ?? []).filter((s) => !all.some((c) => c.slug === s));
    if (unknown.length) throw badRequest(`Not in data/courses.ts: ${unknown.join(", ")}`, { slugs: "unknown course" });
    const entries = body.slugs ? all.filter((c) => body.slugs!.includes(c.slug)) : all;

    const courseRows = Object.fromEntries(await Promise.all(entries.map(async (c) => [c.slug, await find("course", c.slug)] as const)));
    const cohortRows = Object.fromEntries(await Promise.all(entries.map(async (c) => [c.slug, await find("cohort", c.slug)] as const)));
    const plans = planCatalogImport(entries, {
      courses: Object.fromEntries(Object.entries(courseRows).map(([k, r]) => [k, r ? r.doc : null])),
      cohorts: Object.fromEntries(Object.entries(cohortRows).map(([k, r]) => [k, r ? r.doc : null])),
    }, body.overwrite === true);

    const results = [];
    for (const p of plans) {
      let applied = false;
      const notes = [...p.notes];
      for (const [kind, part, row] of [["course", p.course, courseRows[p.slug]], ["cohort", p.cohort, cohortRows[p.slug]]] as const) {
        if (row && row.status !== "published" && part.action === "unchanged") notes.push(`${kind} is ${row.status} in the portal (publish it there)`);
        if (!apply || (part.action !== "create" && part.action !== "overwrite")) continue;
        const saved = row ? await updateRow(kind, p.slug, row.version, { doc: part.doc, status: "published" }, actor.id) : await insertRow(kind, p.slug, part.doc, actor.id, "published");
        await writeAudit({ actor, action: "import", resource: kind, resourceId: p.slug, before: row ? { version: row.version } : undefined, after: { version: saved.version, status: saved.status } });
        applied = true;
      }
      results.push({ slug: p.slug, course: p.course.action, cohort: p.cohort.action, applied, notes });
    }
    return ok({ dryRun: !apply, results });
  });
}
