-- STEP 6 (SCP-69, SCP-73): a small counter table and one function the server routes use to limit how often a caller can hit
-- /api/send-email (per IP) and /api/track-time (per learner). Only the service role can touch it.
-- Safe to run BEFORE the code is deployed (nothing uses it yet) and safe to run twice. Run on QA first, then production.
-- The routes fail OPEN while this is missing (they log "rate limit unavailable" and carry on), so deploying the code first is also safe,
-- but the limits only start working once this has run.

create table if not exists public.rate_limits (
  key          text        not null,
  window_start timestamptz not null,
  hits         integer     not null default 0,
  primary key (key, window_start)
);

alter table public.rate_limits enable row level security;           -- no policy: deny all except the service role
revoke all on public.rate_limits from anon, authenticated;

-- Counts one hit for `p_key` in the current fixed window of `p_window_seconds` and says whether it is within `p_limit`.
-- One statement does the increment, so parallel callers cannot both slip under the limit.
create or replace function public.rate_limit_hit(p_key text, p_window_seconds integer, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n integer;
begin
  insert into public.rate_limits as r (key, window_start, hits) values (p_key, w, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning r.hits into n;

  if random() < 0.02 then   -- housekeeping: forget windows older than a day
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return n <= p_limit;
end $$;

revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;

-- Check (3 queries):
--   select relrowsecurity from pg_class where oid = 'public.rate_limits'::regclass;                       -- true
--   select grantee, privilege_type from information_schema.role_table_grants where table_name = 'rate_limits' and grantee in ('anon','authenticated');   -- no rows
--   select has_function_privilege('anon', 'public.rate_limit_hit(text,integer,integer)', 'execute');      -- false

-- ROLLBACK (removes the limits; the routes then fail open):
--   drop function if exists public.rate_limit_hit(text, integer, integer);
--   drop table if exists public.rate_limits;
