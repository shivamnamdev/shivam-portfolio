-- STEP 4 of docs/testing/sql/hardening-proposal.sql (SCP-74 to SCP-76): lock the learner tables so only the server (service role) can use them.
-- RUN ONLY AFTER the code is deployed that no longer touches these tables from the browser:
--   PR 1 (/api/learning/* routes) and PR 2 (/api/admin/dashboard-data). Running it earlier breaks progress saving, comments and the admin portal.
-- Order: QA first, then npx playwright test tests/db tests/api tests/ui/learning tests/ui/dashboard tests/ui/admin; production after QA is green,
-- outside class hours, with a backup (DBI-POL-012). Tables that do not exist on a project (video_likes and test_attempts on QA) are skipped.
-- user_enrollments is NOT touched here: it keeps the read-only policy from step 2 (the dashboard and checkout still read it with the public key).

do $$
declare t text;
begin
  foreach t in array array['admin_activity_log', 'assignment_progress', 'exam_progress', 'test_attempts',
                           'user_stats', 'video_comments', 'video_likes', 'video_progress']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists "Allow public read/write" on public.%I', t);
      execute format('alter table public.%I enable row level security', t);   -- stays on, with no policy: deny all except the service role
      execute format('revoke all on public.%I from anon, authenticated', t);
    end if;
  end loop;
end $$;

-- Check (must return no rows for the 8 tables):
--   select tablename, policyname from pg_policies where schemaname = 'public' and tablename <> 'user_enrollments';
--   select table_name, grantee, privilege_type from information_schema.role_table_grants
--    where table_schema = 'public' and grantee in ('anon', 'authenticated') and table_name <> 'user_enrollments';

-- ROLLBACK (puts the old, open behaviour back; use only if the app breaks after the lock):
-- do $$
-- declare t text;
-- begin
--   foreach t in array array['admin_activity_log', 'assignment_progress', 'exam_progress', 'test_attempts',
--                            'user_stats', 'video_comments', 'video_likes', 'video_progress']
--   loop
--     if to_regclass('public.' || t) is not null then
--       execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
--       execute format('create policy "Allow public read/write" on public.%I for all using (true)', t);
--     end if;
--   end loop;
-- end $$;
