import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { handle, ok } from "@/lib/adminApi/envelope";
import { getSubmission, idParam } from "@/lib/adminApi/progressStore";

// One submission with its code. Owner and admin keys only (submissions:read-code): a read-only staff key can list but not read student code.
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return handle(async () => {
    await authorize(req, "submissions:read-code");
    return ok(await getSubmission(idParam(params.id)));
  });
}
