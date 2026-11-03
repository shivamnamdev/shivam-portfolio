// lib/streakDay.ts
// Calendar days for the daily streak (SCP-60). A "day" is the learner's own calendar day: the browser sends its IANA
// time zone (for example "Asia/Kolkata"); anything missing or unknown falls back to UTC. Pure, so it is unit-tested.

export function validTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || tz.length === 0 || tz.length > 64) return false;
  try { new Intl.DateTimeFormat("en-CA", { timeZone: tz }); return true; } catch { return false; }
}

const dayIn = (d: Date, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

export function streakDays(now: Date, tz?: unknown): { today: string; yesterday: string } {
  const zone = validTimeZone(tz) ? tz : "UTC";
  const today = dayIn(now, zone);
  // 24 h earlier can land two calendar days back across a daylight-saving change, so step back from the middle of today instead.
  const [y, m, d] = today.split("-").map(Number);
  const yesterday = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
  return { today, yesterday };
}
