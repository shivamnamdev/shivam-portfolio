// lib/examGraders.ts
// Server-only. The exam graders are Python scripts that run next to the learner's code inside the sandbox in
// lib/runExam.ts. They must never be imported from a client file: that would ship the answers to every browser.
// A grader gets the learner's file as text (_exam_code) and its namespace (_learner_ns), marks by behaviour, sets the
// global `score` (0-100) and prints EXAM_SCORE:<n> for the report. See lib/examGraderBatch1.ts and docs/architecture/exam-grader-behaviour.md.

import { PYTHON_BATCH_1_FINAL } from "./examGraderBatch1";


// ---- the exam library (docs/architecture/exam-library.md, step 1) ----------------------------------------------------------------------------
// Each grader has an exam id. A course uses the exam named by its curriculum (`examId`, chosen in the portal) and, until one is chosen, the
// default below. Learner results stay per course (exam_progress is keyed by course slug), so two courses sharing an exam never share results.
// `links` are the exam's own files: the lesson that uses the exam gets them as its assignment (title, questions, add-on, expected result), so they are never typed again.
export type ExamLinks = { title: string; rawUrl: string; starterCodeUrl: string; expectedOutcomeUrl: string };
type LibraryExam = { title: string; questions: number; script: string; links: ExamLinks };
const BATCH_1_BASE = "https://raw.githubusercontent.com/shivamnamdev/Assignments/refs/heads/main/python-basics/";
const EXAM_LIBRARY: Record<string, LibraryExam> = {
  "python-batch-1-final": {
    title: "Python Batch 1 final exam", questions: 5, script: PYTHON_BATCH_1_FINAL,
    links: { title: "Final Foundation Certification Exam", rawUrl: `${BATCH_1_BASE}v1.docx`, starterCodeUrl: `${BATCH_1_BASE}v1_addon.docx`, expectedOutcomeUrl: `${BATCH_1_BASE}v1_expected_result.py` },
  },
};
export const COURSE_EXAM: Record<string, string> = { "python-beginners": "python-batch-1-final" };

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
export const examIdExists = (id: string): boolean => has(EXAM_LIBRARY, id);
export const graderFor = (examId: string): string | undefined => (has(EXAM_LIBRARY, examId) ? EXAM_LIBRARY[examId].script : undefined);
/** What the portal may show: id, title, number of questions and the exam's files. Never the script. */
export const examList = (): Array<{ id: string; title: string; questions: number; links: ExamLinks }> => Object.entries(EXAM_LIBRARY).map(([id, e]) => ({ id, title: e.title, questions: e.questions, links: { ...e.links } }));
/** The files a lesson gets when it uses this exam, or undefined for an unknown id. */
export const examLinks = (examId: string): ExamLinks | undefined => (has(EXAM_LIBRARY, examId) ? { ...EXAM_LIBRARY[examId].links } : undefined);
export const courseDefaultExam = (courseSlug: string): string | undefined => (has(COURSE_EXAM, courseSlug) ? COURSE_EXAM[courseSlug] : undefined);
/** The exam a course is graded with: the one its published curriculum names (if it still exists in the library), else the course's default. */
export const resolveExamId = (courseSlug: string, publishedExamId?: string | null): string | undefined =>
  publishedExamId && examIdExists(publishedExamId) ? publishedExamId : courseDefaultExam(courseSlug);
