# Database Architecture (Supabase)

All tables are secured via Row Level Security (RLS). Currently, policies are set to allow public authenticated read/writes, managed strictly by the Next.js frontend logic.

### 1. `user_enrollments`
Tracks which student owns which course.
- `id` (UUID)
- `user_id` (Text - Clerk ID)
- `course_slug` (Text - e.g., 'python-beginners')
- `enrolled_at` (Timestamp)

### 2. `video_progress`
Tracks which specific videos a student has marked as complete.
- `id` (UUID)
- `user_id` (Text - Clerk ID)
- `course_slug` (Text)
- `video_id` (Text - YouTube ID)
- `completed_at` (Timestamp)
- *Unique Constraint: user_id + course_slug + video_id*

### 3. `video_comments`
Tracks Q&A discussion board posts under videos.
- `id` (UUID)
- `video_id` (Text - YouTube ID)
- `user_id` (Text - Clerk ID)
- `user_name` (Text)
- `user_image` (Text - Clerk Image URL)
- `content` (Text - Comment Body)
- `created_at` (Timestamp)

### 4. `assignment_progress`
Tracks student code submissions from the Interactive IDE.
- `id` (UUID)
- `user_id` (Text - Clerk ID)
- `user_name` (Text - Clerk Name/Email)
- `course_slug` (Text)
- `video_id` (Text - YouTube ID)
- `submitted_code` (Text - Raw Python Code)
- `completed_at` (Timestamp)
- *Unique Constraint: user_id + course_slug + video_id*
### `rate_limits` (SCP-69, SCP-73)
Counter for the server-side limits on `/api/send-email` (5 per 10 minutes per IP, 200 a day for the site) and `/api/track-time` (1 per 55 seconds per learner).
- `key` (Text, for example `send-email:ip:1.2.3.4` or `track-time:<clerk id>`), `window_start` (Timestamp), `hits` (Integer). Primary key: `key + window_start`.
- Written only through the function `rate_limit_hit(key, window_seconds, limit)` with the service role; RLS on, no policy, no anon or authenticated grants. Created by `docs/testing/sql/step6-rate-limits.sql` (with rollback). If it is missing the routes fail open and log "rate limit unavailable".
