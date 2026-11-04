import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { badRequest, handle, ok } from "@/lib/adminApi/envelope";
import { limitWrites } from "@/lib/adminApi/request";
import { arrayOf, bool, optional, parseObject, readBody, slug } from "@/lib/adminApi/validate";
import { getRow, insertRow, updateRow } from "@/lib/adminApi/docStore";
import { writeAudit } from "@/lib/adminApi/audit";
import { planCurriculumImport } from "@/lib/adminApi/importCurriculum";
import type { CurriculumDoc } from "@/lib/adminApi/curriculum";
import { courseCurriculumMap } from "@/data/learning-content";

// One-off, owner only: copies data/learning-content.ts into the curriculum tables. Dry run unless `apply` is true. Repeatable: a second run reports "unchanged".
export async function POST(req: NextRequest) {
  return handle(async () => {
    const actor = await authorize(req, "import:run");
    const body = parseObject(await readBody(req), { cohorts: optional(arrayOf(slug, { min: 1, max: 20 })), apply: optional(bool), overwrite: optional(bool) });
    const apply = body.apply === true;
    if (apply) await limitWrites(actor);
    const names = body.cohorts ?? Object.keys(courseCurriculumMap);
    const unknown = names.filter((n) => !courseCurriculumMap[n]);
    if (unknown.length) throw badRequest(`Not in data/learning-content.ts: ${unknown.join(", ")}`, { cohorts: "unknown cohort" });

    const results = [];
    for (const cohort of names) {
      let row = null;
      try { row = await getRow("curriculum", cohort); } catch (e) { if ((e as { status?: number }).status !== 404) throw e; }
      const plan = planCurriculumImport(cohort, courseCurriculumMap[cohort], row ? (row.doc as unknown as CurriculumDoc) : null, body.overwrite === true);
      let applied = false;
      if (apply && (plan.action === "create" || plan.action === "overwrite")) {
        const doc = plan.doc as unknown as Record<string, unknown>;
        const saved = row ? await updateRow("curriculum", cohort, row.version, { doc, status: "published" }, actor.id) : await insertRow("curriculum", cohort, doc, actor.id);
        const final = row ? saved : await updateRow("curriculum", cohort, saved.version, { status: "published" }, actor.id);
        await writeAudit({ actor, action: "import", resource: "curriculum", resourceId: cohort, before: row ? { version: row.version } : undefined, after: { version: final.version, ...plan.counts, dropped: plan.dropped.length } });
        applied = true;
      }
      results.push({ cohort, action: plan.action, applied, counts: plan.counts, existing: plan.existing, dropped: plan.dropped });
    }
    return ok({ dryRun: !apply, results });
  });
}
