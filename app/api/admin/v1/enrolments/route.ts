import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { badRequest, handle, ok } from "@/lib/adminApi/envelope";
import { limitWrites, listParams } from "@/lib/adminApi/request";
import { parseObject, readBody, slug } from "@/lib/adminApi/validate";
import { grantShape } from "@/lib/adminApi/enrolments";
import { grant, listEnrolments } from "@/lib/adminApi/enrolmentStore";
import { writeAudit } from "@/lib/adminApi/audit";

export async function GET(req: NextRequest) {
  return handle(async () => {
    await authorize(req, "enrolments:read");
    const u = new URL(req.url);
    const cohortSlug = u.searchParams.get("cohortSlug");
    if (cohortSlug && !slug(cohortSlug).ok) throw badRequest("cohortSlug is not valid");
    const userId = u.searchParams.get("userId");
    if (userId && !/^user_[A-Za-z0-9]{1,60}$/.test(userId)) throw badRequest("userId is not valid");
    const { items, next } = await listEnrolments(listParams(req), { cohortSlug: cohortSlug || null, userId: userId || null });
    return ok({ items, nextCursor: next });
  });
}

// Manual enrolment (offline payment, scholarship). 409 when the learner is already in; the admin API grant is what revoke later treats as removable.
export async function POST(req: NextRequest) {
  return handle(async () => {
    const actor = await authorize(req, "enrolments:write");
    await limitWrites(actor);
    const input = parseObject(await readBody(req), grantShape);
    const saved = await grant(input, actor.label);
    await writeAudit({ actor, action: "grant", resource: "enrolment", resourceId: `${saved.userId}:${saved.cohortSlug}`, after: saved });
    return ok(saved, 201);
  });
}
