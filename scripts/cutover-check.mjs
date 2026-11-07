#!/usr/bin/env node
// scripts/cutover-check.mjs
// Read-only check before turning a PORTAL_* flag to "database" (phase 6c). Counts rows only, never prints a key or a row.
//   node scripts/cutover-check.mjs                       all four flags
//   node scripts/cutover-check.mjs PORTAL_CATALOG ...    only those flags
//   node scripts/cutover-check.mjs --include-drafts      a rehearsal: draft documents count as if they were published (nothing is changed)
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the environment or from .env.local. Exit code 0 when every requested flag is ready, 1 otherwise, 2 on a read error.
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { FLAGS, lines, readiness } from "./cutover-rules.mjs";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split("\n")) {
    const m = raw.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (environment or .env.local)."); process.exit(2); }
const args = process.argv.slice(2);
const includeDrafts = args.includes("--include-drafts");
const asked = args.filter((a) => a !== "--include-drafts");
const bad = asked.filter((f) => !FLAGS.includes(f));
if (bad.length) { console.error(`Unknown flag(s): ${bad.join(", ")}. Known: ${FLAGS.join(", ")}`); process.exit(2); }

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const fail = (what, error) => { console.error(`Could not read ${what}: ${String(error?.message ?? error).slice(0, 120)}`); process.exit(2); };

const docs = async (kind) => {
  const { data, error } = await db.from("content_docs").select("key, doc").eq("kind", kind).in("status", includeDrafts ? ["draft", "published"] : ["published"]).limit(2000);
  if (error) fail(`${kind} documents`, error);
  return data ?? [];
};
const [courses, cohorts, curricula] = await Promise.all([docs("course"), docs("cohort"), docs("curriculum")]);
const courseKeys = new Set(courses.map((c) => c.key));
const curriculumKeys = new Set(curricula.map((c) => c.key));

const { data: enrolled, error: eErr } = await db.from("user_enrollments").select("course_slug").limit(20000);
if (eErr) fail("enrolments", eErr);
const enrolledSlugs = new Set((enrolled ?? []).map((r) => r.course_slug));

const hasPrice = (p) => p && ((p.kind === "single" && p.inr && Number(p.inr.amount) > 0) || (p.kind === "plans" && Array.isArray(p.plans) && p.plans.length > 0 && p.plans.every((x) => Number(x?.price?.amount) > 0)));
const plansCohorts = cohorts.filter((c) => c.doc?.pricing?.kind === "plans").length;

const planProbe = await db.from("user_enrollments").select("plan_id").limit(1);
const planIdColumn = !planProbe.error;
if (planProbe.error && planProbe.error.code !== "42703" && planProbe.error.code !== "PGRST204") fail("the plan_id column", planProbe.error);

const nProbe = await db.from("notifications").select("id", { head: true, count: "exact" }).limit(1);
const rProbe = await db.from("notification_reads").select("notification_id", { head: true, count: "exact" }).limit(1);
const { count: activeCoupons, error: cErr } = await db.from("coupons").select("code", { head: true, count: "exact" }).eq("active", true).gt("expires_at", new Date().toISOString());
if (cErr) fail("coupons", cErr);

const results = readiness({
  publishedCourses: courses.length, publishedCohorts: cohorts.length,
  cohortsWithPublishedCourse: cohorts.filter((c) => courseKeys.has(String(c.doc?.courseSlug))).length,
  cohortsWithEnrolmentsMissingCurriculum: cohorts.filter((c) => enrolledSlugs.has(c.key) && !curriculumKeys.has(c.key)).map((c) => c.key),
  publishedCurricula: curricula.length, plansCohorts, planIdColumn, notificationTables: !nProbe.error && !rProbe.error,
  activeCoupons: activeCoupons ?? 0, cohortsWithoutPrice: cohorts.filter((c) => !hasPrice(c.doc?.pricing)).map((c) => c.key),
}, asked.length ? asked : FLAGS);
if (includeDrafts) console.log("(rehearsal: draft documents are counted; nothing is live until they are published)");
console.log(lines(results).join("\n"));
process.exit(results.every((r) => r.ready) ? 0 : 1);
