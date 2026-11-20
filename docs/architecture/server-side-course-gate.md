# Server-side course gate (SCP-39)

## Problem
`/learning/[slug]` and `/live/[slug]` decided "Access Denied" in the browser (a client component asked `/api/learning/my-courses` and chose a screen). Course data was already protected by routes that check enrolment on the server (SCP-45, SCP-74 to 76, SCP-82), but the page code itself was sent to everyone who was signed in, enrolled or not.

## Decision (owner approved 2026-11-20)
A server layout checks enrolment (or admin) before the page is rendered.

- `lib/courseAccess.ts` `courseGate({ signedIn, slugValid, hasAccess })` returns `show` or `denied` (pure, unit-tested):
  - no session: `show` (the proxy already redirects a visitor to sign in);
  - malformed slug: `denied`, no lookup;
  - lookup failed (`hasAccess: null`): `show`. The page asks again and every route that returns lessons, links or progress checks on the server, so a database blip neither exposes content nor locks an enrolled learner out;
  - otherwise enrolled or admin: `show`, else `denied`.
- `lib/courseGate.ts` (server only) reads the Clerk session and calls `hasCourseAccess` (enrolled or admin).
- `app/learning/[slug]/layout.tsx` and `app/live/[slug]/layout.tsx` render `CourseDenied` / `LiveDenied` instead of the page when the gate says `denied`. These two components hold the screens that used to be inline in the pages; the pages reuse them for their own failed-lookup case, so the wording is unchanged.
- The admin portal was already guarded on the server (`app/admin/(shell)/layout.tsx`).

## Not changed
- Everything behind the page (`/api/learning/*`, `/api/admin/*`) still checks again on every call.
- Share links, sales pages and the draft preview (`?draft=1`, admin only) behave as before.

## Tests
`CAC-UNIT-006..008` (the rule), `AUTH-SRV-001..004` in `tests/api/course-gate.spec.ts` (the HTML the server sends, fetched without browser code: not enrolled gets Access Denied on both pages, enrolled and admin get the page, malformed slug denied, per-course gate). Existing UI specs for the denied screens keep passing because the screens are unchanged.
