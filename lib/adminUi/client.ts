// lib/adminUi/client.ts
// Pure helpers for the admin screens (no React, no network): reading the API envelope, deciding what a failure means for the screen, query strings,
// the If-Match header and relative times. The screens hold no business rule of their own; the server answers are the rules.

export type Failure = { status: number; code: string; message: string; fields?: Record<string, string> };
export type ApiResult<T> = { ok: true; data: T } | { ok: false; failure: Failure };

// Turns an HTTP status and parsed JSON body into a result. Anything that is not the documented envelope becomes a plain "bad_response".
export function parseEnvelope<T>(status: number, body: unknown): ApiResult<T> {
  if (body && typeof body === "object") {
    const b = body as { success?: unknown; data?: unknown; error?: { code?: unknown; message?: unknown; fields?: unknown } };
    if (b.success === true && status >= 200 && status < 300) return { ok: true, data: b.data as T };
    if (b.success === false && b.error && typeof b.error.message === "string") {
      const fields = b.error.fields && typeof b.error.fields === "object" ? Object.fromEntries(Object.entries(b.error.fields as Record<string, unknown>).filter(([, v]) => typeof v === "string")) as Record<string, string> : undefined;
      return { ok: false, failure: { status, code: typeof b.error.code === "string" ? b.error.code : "error", message: b.error.message, ...(fields && Object.keys(fields).length ? { fields } : {}) } };
    }
  }
  return { ok: false, failure: { status, code: "bad_response", message: "The server gave an answer this screen does not understand" } };
}
export const networkFailure = (): Failure => ({ status: 0, code: "network", message: "Could not reach the server. Check your connection and try again" });

export type FailureAction = "sign-in" | "forbidden" | "conflict" | "fix" | "wait" | "retry" | "show";
export function failureAction(f: Failure): FailureAction {
  if (f.status === 401) return "sign-in";
  if (f.status === 403) return "forbidden";
  if (f.status === 409 || f.status === 428) return "conflict";
  if (f.status === 400 || f.status === 422) return "fix";
  if (f.status === 429) return "wait";
  if (f.status === 0 || f.status >= 500) return "retry";
  return "show";
}

// What the owner reads. Server messages are already short and safe; a server fault or a lost connection gets a plain instruction instead.
export function failureText(f: Failure): string {
  switch (failureAction(f)) {
    case "sign-in": return "Your session ended. Sign in again";
    case "forbidden": return "You do not have permission to do this";
    case "retry": return f.status === 0 ? f.message : "Something went wrong on the server. Nothing was changed; try again";
    case "conflict": return f.status === 428 ? "Reload the page and try again (the version is missing)" : f.message;
    default: return f.message;
  }
}

export const fieldErrorLines = (f: Failure): string[] => Object.entries(f.fields ?? {}).map(([k, v]) => `${k}: ${v}`);

// ?a=1&b=2 from the values that are set (empty, null and undefined are left out). Values are encoded.
export function queryString(params: Record<string, string | number | boolean | null | undefined>): string {
  const parts = Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== "").map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

export const ifMatchHeader = (version: number): Record<string, string> => ({ "If-Match": String(version) });

// "just now", "5 minutes ago", "3 hours ago", "2 days ago", then the date. Future or bad times show the date text unchanged.
export function timeAgo(iso: string, now: Date): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const s = Math.floor((now.getTime() - t) / 1000);
  if (s < 0) return iso.slice(0, 10);
  if (s < 60) return "just now";
  const unit = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"} ago`;
  if (s < 3600) return unit(Math.floor(s / 60), "minute");
  if (s < 86400) return unit(Math.floor(s / 3600), "hour");
  if (s < 30 * 86400) return unit(Math.floor(s / 86400), "day");
  return iso.slice(0, 10);
}
