-- STEP 10 (SCP-115 part B): one row per exam submission, with the submitted code, the score, the improvement notes and the e-mail status.
-- Safe: creates one new table (and an index), changes no existing data. Run on QA first, then production. Rollback at the bottom.
-- The table is written and read only by the server with the service role: row level security is on and nothing is granted to the
-- browser roles. Until this file is run the exam still grades and the e-mails still go out; only the saved row (and, later, the
-- admin portal list) is missing, and the server logs "exam attempt not saved".

create table if not exists public.exam_attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null,                       -- Clerk user id
  user_name    text,
  user_email   text,
  course_slug  text not null,
  attempt_no   integer not null check (attempt_no >= 1),
  score        integer not null check (score between 0 and 100),
  passed       boolean not null,
  code         text not null,                       -- the submitted program (the server caps it at 200,000 characters)
  notes        jsonb not null default '[]'::jsonb,  -- [{ q, label, passed, note }]
  mail_learner text not null default 'pending' check (mail_learner in ('pending', 'sent', 'failed', 'skipped')),
  mail_owner   text not null default 'pending' check (mail_owner in ('pending', 'sent', 'failed', 'skipped')),
  created_at   timestamptz not null default now(),
  unique (user_id, course_slug, attempt_no)
);

create index if not exists exam_attempts_created_at_idx on public.exam_attempts (created_at desc);

alter table public.exam_attempts enable row level security;
revoke all on public.exam_attempts from anon, authenticated;

-- Check (must return one row with rowsecurity = true):
--   select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename = 'exam_attempts';

-- Rollback (deletes every saved attempt):
--   drop table if exists public.exam_attempts;
