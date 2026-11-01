-- PROPOSAL ONLY: NOT RUN. Written from the 2026-10-31 policy inventory of the QA project (docs/testing/runs/policy-QA-2026-10-31.md).
-- Review it, run Step 1 and Step 2 on QA first, then run: npx playwright test tests/db  (DBI-CON-005, DBI-ACC-001, DBI-ACC-002 must pass)
-- and the checkout, enrolment and admin specs (they must still pass: enrolments are written by the server with the service role).
-- Production: run only after QA is green, outside class hours, with a backup in place. Nothing here changes data except the duplicate clean-up in 2a.

-- STEP 1 (safe now): remove privileges that no code path uses. PostgREST never issues TRUNCATE, TRIGGER or REFERENCES.
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;

-- STEP 2 (safe now): enrolments become server-written only and unique per learner and course (docs/SUPABASE_HARDENING.md steps 1 and 2).
-- 2a. look at duplicates first
select user_id, course_slug, count(*) from public.user_enrollments group by user_id, course_slug having count(*) > 1;
-- 2b. keep the earliest row of each pair (the id breaks a tie on identical timestamps)
delete from public.user_enrollments e using public.user_enrollments d
 where e.user_id = d.user_id and e.course_slug = d.course_slug
   and (e.enrolled_at > d.enrolled_at or (e.enrolled_at = d.enrolled_at and e.id > d.id));
-- 2c. the unique rule (also serves every lookup by user_id, so no extra index is needed on this table)
alter table public.user_enrollments add constraint user_enrollments_user_course_unique unique (user_id, course_slug);
-- 2d. replace "Allow public read/write" (ALL, using true) by a read-only policy: the browser still reads enrolments, it can no longer write them
drop policy "Allow public read/write" on public.user_enrollments;
create policy "Allow public read" on public.user_enrollments for select using (true);
revoke insert, update, delete on public.user_enrollments from anon, authenticated;

-- STEP 3 (decision needed): the cms_ tables are not used by the application and are readable by everyone (cms_coupons holds LAUNCH500 and QA_TEST_100).
-- Option A, lock them to the service role:
--   drop policy "Allow public read" on public.cms_courses;
--   drop policy "Allow public read" on public.cms_curriculum;
--   drop policy "Allow public read" on public.cms_coupons;
-- Option B, drop them:  drop table public.cms_coupons, public.cms_courses, public.cms_curriculum;

-- STEP 4 (needs code changes first, do not run yet): the browser still writes admin_activity_log, user_stats, video_comments, video_progress,
-- assignment_progress and exam_progress with the anon key, so their "Allow public read/write" policies cannot be dropped until those writes go
-- through server routes (service role) or Clerk is added to Supabase as a third-party auth provider and the policies compare user_id with auth.jwt() ->> 'sub'.
-- user_stats also exposes user_email to the leaderboard query (select '*'): the page must select explicit columns before email can be revoked
--   (revoke select on public.user_stats from anon, authenticated; grant select (user_id, user_name, total_points, current_streak, last_active_date, total_time_seconds) on public.user_stats to anon, authenticated;)

-- STEP 5 (performance, safe): indexes for the filters the application uses
create index if not exists video_comments_video_id_idx on public.video_comments (video_id, created_at desc);
create index if not exists admin_activity_log_created_at_idx on public.admin_activity_log (created_at desc);
