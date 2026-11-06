// lib/catalog/bannerView.ts
// Pure helpers of the banner bar in the browser: the countdown wording and the key under which a dismissal is remembered. No database, no network.

// "02:15:09" under a day, "2d 03:05:10" from a day up; null once the time has run out (a countdown never shows zero or a negative).
export function formatCountdown(totalSeconds: number | null | undefined): string | null {
  if (typeof totalSeconds !== "number" || !Number.isFinite(totalSeconds)) return null;
  const s = Math.floor(totalSeconds);
  if (s <= 0) return null;
  const d = Math.floor(s / 86400); const h = Math.floor((s % 86400) / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return `${d > 0 ? `${d}d ` : ""}${two(h)}:${two(m)}:${two(sec)}`;
}

// A dismissal belongs to one version of one banner: when the owner edits the banner (version changes) it shows again.
export const dismissKey = (slug: string, version: number): string => `shivam_banner_dismissed:${slug}:${version}`;

// Seconds left now, from what the server said when the page loaded and how long ago that was.
export const secondsLeft = (atLoad: number | null, loadedAtMs: number, nowMs: number): number | null =>
  atLoad === null ? null : atLoad - Math.max(0, Math.floor((nowMs - loadedAtMs) / 1000));
