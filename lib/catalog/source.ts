// lib/catalog/source.ts
// Which source a learner-facing surface reads: the data files (today's behaviour, the default) or the database the admin portal writes.
// One pure rule for every flag (PORTAL_CATALOG, PORTAL_LEARNING, PORTAL_ENGAGEMENT, PORTAL_COUPONS), so they all behave the same.
export type Source = "files" | "database";

// Only the exact word "database" (any case, spaces ignored) turns the database on. Anything else, including a typo or an empty value, is "files".
export const chooseSource = (flag: string | null | undefined): Source => (flag?.trim().toLowerCase() === "database" ? "database" : "files");

export type FallbackReason = "error" | "empty";

// Reads from the database when the flag says so; if that fails or returns nothing, the same request is answered from the files and the reason is
// reported (the caller logs one line, never a secret). A flag set to "files" never touches the database.
export async function readWithFallback<T>(
  source: Source,
  fromDatabase: () => Promise<T | null | undefined>,
  fromFiles: () => T,
  onFallback: (reason: FallbackReason, error?: unknown) => void,
): Promise<{ value: T; source: Source }> {
  if (source === "files") return { value: fromFiles(), source: "files" };
  try {
    const value = await fromDatabase();
    if (value === null || value === undefined) { onFallback("empty"); return { value: fromFiles(), source: "files" }; }
    return { value, source: "database" };
  } catch (error) {
    onFallback("error", error);
    return { value: fromFiles(), source: "files" };
  }
}
