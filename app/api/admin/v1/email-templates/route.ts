import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { handle, ok } from "@/lib/adminApi/envelope";
import { TEMPLATE_KEYS } from "@/lib/adminApi/emailTemplates";
import { savedTemplates, templateView } from "@/lib/adminApi/engagementStore";

export async function GET(req: NextRequest) {
  return handle(async () => {
    await authorize(req, "templates:read");
    const rows = await savedTemplates();
    return ok({ items: TEMPLATE_KEYS.map((k) => templateView(k, rows[k])) });
  });
}
