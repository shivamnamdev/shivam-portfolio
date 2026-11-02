// lib/supabaseAdmin.ts
// Server-only Supabase client using the service-role key. Import ONLY from route handlers
// and server components — never from 'use client' files.
import { createClient, SupabaseClient } from "@supabase/supabase-js";

if (typeof window !== "undefined") {
  throw new Error("lib/supabaseAdmin must not be imported in the browser.");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const MISSING = "SUPABASE_SERVICE_ROLE_KEY is not set: server routes cannot reach the database. Add it in the environment variables and redeploy.";

if (!serviceRoleKey) console.error(MISSING);

// Without the key there is no safe fallback (the tables are locked for the public key, so a fallback client
// would only fail with confusing empty results). Importing never throws, so builds and previews still work;
// the first use fails with a clear message in the logs.
export const supabaseAdmin: SupabaseClient =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : (new Proxy({}, { get() { throw new Error(MISSING); } }) as SupabaseClient);
