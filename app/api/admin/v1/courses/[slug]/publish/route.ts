import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { handle, notFound } from "@/lib/adminApi/envelope";
import { limitWrites } from "@/lib/adminApi/request";
import { slug as slugCheck } from "@/lib/adminApi/validate";
import { changeStatus } from "@/lib/adminApi/actions";

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  return handle(async () => {
    const actor = await authorize(req, "courses:write");
    await limitWrites(actor);
    if (!slugCheck(params.slug).ok) throw notFound("course not found");
    return changeStatus("course", params.slug, "publish", actor);
  });
}
