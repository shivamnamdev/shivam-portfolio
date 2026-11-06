import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { handle } from "@/lib/adminApi/envelope";
import { limitWrites } from "@/lib/adminApi/request";
import { slugParam } from "@/lib/adminApi/engagementStore";
import { changeStatus } from "@/lib/adminApi/actions";

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  return handle(async () => {
    const actor = await authorize(req, "banners:write");
    await limitWrites(actor);
    return changeStatus("banner", slugParam(params.slug, "banner"), "unpublish", actor);
  });
}
