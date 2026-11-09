import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { handle, notFound } from "@/lib/adminApi/envelope";
import { limitWrites } from "@/lib/adminApi/request";
import { slug as slugCheck } from "@/lib/adminApi/validate";
import { changeStatus } from "@/lib/adminApi/actions";

export async function POST(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  return handle(async () => {
    const actor = await authorize(req, "cohorts:write");
    await limitWrites(actor);
    if (!slugCheck(params.slug).ok) throw notFound("cohort not found");
    return changeStatus("cohort", params.slug, "archive", actor);
  });
}
