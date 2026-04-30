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