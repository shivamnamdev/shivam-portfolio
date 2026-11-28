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
### Starter code for a lab that carries code over (SCP-124)
Applies to a lesson with "carry over code" switched on (`carryOverCode: true`). The starter file (`starterCodeUrl`) is split on lines of `# ----------` (ten or more dashes). Section 1 is step 1, section 2 is step 2, and so on.

| Section | What the learner gets when they reach that step |
|---|---|
| Blank | Nothing changes: their code carries over |
| `# @carry` alone | The same, written out |
| `# @clear` alone | The editor is reset to the plain template (this removes the learner's code, so use it on purpose) |
| `# @clear` as the first line, code below it | The editor is reset and shows **only** that code (the `# @clear` line itself is not shown). Use it for "start again with this code"; it can be used in several steps |
| Anything else | The text is added **below** the learner's code, once, with a blank line between. If the editor only holds the plain template, the text replaces it |

Going back to an earlier step changes nothing, and a starter is never added twice. A file with fewer sections than the lesson has steps carries over for the missing ones. Other labs (carry over off) read the file as before. Example for a three-step lesson:

```
base = 10
# ----------

# ----------
double = base * 2
```
Step 1 opens with `base = 10`; step 2 keeps what the learner typed; step 3 adds `double = base * 2` under it. Design: `docs/architecture/lab-starter-carryover.md`.
