-- PRD 14 policy inventory (cases DBI-POL-001 to 010 and 013). READ-ONLY: SELECT statements only, nothing is changed.
-- How to run: Supabase dashboard of the QA project > SQL Editor > New query > paste this whole file > Run.
-- The result is ONE table (case_id, item, detail). Click "Export" > "Download CSV" and give the file to the checker:
--   python3 -I scripts/policy-check.py <downloaded.csv> QA
-- A table that does not exist (for example the cms_ tables on production) is reported as 'table does not exist', not as an error.
-- Run the same file on production (read-only) for DBI-POL-015, then compare the two checker outputs.

select 'POL-001' as case_id, c.relname::text as item,
       'rls=' || c.relrowsecurity::text || ' forced=' || c.relforcerowsecurity::text as detail
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r'
union all
select 'POL-002', p.tablename::text || ' / ' || p.policyname::text,
       'cmd=' || p.cmd::text || ' roles=' || p.roles::text || ' using=' || coalesce(p.qual, '') || ' check=' || coalesce(p.with_check, '')
  from pg_policies p where p.schemaname = 'public'
union all
select 'POL-003', g.table_name::text || ' / ' || g.grantee::text,
       string_agg(g.privilege_type::text, ',' order by g.privilege_type::text)
  from information_schema.role_table_grants g
 where g.table_schema = 'public' and g.grantee in ('anon', 'authenticated')
 group by g.table_name, g.grantee
union all
select 'POL-004', i.tablename::text || ' / ' || i.indexname::text, i.indexdef::text
  from pg_indexes i where i.schemaname = 'public'
union all
select 'POL-004', conrelid::regclass::text || ' / ' || conname::text, pg_get_constraintdef(oid)
  from pg_constraint where connamespace = 'public'::regnamespace
union all
select 'POL-006', r.routine_name::text, 'function security=' || r.security_type::text
  from information_schema.routines r where r.routine_schema = 'public'
union all
select 'POL-006', v.table_name::text, 'view'
  from information_schema.views v where v.table_schema = 'public'
union all
select 'POL-007', 'cms_courses', case when to_regclass('public.cms_courses') is null then 'table does not exist'
       else (xpath('/row/c/text()', query_to_xml('select count(*) as c from public.cms_courses', false, true, '')))[1]::text end
union all
select 'POL-007', 'cms_curriculum', case when to_regclass('public.cms_curriculum') is null then 'table does not exist'
       else (xpath('/row/c/text()', query_to_xml('select count(*) as c from public.cms_curriculum', false, true, '')))[1]::text end
union all
select 'POL-007', 'cms_coupons', case when to_regclass('public.cms_coupons') is null then 'table does not exist'
       else (xpath('/row/c/text()', query_to_xml('select count(*) as c from public.cms_coupons', false, true, '')))[1]::text end
union all
select 'POL-008', 'video_progress without a user_stats row', count(*)::text
  from public.video_progress v left join public.user_stats s using (user_id) where s.user_id is null
union all
select 'POL-008', 'assignment_progress without a user_stats row', count(*)::text
  from public.assignment_progress v left join public.user_stats s using (user_id) where s.user_id is null
union all
select 'POL-008', 'exam_progress without a user_stats row', count(*)::text
  from public.exam_progress v left join public.user_stats s using (user_id) where s.user_id is null
union all
select 'POL-008', 'enrolments for a course outside the catalog', coalesce(string_agg(distinct course_slug, ','), 'none')
  from public.user_enrollments
 where course_slug not in ('git-beginner-batch-1', 'python-beginners-batch-2', 'python-beginners', 'qa-checkout-sandbox')
union all
select 'POL-009', pt.pubname::text || ' / ' || pt.tablename::text, 'published'
  from pg_publication_tables pt where pt.schemaname = 'public'
union all
select 'POL-010', b.id::text, 'public=' || b.public::text from storage.buckets b
union all
select 'POL-013', e.extname::text, e.extversion::text from pg_extension e
union all
select 'ROLES', r.rolname::text, 'bypassrls=' || r.rolbypassrls::text from pg_roles r where r.rolname in ('anon', 'authenticated', 'service_role')
union all
select 'COUNT', t.table_name::text,
       (xpath('/row/c/text()', query_to_xml('select count(*) as c from public.' || quote_ident(t.table_name), false, true, '')))[1]::text
  from information_schema.tables t where t.table_schema = 'public' and t.table_type = 'BASE TABLE'
order by 1, 2;
