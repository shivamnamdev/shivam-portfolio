import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { badRequest, handle, ok, unprocessable } from "@/lib/adminApi/envelope";
import { ifMatchVersion, limitWrites } from "@/lib/adminApi/request";
import { parseObject, readBody } from "@/lib/adminApi/validate";
import { assertBanner, bannerUpdateShape, cleanBanner } from "@/lib/adminApi/banners";
import { deleteRow, getRow, shape, updateRow } from "@/lib/adminApi/docStore";
import { assertCohortAudience, slugParam, withoutUndefined } from "@/lib/adminApi/engagementStore";
import { writeAudit } from "@/lib/adminApi/audit";

type Ctx = { params: { slug: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  return handle(async () => { await authorize(req, "banners:read"); return ok(shape(await getRow("banner", slugParam(params.slug, "banner")))); });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const actor = await authorize(req, "banners:write");
    await limitWrites(actor);
    const slug = slugParam(params.slug, "banner");
    const version = ifMatchVersion(req);
    const change = withoutUndefined(parseObject(await readBody(req), bannerUpdateShape));
    if (!Object.keys(change).length) throw badRequest("Nothing to change");
    const before = await getRow("banner", slug);
    const doc = cleanBanner({ ...before.doc, ...change });
    assertBanner(doc);
    await assertCohortAudience(doc.audience);
    const updated = await updateRow("banner", slug, version, { doc: doc as unknown as Record<string, unknown> }, actor.id);
    await writeAudit({ actor, action: "update", resource: "banner", resourceId: slug, before: shape(before), after: shape(updated) });
    return ok(shape(updated));
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const actor = await authorize(req, "banners:write");
    await limitWrites(actor);
    const slug = slugParam(params.slug, "banner");
    const before = await getRow("banner", slug);
    if (before.status === "published") throw unprocessable("A published banner cannot be deleted. Unpublish or archive it first");
    await deleteRow("banner", slug);
    await writeAudit({ actor, action: "delete", resource: "banner", resourceId: slug, before: shape(before) });
    return ok({ deleted: slug });
  });
}
