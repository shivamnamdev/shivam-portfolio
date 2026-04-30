# How to Update Course Content

The entire website is dynamic. To launch a new course or add videos, you only edit two files in the `data/` folder.

## 1. Adding a New Course Funnel
File: `data/courses.ts`
1. Copy an existing course block.
2. Update the `slug` (e.g., `playwright-mastery`).
3. Update pricing, title, and modules.
*Result:* Next.js automatically generates a new sales page at `shivamnamdev.com/courses/playwright-mastery`.

## 2. Adding Videos to a Course
File: `data/learning-content.ts`
1. Upload the video to YouTube as "Unlisted".
2. Copy the 11-character YouTube ID.
3. Find the course in `courseCurriculumMap` using the exact `slug`.
4. Paste the ID into the `videoIds` array.
*Result:* The Learning Dashboard automatically fetches the title and duration from YouTube and displays the video.

## 3. Adding an Interactive Python Assignment
File: `data/learning-content.ts`
1. Write the assignment and push it to your public GitHub repository.
2. Copy the **Raw** URL.
3. In `learning-content.ts`, add the YouTube Video ID to the `githubAssignments` dictionary.
4. Provide a `title` and paste the `rawUrl`.
*Result:* A "Practice 💻" tab automatically appears under that specific video in the Learning Portal, featuring the Pyodide compiler.