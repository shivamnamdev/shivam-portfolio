import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { handle, notFound, ok } from "@/lib/adminApi/envelope";
import { slug as slugCheck } from "@/lib/adminApi/validate";
import { getRow } from "@/lib/adminApi/docStore";

// The only place the private WhatsApp and live-class links are returned (permission cohorts:links).
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  return handle(async () => {
    await authorize(req, "cohorts:links");
    if (!slugCheck(params.slug).ok) throw notFound("cohort not found");
    const row = await getRow("cohort", params.slug);
    const priv = (row.doc.private ?? {}) as { whatsappLink?: string; liveLink?: string };
    return ok({ whatsappLink: priv.whatsappLink ?? "", liveLink: priv.liveLink ?? "" });
  });
}
