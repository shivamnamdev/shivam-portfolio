-- STEP 9 (SCP-83): indexes for the filters the application uses. Safe: adds indexes only, changes no data, skips a table that does not exist.
-- Run on QA first, then production (outside class hours is not needed for tables this small; index creation locks writes only for an instant).
-- The same two statements are Step 5 of hardening-proposal.sql; this file lets them run on their own.

do $$
begin
  if to_regclass('public.video_comments') is not null then
    execute 'create index if not exists video_comments_video_id_idx on public.video_comments (video_id, created_at desc)';
  end if;
  if to_regclass('public.admin_activity_log') is not null then
    execute 'create index if not exists admin_activity_log_created_at_idx on public.admin_activity_log (created_at desc)';
  end if;
end $$;

-- user_enrollments: every page filters it by user_id. The unique rule (user_id, course_slug) serves those lookups, so no separate index is added.
-- Check that the rule exists (must return one row; if it returns none, run Step 2 of hardening-proposal.sql, which also removes duplicate rows first):
--   select conname from pg_constraint where conrelid = 'public.user_enrollments'::regclass and contype = 'u';

-- Check (must return both index names):
--   select indexname from pg_indexes where schemaname = 'public' and indexname in ('video_comments_video_id_idx', 'admin_activity_log_created_at_idx');
