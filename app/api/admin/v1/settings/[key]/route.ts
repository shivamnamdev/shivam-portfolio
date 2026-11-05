import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { handle, notFound, ok } from "@/lib/adminApi/envelope";
import { ifMatchVersion, limitWrites } from "@/lib/adminApi/request";
import { parseObject, readBody } from "@/lib/adminApi/validate";
import { assertSettingsConsistent, checkSettingValue, isSettingKey } from "@/lib/adminApi/settings";
import { insertRow, updateRow } from "@/lib/adminApi/docStore";
import { effective, savedSettings, settingView } from "@/lib/adminApi/engagementStore";
import { writeAudit } from "@/lib/adminApi/audit";

// Replaces one setting. The first save of a key needs no version; later saves send the version in If-Match.
export async function PUT(req: NextRequest, { params }: { params: { key: string } }) {
  return handle(async () => {
    const actor = await authorize(req, "settings:write");
    await limitWrites(actor);
    if (!isSettingKey(params.key)) throw notFound("setting not found");
    const key = params.key;
    const { rows, values } = await savedSettings();
    const existing = rows[key];
    const expected = existing ? ifMatchVersion(req) : 0;
    const { value: raw } = parseObject(await readBody(req), { value: (v: unknown) => (v === undefined ? { ok: false as const, message: "is required" } : { ok: true as const, value: v }) });
    const value = checkSettingValue(key, raw);
    assertSettingsConsistent(effective({ ...values, [key]: value }));
    const saved = existing
      ? await updateRow("setting", key, expected, { doc: { value } }, actor.id)
      : await insertRow("setting", key, { value }, actor.id, "published");
    await writeAudit({ actor, action: existing ? "update" : "create", resource: "setting", resourceId: key, before: settingView(key, existing), after: settingView(key, saved) });
    return ok(settingView(key, saved), existing ? 200 : 201);
  });
}
