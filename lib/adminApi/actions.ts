// lib/adminApi/actions.ts
// Status changes shared by courses and cohorts: publish, unpublish, archive, restore (allowed transitions in courses.ts).
import { ok, unprocessable } from "./envelope";
import { COURSE_ACTIONS } from "./courses";
import { getRow, shape, updateRow, type DocKind } from "./docStore";
import { publicCohort } from "./cohorts";
import { writeAudit } from "./audit";
import type { Actor } from "./guard";

export async function changeStatus(kind: DocKind, slug: string, action: string, actor: Actor) {
  const rule = COURSE_ACTIONS[action];
  const row = await getRow(kind, slug);
  if (!rule.from.includes(row.status as never)) throw unprocessable(`A ${row.status} ${kind} cannot be ${action === "publish" ? "published" : action === "unpublish" ? "unpublished" : action === "archive" ? "archived" : "restored"}`);
  const updated = await updateRow(kind, slug, row.version, { status: rule.to }, actor.id);
  const view = (r: typeof row) => ({ ...shape(r), ...(kind === "cohort" ? publicCohort(r.doc) : {}) });
  await writeAudit({ actor, action, resource: kind, resourceId: slug, before: { status: row.status, version: row.version }, after: { status: updated.status, version: updated.version } });
  return ok(view(updated));
}
