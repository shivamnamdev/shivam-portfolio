-- The QA Supabase project is missing tables that production has (found 2026-11-01 while testing the like route):
--   video_likes   (the lesson "like" button; the browser used to ignore the error, so it silently did nothing on QA)
--   test_attempts (no code uses it; production only)
-- Run on QA only. RLS is on with no policy: the table is reachable by the server (service role) and nobody else, which is the
-- target state for every learner table (docs/testing/sql/hardening-proposal.sql, step 4).
create table if not exists public.video_likes (
  id uuid primary key default gen_random_uuid(),
  video_id text not null,
  user_id text not null,
  created_at timestamptz not null default now(),
  unique (video_id, user_id)
);
alter table public.video_likes enable row level security;
