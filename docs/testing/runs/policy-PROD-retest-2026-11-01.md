# Policy inventory result: PROD after steps 1 and 2

Graded from `policy-PROD-retest-2026-11-01.csv` by `scripts/policy-check.py`. Manual cases POL-012, 014, 015, 016 are not graded here.

| Case | Result |
| --- | --- |
| DBI-POL-001 | PASS |
| DBI-POL-002 | REVIEW |
| DBI-POL-003 | REVIEW |
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

### DBI-POL-002: REVIEW

No write policy for anon or authenticated on user_enrollments; no 'using (true)' write policy elsewhere.
- open write policy: admin_activity_log / Allow public read/write: ALL using true
- open write policy: assignment_progress / Allow public read/write: ALL using true
- open write policy: exam_progress / Allow public read/write: ALL using true
- open write policy: test_attempts / Allow public read/write: ALL using true
- open write policy: user_stats / Allow public read/write: ALL using true
- open write policy: video_comments / Allow public read/write: ALL using true
- open write policy: video_likes / Allow public read/write: ALL using true
- open write policy: video_progress / Allow public read/write: ALL using true

### DBI-POL-005: FAIL

Learner rows are limited to the caller's own user_id (JWT subject).
- 9 policies, none refers to the JWT or auth.uid(): every row is open to every caller

### DBI-POL-003: REVIEW

No write privilege for anon or authenticated on user_enrollments.
- also writable by a public role: admin_activity_log / anon: DELETE,INSERT,SELECT,UPDATE
- also writable by a public role: admin_activity_log / authenticated: DELETE,INSERT,SELECT,UPDATE
- also writable by a public role: assignment_progress / anon: DELETE,INSERT,SELECT,UPDATE
- also writable by a public role: assignment_progress / authenticated: DELETE,INSERT,SELECT,UPDATE
- also writable by a public role: exam_progress / anon: DELETE,INSERT,SELECT,UPDATE
- also writable by a public role: exam_progress / authenticated: DELETE,INSERT,SELECT,UPDATE
- also writable by a public role: test_attempts / anon: DELETE,INSERT,SELECT,UPDATE
- also writable by a public role: test_attempts / authenticated: DELETE,INSERT,SELECT,UPDATE
- also writable by a public role: user_stats / anon: DELETE,INSERT,SELECT,UPDATE
- also writable by a public role: user_stats / authenticated: DELETE,INSERT,SELECT,UPDATE
- also writable by a public role: video_comments / anon: DELETE,INSERT,SELECT,UPDATE
- also writable by a public role: video_comments / authenticated: DELETE,INSERT,SELECT,UPDATE
- also writable by a public role: video_likes / anon: DELETE,INSERT,SELECT,UPDATE
- also writable by a public role: video_likes / authenticated: DELETE,INSERT,SELECT,UPDATE
- also writable by a public role: video_progress / anon: DELETE,INSERT,SELECT,UPDATE
- also writable by a public role: video_progress / authenticated: DELETE,INSERT,SELECT,UPDATE

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
