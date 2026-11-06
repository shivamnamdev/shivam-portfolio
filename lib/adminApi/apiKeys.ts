// lib/adminApi/apiKeys.ts
// Admin API keys: `tmk_<id>_<secret>`. Only a SHA-256 hash of the secret is stored; the secret is shown once at creation.
// The secret is 32 random bytes, so a fast hash is enough (it cannot be guessed or looked up in a table of common passwords).
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const randomId = (n: number) => Array.from(randomBytes(n), (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join("");
export const hashSecret = (secret: string) => createHash("sha256").update(secret).digest("hex");

export function newApiKey(): { id: string; token: string; hash: string } {
  const id = randomId(12);
  const secret = randomBytes(32).toString("base64url");
  return { id, token: `tmk_${id}_${secret}`, hash: hashSecret(secret) };
}

export function parseApiKey(token: string | null | undefined): { id: string; secret: string } | null {
  const m = /^tmk_([a-z0-9]{12})_([A-Za-z0-9_-]{43})$/.exec((token ?? "").trim());
  return m ? { id: m[1], secret: m[2] } : null;
}

export function secretMatches(secret: string, storedHash: string): boolean {
  const a = Buffer.from(hashSecret(secret), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
