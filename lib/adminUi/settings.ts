// lib/adminUi/settings.ts
// Pure helpers for the Settings screen: what each of the four settings looks like and how a typed value becomes the API value. A unit test runs
// the same inputs through the server's own checks, so these hints cannot drift from the rules.
export type SettingKey = "announcement-email-cap" | "daily-email-cap" | "support-phone" | "support-email";
export type SettingMeta = { key: SettingKey; label: string; kind: "number" | "text"; clearable: boolean; hint: string };

export const SETTING_META: SettingMeta[] = [
  { key: "announcement-email-cap", label: "Most people one announcement e-mail may reach", kind: "number", clearable: false, hint: "1 to 200. Cannot be higher than the daily limit." },
  { key: "daily-email-cap", label: "Most e-mails the site sends in one day, in total", kind: "number", clearable: false, hint: "1 to 500. Protects the Gmail account; the contact form uses the same budget." },
  { key: "support-phone", label: "Support phone number", kind: "text", clearable: true, hint: "For example +91 98765 43210. Empty it to remove." },
  { key: "support-email", label: "Support e-mail address", kind: "text", clearable: true, hint: "Shown for help. Empty it to remove." },
];
export const isSettingKey = (k: string): k is SettingKey => SETTING_META.some((m) => m.key === k);

const RANGE: Record<"announcement-email-cap" | "daily-email-cap", [number, number]> = { "announcement-email-cap": [1, 200], "daily-email-cap": [1, 500] };
const PHONE = /^\+?[0-9][0-9 ()-]{5,18}[0-9]$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// text -> value for the API, or a message. An empty box means "remove" (null) for the two clearable text settings, and is an error for the numbers.
export function parseSetting(key: SettingKey, text: string): { ok: true; value: number | string | null } | { ok: false; message: string } {
  const s = text.trim();
  if (key === "announcement-email-cap" || key === "daily-email-cap") {
    const [min, max] = RANGE[key];
    if (!s) return { ok: false, message: "Enter a whole number" };
    const n = Number(s);
    if (!Number.isInteger(n) || n < min || n > max) return { ok: false, message: `Enter a whole number from ${min} to ${max}` };
    return { ok: true, value: n };
  }
  if (!s) return { ok: true, value: null };
  if (key === "support-phone") return s.length <= 20 && PHONE.test(s) ? { ok: true, value: s } : { ok: false, message: "Use a phone number such as +91 98765 43210" };
  return s.length <= 254 && EMAIL.test(s) ? { ok: true, value: s.toLowerCase() } : { ok: false, message: "Use an e-mail address such as help@example.com" };
}

// The cross-setting rule the server enforces (422): one announcement may not be allowed to reach more people than the whole day allows.
export function capsProblem(announcement: number, daily: number): string | null {
  return announcement > daily ? "The announcement limit cannot be higher than the daily limit" : null;
}
export const displayValue = (v: unknown): string => (v === null || v === undefined || v === "" ? "not set" : String(v));
