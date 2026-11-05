import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { handle, ok } from "@/lib/adminApi/envelope";
import { SETTING_KEYS } from "@/lib/adminApi/settings";
import { savedSettings, settingView } from "@/lib/adminApi/engagementStore";

export async function GET(req: NextRequest) {
  return handle(async () => {
    await authorize(req, "settings:read");
    const { rows } = await savedSettings();
    return ok({ items: SETTING_KEYS.map((k) => settingView(k, rows[k])) });
  });
}
