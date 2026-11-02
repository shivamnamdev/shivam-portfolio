-- STEP 5 (SCP-75): lock user_enrollments so the public key cannot read who is enrolled in what.
-- RUN ONLY AFTER the code is deployed that reads enrolments through GET /api/learning/enrollments (and the share page through the service role).
-- Running it earlier hides every learner's courses on the dashboard, lesson page, live lobby and checkout.
-- Order: QA first, then npx playwright test tests/db tests/ui/dashboard tests/ui/learning; production after QA is green, outside class hours.
-- Writes were already closed by step 2 of hardening-proposal.sql; this removes the last read.

do $$
declare p text;
begin
  if to_regclass('public.user_enrollments') is not null then
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'user_enrollments'
    loop
      execute format('drop policy %I on public.user_enrollments', p);
    end loop;
    execute 'alter table public.user_enrollments enable row level security';   -- stays on, with no policy: deny all except the service role
    execute 'revoke all on public.user_enrollments from anon, authenticated';
  end if;
end $$;

-- Check (must return no rows):
--   select policyname from pg_policies where schemaname = 'public' and tablename = 'user_enrollments';
--   select grantee, privilege_type from information_schema.role_table_grants
--    where table_schema = 'public' and table_name = 'user_enrollments' and grantee in ('anon', 'authenticated');
