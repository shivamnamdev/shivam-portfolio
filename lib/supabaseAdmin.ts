// lib/supabaseAdmin.ts
// Server-only Supabase client using the service-role key. Import ONLY from route handlers
// and server components — never from 'use client' files.
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

if (typeof window !== "undefined") {
  throw new Error("lib/supabaseAdmin must not be imported in the browser.");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  // Keeps existing deployments working; privileged writes stay subject to the anon RLS policies.
  // Required before applying docs/SUPABASE_HARDENING.md.
  console.warn("SUPABASE_SERVICE_ROLE_KEY is not set — server writes fall back to the anon client.");
}

export const supabaseAdmin: SupabaseClient =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : supabase;
