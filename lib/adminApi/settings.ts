// lib/adminApi/settings.ts
// Site settings: a fixed list of typed keys (content_docs kind 'setting', key = the kebab-case name, doc = { value }). Anything not in the list
// is refused, so a typo can never create a setting nobody reads. A key that was never saved reads as its default.
import { badRequest, unprocessable } from "./envelope";
import { email, int, str, type Check } from "./validate";

type Definition = { check: Check<unknown>; default: number | string | null; nullable: boolean; description: string };

const phone: Check<string> = (v) => {
  const s = str({ max: 20, pattern: /^\+?[0-9][0-9 ()-]{5,18}[0-9]$/ })(v);
  return s.ok ? s : { ok: false, message: "must be a phone number such as +91 98765 43210" };
};

export const SETTINGS: Record<string, Definition> = {
  "announcement-email-cap": { check: int({ min: 1, max: 200 }), default: 50, nullable: false, description: "Most learners one announcement e-mail may reach" },
  "daily-email-cap": { check: int({ min: 1, max: 500 }), default: 200, nullable: false, description: "Most e-mails the site sends in one day, in total (Gmail limit protection)" },
  "support-phone": { check: phone, default: null, nullable: true, description: "Phone number shown for help" },
  "support-email": { check: email, default: null, nullable: true, description: "E-mail address shown for help" },
};
export const SETTING_KEYS = Object.keys(SETTINGS);
export const isSettingKey = (k: string): boolean => Object.prototype.hasOwnProperty.call(SETTINGS, k);

export function checkSettingValue(key: string, value: unknown): unknown {
  const def = SETTINGS[key];
  if (value === null) {
    if (!def.nullable) throw badRequest("Some fields are not valid", { value: "is required" });
    return null;
  }
  const r = def.check(value);
  if (!r.ok) throw badRequest("Some fields are not valid", { value: r.message });
  return r.value;
}

export type Effective = Record<string, number | string | null>;
// Effective values: what is saved, or the default.
export function effectiveSettings(saved: Record<string, unknown>): Effective {
  const out: Effective = {};
  for (const [k, d] of Object.entries(SETTINGS)) out[k] = k in saved ? (saved[k] as number | string | null) : d.default;
  return out;
}

// S2: one announcement may not be allowed to reach more people than the whole day allows.
export function assertSettingsConsistent(e: Effective): void {
  if ((e["announcement-email-cap"] as number) > (e["daily-email-cap"] as number)) {
    throw unprocessable("announcement-email-cap cannot be higher than daily-email-cap");
  }
}
