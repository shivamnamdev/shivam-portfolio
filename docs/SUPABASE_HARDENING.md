# Supabase Hardening Runbook

**Goal:** stop browsers from writing to `user_enrollments` directly with the public anon key (PRD §13 S2, B5).

Since branch `fix/prd-known-issues`, every enrollment is written **server-side** (`/api/verify-payment`, `/api/enroll-free`, `/api/admin/enroll`) through `lib/supabaseAdmin.ts`, which uses the service-role key. Browsers still *read* their own enrollment to unlock pages. That makes it safe to remove anon write access to `user_enrollments`.

These steps change the production database, so run them by hand, in order, in the Supabase SQL editor. Nothing in this repo runs them automatically.

---

## Step 0 — Prerequisites (do not skip)

1. **Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel** (Production + Preview) with the project's service-role key, then redeploy.
   Without it, `lib/supabaseAdmin.ts` falls back to the anon client and logs a warning. After Step 2 that fallback can no longer insert enrollments, so **paid enrollments would fail**.
2. Deploy this branch and run a test enrollment (admin *Manual Enrollment* is the easiest) to confirm it succeeds.

## Step 1 — Remove duplicate enrollments, then add a unique constraint

```sql
-- Inspect duplicates first
select user_id, course_slug, count(*)
from public.user_enrollments
group by user_id, course_slug
having count(*) > 1;

-- Keep the earliest row per (user_id, course_slug)
delete from public.user_enrollments e
using public.user_enrollments d
where e.user_id = d.user_id
  and e.course_slug = d.course_slug
  and e.enrolled_at > d.enrolled_at;

alter table public.user_enrollments
  add constraint user_enrollments_user_course_unique unique (user_id, course_slug);
```

## Step 2 — Remove anon/authenticated write access to `user_enrollments`

First review the existing policies:

```sql
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'user_enrollments';
```

Then drop every `INSERT` / `UPDATE` / `DELETE` policy that applies to `anon` or `authenticated`. Keep the `SELECT` policy, because the browser reads enrollments.

```sql
-- Replace <policy_name> with each write policy listed above
drop policy "<policy_name>" on public.user_enrollments;

-- Belt and braces: remove table-level write grants from the public roles
revoke insert, update, delete on public.user_enrollments from anon, authenticated;
```

The service role bypasses RLS, so server routes keep working.

## Step 3 — Verify

1. Admin *Manual Enrollment* still works.
2. From a browser console on the site, this must now fail:
   ```js
   // should return a permission / RLS error
   await window.fetch(`${SUPABASE_URL}/rest/v1/user_enrollments`, { method: 'POST', headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: 'x', course_slug: 'y' }) })
   ```
3. `/learning`, `/learning/[slug]` and `/live/[slug]` still unlock for enrolled students.

---

## Not covered yet (phase 2)

Other tables (`video_progress`, `assignment_progress`, `exam_progress`, `user_stats`, `video_comments`, `video_likes`, `admin_activity_log`) are still written from the browser with the anon key, and the admin dashboard still reads all rows with it. Restricting those per user needs Supabase to recognise Clerk identities: the [Clerk ↔ Supabase third-party auth integration](https://supabase.com/docs/guides/auth/third-party/clerk), with RLS policies on `auth.jwt()->>'sub' = user_id`. Alternatively, move those reads and writes behind server routes like the enrollment flow.
