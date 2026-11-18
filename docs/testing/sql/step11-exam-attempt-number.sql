-- STEP 11 (SCP-118): the database numbers the exam attempts. A BEFORE INSERT trigger on exam_attempts sets attempt_no to the learner's
-- highest saved number for that course plus one, whatever the server sent, so the number can no longer collide or drift when the
-- progress row is reset. Safe: replaces nothing, changes no existing row. Run on QA first, then production. Rollback at the bottom.
-- The server still sends attempt_no, so it works before and after this file is run.

create or replace function public.exam_attempts_set_no() returns trigger
language plpgsql as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.user_id || '/' || new.course_slug));   -- two simultaneous submissions queue up
  select coalesce(max(attempt_no), 0) + 1 into new.attempt_no
    from public.exam_attempts where user_id = new.user_id and course_slug = new.course_slug;
  return new;
end $$;

drop trigger if exists exam_attempts_set_no on public.exam_attempts;
create trigger exam_attempts_set_no before insert on public.exam_attempts
  for each row execute function public.exam_attempts_set_no();

-- Check: insert two rows for one user and course with attempt_no 99 each; they come back as 1 and 2. Delete them afterwards.

-- Rollback:
--   drop trigger if exists exam_attempts_set_no on public.exam_attempts;
--   drop function if exists public.exam_attempts_set_no();
