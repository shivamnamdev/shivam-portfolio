# Policy inventory result: PROD after steps 4 and 5 (learner tables and user_enrollments locked)

Graded from `policy-PROD-locked-2026-11-02.csv` by `scripts/policy-check.py`. Manual cases POL-012, 014, 015, 016 are not graded here.

| Case | Result |
| --- | --- |
| DBI-POL-001 | PASS |
| DBI-POL-002 | PASS |
| DBI-POL-003 | PASS |
| DBI-POL-004 | REVIEW |
| DBI-POL-005 | FAIL |
| DBI-POL-006 | PASS |
| DBI-POL-007 | REVIEW |
| DBI-POL-008 | REVIEW |
| DBI-POL-009 | PASS |
| DBI-POL-010 | PASS |
| DBI-POL-013 | PASS |

### DBI-POL-001: PASS

Row level security is on for every table.
- all app tables have rls=true

### DBI-POL-002: PASS

No write policy for anon or authenticated on user_enrollments; no 'using (true)' write policy elsewhere.
- no risky policy found

### DBI-POL-005: FAIL

Learner rows are limited to the caller's own user_id (JWT subject).
- 0 policies, none refers to the JWT or auth.uid(): every row is open to every caller

### DBI-POL-003: PASS

No write privilege for anon or authenticated on user_enrollments.
- no write grant on user_enrollments

### DBI-POL-004: REVIEW

Unique rules and an index on user_id exist.
- no index or key containing user_id: video_comments
- no index or key containing user_id: admin_activity_log

### DBI-POL-006: PASS

No SECURITY DEFINER function callable by anon; views and functions are known.
- no public functions or views

### DBI-POL-007: REVIEW

The cms_ tables are not used by the application: decide to drop them or lock them to the service role.
- cms_courses: table does not exist rows
- cms_curriculum: table does not exist rows
- cms_coupons: table does not exist rows

### DBI-POL-008: REVIEW

Orphan counts are known and explained (no foreign keys exist because user ids come from Clerk).
- assignment_progress without a user_stats row: 0
- enrolments for a course outside the catalog: none
- exam_progress without a user_stats row: 0
- video_progress without a user_stats row: 2

### DBI-POL-009: PASS

No learner table is published to Realtime.
- no publication on public tables

### DBI-POL-010: PASS

No public storage bucket holds private data.
- 0 buckets, none public

### DBI-POL-013: PASS

uuid-ossp is present (the id defaults use extensions.uuid_generate_v4()).
- pg_stat_statements 1.11
- pgcrypto 1.3
- plpgsql 1.0
- supabase_vault 0.3.1
- uuid-ossp 1.1


## Owner reading (2026-11-02)

- DBI-POL-005 shows FAIL only because the checker looks for a JWT-based policy. There are now **no policies and no anon/authenticated grants at all** on any of the 9 tables (POL-002 and POL-003 pass): only the server (service role) can read or write them, and the server routes check the Clerk session. This is the intended design (Clerk v4 gives no Supabase JWT), so POL-005 is accepted, not a gap.
- DBI-POL-004 REVIEW (no user_id index on `video_comments` and `admin_activity_log`) and POL-008 REVIEW (2 `video_progress` rows without a `user_stats` row) are unchanged and harmless at this size.
- Row counts match before the lock: 39 enrolments, 27 learners, no data lost.
