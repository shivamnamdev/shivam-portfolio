import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { handle, ok } from "@/lib/adminApi/envelope";
import { limitWrites } from "@/lib/adminApi/request";
import { deleteNotification, getNotification, idParam, readCount, view } from "@/lib/adminApi/notificationStore";
import { writeAudit } from "@/lib/adminApi/audit";

type Ctx = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    await authorize(req, "notifications:read");
    const id = idParam(params.id);
    const n = await getNotification(id);
    return ok({ ...view(n), readCount: await readCount(id) });   // how many have read it, never who
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const actor = await authorize(req, "notifications:write");
    await limitWrites(actor);
    const id = idParam(params.id);
    const before = await getNotification(id);
    await deleteNotification(id);
    await writeAudit({ actor, action: "delete", resource: "notification", resourceId: id, before: view(before) });
    return ok({ deleted: id });
  });
}
