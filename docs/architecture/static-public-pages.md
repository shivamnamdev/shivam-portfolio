# Static public pages (SCP-80): finding and plan

Status: **plan, awaiting owner approval.** No application code has been changed.

## 1. Finding: the ticket's premise is out of date

SCP-80 (written 2026-10-31 on Next 14 with `authMiddleware`) says every page is rendered on demand and sent `private, no-store`. That was true then. After the SCP-87 upgrade (Next 16.4.6, Clerk 7.9.25, `proxy.ts`, `ClerkProvider` without the `dynamic` prop) it is no longer true. Measured 2026-11-17 on a throwaway production build (`next build` into a separate folder, `next start -p 3101`, then deleted):

| Path | Build symbol | Response |
|---|---|---|
| `/`, `/about`, `/contact`, `/mentorship`, `/privacy`, `/terms`, `/refund`, `/courses`, `/admin` | `○` static | `x-nextjs-prerender: 1`, `x-nextjs-cache: HIT`, `Cache-Control: s-maxage=31536000` |
| `/courses/[slug]` | `ƒ` dynamic | `Cache-Control: private, no-cache, no-store` |
| `/learning`, `/live`, `/preview`, `/share`, `/admin/*`, every `/api/*` | `ƒ` dynamic | not cacheable (correct: personal or protected) |

The proxy still runs for every page (it sets `x-clerk-auth-*` headers) but no longer stops prerendering. `PRF-PRD-003` and `PRF-PRD-012` were written as "fail on purpose until fixed"; by this evidence they should pass now (to be confirmed with `PERF_PRODUCTION=1`).

## 2. What is still open

1. **Staleness of static pages that read the portal database.** `/courses` is built once and refreshed only when (a) an admin write calls `revalidateTag` (`lib/adminApi/audit.ts`, tags `catalog`, `learning`, `banners`) or (b) a new deploy happens. A change made any other way (SQL in Supabase, a `PORTAL_*` flag flipped in Vercel) does not show until the next deploy or the next admin write. The page has no `revalidate` of its own.
2. **Build-time data.** If the database cannot be read during `next build` while `PORTAL_CATALOG=database`, the page bakes in the data-file fallback until the first revalidation.
3. **The course sales page `/courses/[slug]` is rendered on every visit** (it is the page ads and shares land on). It calls Clerk `auth()` only for hidden courses, but the route is still dynamic because it has no `generateStaticParams` and reads the request.

## 3. Proposed slices (each separately approvable)

**Slice 1 (recommended, small, no new package, no SQL).**
- `export const revalidate = 300` on `app/courses/page.tsx` so the catalog can never be older than five minutes, whatever changed it. Home, about, legal pages have no data and stay as they are.
- Update `PRF-PRD-003` and `PRF-PRD-012` (drop "fail on purpose" wording, also assert `s-maxage` on the pages above) and add `/mentorship` and `/contact` to the list; run them with `PERF_PRODUCTION=1`.
- Add the "redeploy or save once in the portal after flipping a `PORTAL_*` flag" line to `docs/architecture/cutover-runbook.md`.
- Unit-testable logic: none (a config constant); the production-build tests are the verification, and I will say so in the summary.

**Slice 2 (optional, larger).** Make listed sales pages static: `generateStaticParams` over listed courses with `dynamicParams` for the rest, and move the hidden-course access check (`canOpenSalesPage`) so that only unlisted slugs take the dynamic path. Benefit: the highest-traffic page stops running the server per visit. Risk: the hidden-course rule is an access rule (PRD section 13), so it needs its own Blueprint and tests. I recommend doing it only if traffic or cost shows a need.

## 4. Decisions needed from the owner

1. Approve slice 1? (recommended)
2. Is five minutes the right maximum age for the catalog, or do you want 60 seconds (more server work) or one hour?
3. Slice 2 now, later, or not at all?
4. After slice 1 merges: Jira SCP-80 is closed with this finding, and SCP-81 stays open for its production-build check.

## 5. Data shapes, integrations, source of truth

No new payloads, tables, env vars or packages. Source of truth for catalog data is unchanged (`lib/catalog/catalog.ts`, tag `catalog`). Rollback of slice 1: remove the one `revalidate` line.
