// lib/catalog/catalog.ts
// Server-only reader behind the course list and the sales pages. PORTAL_CATALOG=files (default) answers from data/courses.ts exactly as before;
// PORTAL_CATALOG=database builds the same objects from the published courses and cohorts of the admin portal, falling back to the files for that
// request if the database cannot be read or has nothing published. Never returns the private links of a database cohort (slice 5b guards links).
import "server-only";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { activeCourses, isQaFixture } from "@/data/courses";
import { savedSettings } from "@/lib/adminApi/engagementStore";
import { CATALOG_TAG } from "./tags";
import { chooseSource, readWithFallback, type Source } from "./source";
import { buildCourse, FALLBACK_WHATSAPP_NUMBER, whatsappNumber, type CatalogCourse, type CohortView, type CourseView, type FileEntry } from "./mapping";

const flags = () => ({ catalog: chooseSource(process.env.PORTAL_CATALOG), coupons: chooseSource(process.env.PORTAL_COUPONS) });
const fileEntries = (): CatalogCourse[] => (activeCourses as unknown as CatalogCourse[]).map((c) => ({ ...c, listed: (c as { listed?: boolean }).listed !== false }));
const log = (what: string, reason: string) => console.error(`catalog: ${what} (${reason}), answering from the data files`);

type Row = { kind: string; key: string; doc: Record<string, unknown> };

async function readDatabase(priceFrom: Source): Promise<CatalogCourse[] | null> {
  const { data, error } = await supabaseAdmin.from("content_docs").select("kind, key, doc").in("kind", ["course", "cohort"]).eq("status", "published").limit(1000);
  if (error) throw error;
  const rows = (data ?? []) as Row[];
  const courses = new Map(rows.filter((r) => r.kind === "course").map((r) => [r.key, { slug: r.key, title: r.doc.title, summary: r.doc.summary, pitch: r.doc.pitch } as CourseView]));
  const files = new Map(fileEntries().map((f) => [f.slug, f as unknown as FileEntry]));
  const built: CatalogCourse[] = [];
  for (const r of rows.filter((x) => x.kind === "cohort")) {
    const d = r.doc;
    const course = courses.get(String(d.courseSlug));
    if (!course) continue;   // a cohort whose course is not published is not shown
    // The named fields only: the cohort's `private` part (links) is never read here.
    const cohort: CohortView = {
      slug: r.key, courseSlug: String(d.courseSlug), title: String(d.title ?? course.title), statusText: d.statusText as string | undefined, demoOffer: d.demoOffer as string | undefined,
      duration: d.duration as string | undefined, contactPhone: d.contactPhone as string | undefined, enrollmentClosed: d.enrollmentClosed as boolean | undefined,
      listed: d.listed as boolean | undefined, pricing: d.pricing as CohortView["pricing"],
    };
    built.push(buildCourse(cohort, course, priceFrom, files.get(r.key)));
  }
  if (!built.length) return null;
  built.sort((a, b) => Number(a.enrollmentClosed) - Number(b.enrollmentClosed) || a.slug.localeCompare(b.slug));
  // QA fixture course (test environments only) lives in the files; keep it available whichever source is on.
  const fixtures = fileEntries().filter((f) => isQaFixture(f.slug) && !built.some((b) => b.slug === f.slug));
  return [...built, ...fixtures];
}

const loadDatabase = unstable_cache(async (priceFrom: Source) => readDatabase(priceFrom), ["catalog-v1"], { revalidate: 60, tags: [CATALOG_TAG] });

export async function getCatalog(): Promise<CatalogCourse[]> {
  const f = flags();
  if (f.catalog === "files") return fileEntries();
  const { value } = await readWithFallback(f.catalog, () => loadDatabase(f.coupons), fileEntries, (reason, e) => log("database catalog", reason + (e ? `: ${(e as Error).message?.slice(0, 80)}` : "")));
  return value;
}

export async function getCourse(slug: string): Promise<CatalogCourse | undefined> {
  return (await getCatalog()).find((c) => c.slug === slug);
}

// The number the "chat with us" button opens: the saved support phone when the catalog flag is on, else the long-standing default.
const loadSupport = unstable_cache(async () => {
  const { values } = await savedSettings();
  return { whatsappNumber: whatsappNumber(values["support-phone"] as string | null | undefined) };
}, ["catalog-support-v1"], { revalidate: 60, tags: [CATALOG_TAG] });

export async function getSupport(): Promise<{ whatsappNumber: string }> {
  if (flags().catalog === "files") return { whatsappNumber: FALLBACK_WHATSAPP_NUMBER };
  try { return { whatsappNumber: (await loadSupport()).whatsappNumber ?? FALLBACK_WHATSAPP_NUMBER }; }
  catch (e) { log("support settings", (e as Error).message?.slice(0, 80)); return { whatsappNumber: FALLBACK_WHATSAPP_NUMBER }; }
}
