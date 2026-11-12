import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { badRequest, handle, ok } from "@/lib/adminApi/envelope";
import { limitWrites } from "@/lib/adminApi/request";
import { assertRevokeAllowed } from "@/lib/adminApi/enrolments";
import { enrolmentKey, getEnrolment, idParam, revoke, wasGrantedByAdmin } from "@/lib/adminApi/enrolmentStore";
import { writeAudit } from "@/lib/adminApi/audit";

type Ctx = { params: Promise<{ id: string }> };

// Removes the enrolment. One the admin API granted goes freely; any other (paid, coupon, older manual) is refused unless ?force=true from the owner session.
export async function DELETE(req: NextRequest, props: Ctx) {
  const params = await props.params;
  return handle(async () => {
    const actor = await authorize(req, "enrolments:write");
    await limitWrites(actor);
    const id = idParam(params.id);
    const f = new URL(req.url).searchParams.get("force");
    if (f !== null && f !== "true" && f !== "false") throw badRequest("force must be true or false");
    const force = f === "true";
    const before = await getEnrolment(id);
    const adminGranted = await wasGrantedByAdmin(before);
    assertRevokeAllowed({ adminGranted, force, role: actor.role });
    await revoke(before);
    await writeAudit({ actor, action: "revoke", resource: "enrolment", resourceId: enrolmentKey(before), before, after: { removed: true, forced: !adminGranted } });
    return ok({ revoked: id });
  });
}
