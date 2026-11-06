-- STEP 8 (SCP-89, admin portal phase 3b): in-app notifications, who has read them, and one function that lets the e-mail
-- sender take a whole batch from the daily e-mail budget in one step. Only the service role can touch these tables.
-- Safe to run BEFORE the code is deployed (nothing reads them yet) and safe to run twice. Run on QA first, then production.
-- Needs step6 (rate_limits) to have been run: the function below uses that table.

-- 1) Notifications: one row per notification. `target` says who it is for; learners see it in their inbox from publish_at until expires_at.
create table if not exists public.notifications (
  id               uuid        primary key default gen_random_uuid(),
  type             text        not null check (type in ('transactional', 'announcement', 'reminder', 'progress', 'marketing', 'admin-alert')),
  title            text        not null check (char_length(title) between 1 and 120),
  body             text        not null check (char_length(body) between 1 and 2000),
  link             text        check (link is null or char_length(link) <= 2000),
  channels         text[]      not null default '{inbox}' check (channels <@ array['inbox', 'email']::text[] and 'inbox' = any (channels)),
  target           jsonb       not null,                        -- { kind: all | cohort | plan | user | admins, ... }
  publish_at       timestamptz not null default now(),
  expires_at       timestamptz,
  created_by       text        not null,
  created_at       timestamptz not null default now(),
  email_sent_at    timestamptz,                                 -- set once, when the explicit send-email action starts
  email_recipients integer,                                     -- how many e-mails were actually sent
  check (expires_at is null or expires_at > publish_at)
);
create index if not exists notifications_publish_idx on public.notifications (publish_at desc);
create index if not exists notifications_created_idx on public.notifications (created_at desc, id);

-- 2) Reads: which learner has opened which notification (the bell in phase 5). Deleted with the notification.
create table if not exists public.notification_reads (
  notification_id uuid        not null references public.notifications (id) on delete cascade,
  user_id         text        not null,
  read_at         timestamptz not null default now(),
  primary key (notification_id, user_id)
);
create index if not exists notification_reads_user_idx on public.notification_reads (user_id);

-- 3) Lock both tables: server routes with the service role only.
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;
revoke all on public.notifications from anon, authenticated;
revoke all on public.notification_reads from anon, authenticated;

-- 4) Take `p_amount` from a budget in one atomic step. All or nothing: if the window already holds `p_limit - p_amount + 1` or more, nothing is taken
-- and the answer is false. (rate_limit_hit counts one at a time; a 50-recipient announcement must not half-pass.)
create or replace function public.rate_limit_take(p_key text, p_window_seconds integer, p_amount integer, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n integer;
begin
  if p_amount < 1 or p_amount > p_limit then return false; end if;
  insert into public.rate_limits as r (key, window_start, hits) values (p_key, w, 0)
  on conflict (key, window_start) do nothing;
  update public.rate_limits as r set hits = r.hits + p_amount
  where r.key = p_key and r.window_start = w and r.hits + p_amount <= p_limit
  returning r.hits into n;
  return n is not null;
end $$;
revoke all on function public.rate_limit_take(text, integer, integer, integer) from public, anon, authenticated;

-- Check (each must return what the comment says):
--   select relname, relrowsecurity from pg_class where relname in ('notifications','notification_reads');          -- 2 rows, both true
--   select tablename from pg_policies where tablename in ('notifications','notification_reads');                  -- no rows
--   select table_name, grantee from information_schema.role_table_grants
--    where table_name in ('notifications','notification_reads') and grantee in ('anon','authenticated');          -- no rows
--   select public.rate_limit_take('step8-check', 60, 3, 5), public.rate_limit_take('step8-check', 60, 3, 5);      -- true, false
--   delete from public.rate_limits where key = 'step8-check';

-- Retention: notifications older than 12 months can be deleted (their reads go with them):
--   delete from public.notifications where created_at < now() - interval '12 months';

-- ROLLBACK (drops all notifications; run only if slice 3b is abandoned):
--   drop function if exists public.rate_limit_take(text, integer, integer, integer);
--   drop table if exists public.notification_reads;
--   drop table if exists public.notifications;
