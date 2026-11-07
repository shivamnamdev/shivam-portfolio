# Supabase: record the pricing plan on enrollments

Plan-based courses (`pricingPlans` in `data/courses.ts`, e.g. Community vs Personal) store the purchased plan in `user_enrollments.plan_id`, so `/admin` shows who bought the Personal plan and is owed 1-on-1 calls.

Run once in the Supabase SQL editor **before opening a plan-based cohort**:

```sql
alter table public.user_enrollments
  add column if not exists plan_id text;
```

- Existing rows keep `plan_id = null` (single-price courses and older enrollments).
- Until this runs, `lib/enrollments.ts` still enrolls the student. It drops the plan from the row, logs a warning, and keeps the plan name in the `admin_activity_log` message, so no purchase is ever blocked.
- Verify: open `/admin` → **Enrollments**. New plan purchases show the plan next to the course.
