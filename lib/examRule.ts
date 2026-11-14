// lib/examRule.ts
// Pure rule for the certificate (owner decision 2026-11-14): an exam is optional for a course. When the course has one, the learner must pass it to get the
// certificate; when it has none (for example Git today), 80% of the tasks is enough. No database here, so it is unit-tested and shared by the server route and the page.
export const CERTIFICATE_MIN_PERCENT = 80;

type LegacyLayout = Array<{ githubAssignments?: Record<string, { isExam?: boolean } | undefined> }> | null | undefined;

// Does the course's lesson layout (the data-file shape the learner pages read) hold an exam?
export const layoutHasExam = (layout: LegacyLayout): boolean =>
  (layout ?? []).some((m) => Object.values(m.githubAssignments ?? {}).some((a) => a?.isExam === true));

export const certificateAllowed = (percent: number, examRequired: boolean, examPassed: boolean): boolean =>
  percent >= CERTIFICATE_MIN_PERCENT && (!examRequired || examPassed);
