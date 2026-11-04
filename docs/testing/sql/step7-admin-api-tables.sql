-- STEP 7 (SCP-89, admin portal phase 1): four small tables for the admin API. Run on QA first, then production, outside class hours.
-- Safe to run before the code is deployed (nothing reads them yet) and safe to run twice. Rollback at the bottom.
-- All four are locked like the learner tables: RLS on, no policy, no grants for anon or authenticated; only the service role (server routes) touches them.

-- 1) Documents: courses, cohorts, curriculum, banners, e-mail templates and settings as validated JSON, one row each.
create table if not exists public.content_docs (
  id          uuid        primary key default gen_random_uuid(),
  kind        text        not null check (kind in ('course', 'cohort', 'curriculum', 'banner', 'email_template', 'setting')),
  key         text        not null check (key ~ '^[a-z0-9][a-z0-9_-]{0,99}$'),
  status      text        not null default 'draft' check (status in ('draft', 'published', 'archived')),
  version     integer     not null default 1,
  doc         jsonb       not null,
  created_by  text        not null,
  updated_by  text        not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (kind, key)
);
create index if not exists content_docs_kind_status_idx on public.content_docs (kind, status);

-- 2) Coupons: one row per code (unique codes, atomic counters, one-time reservation).
create table if not exists public.coupons (
  code          text        primary key check (code = upper(code) and code ~ '^[A-Z0-9_-]{4,40}$'),
  kind          text        not null check (kind in ('everyone', 'selected', 'single-use')),
  discount      jsonb       not null,
  expires_at    timestamptz not null,                      -- mandatory for every kind
  active        boolean     not null default true,
  user_ids      text[]      not null default '{}',         -- kind 'selected': Clerk ids
  applies_to    jsonb,                                     -- optional { courseSlugs, planIds }
  max_redemptions integer,
  redemptions   integer     not null default 0,
  reserved_by   text,                                      -- kind 'single-use'
  reserved_until timestamptz,
  redeemed_by   text,
  redeemed_at   timestamptz,
  batch_id      text,                                      -- codes generated together
  created_by    text        not null,
  created_at    timestamptz not null default now(),
  check (kind <> 'selected' or cardinality(user_ids) > 0)
);
create index if not exists coupons_kind_idx on public.coupons (kind, expires_at);

-- 3) Audit: every admin write, append only.
create table if not exists public.admin_audit (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  actor       text        not null,
  action      text        not null,
  resource    text        not null,
  resource_id text        not null,
  before      jsonb,
  after       jsonb
);
create index if not exists admin_audit_at_idx on public.admin_audit (at desc);

-- 4) API keys: only the hash is stored; the secret is shown once when the key is created.
create table if not exists public.api_keys (
  id           text        primary key check (id ~ '^[a-z0-9]{8,16}$'),
  name         text        not null,
  level        text        not null check (level in ('admin', 'staff')),
  hash         text        not null,
  created_by   text        not null,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);

-- Lock all four.
do $$
declare t text;
begin
  foreach t in array array['content_docs', 'coupons', 'admin_audit', 'api_keys'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- Check (each must return what the comment says):
--   select relname, relrowsecurity from pg_class where relname in ('content_docs','coupons','admin_audit','api_keys');   -- 4 rows, all true
--   select tablename from pg_policies where tablename in ('content_docs','coupons','admin_audit','api_keys');           -- no rows
--   select table_name, grantee from information_schema.role_table_grants
--    where table_name in ('content_docs','coupons','admin_audit','api_keys') and grantee in ('anon','authenticated');   -- no rows

-- ROLLBACK (drops all admin data; run only if phase 1 is abandoned):
--   drop table if exists public.api_keys;
--   drop table if exists public.admin_audit;
--   drop table if exists public.coupons;
--   drop table if exists public.content_docs;
