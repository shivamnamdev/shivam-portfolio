// lib/examRule.ts
// Pure rule for the certificate (owner decision 2026-11-14): an exam is optional for a course. When the course has one, the learner must pass it to get the
// certificate; when it has none (for example Git today), 80% of the tasks is enough. No database here, so it is unit-tested and shared by the server route and the page.
export const CERTIFICATE_MIN_PERCENT = 80;

type LegacyLayout = Array<{ githubAssignments?: Record<string, { isExam?: boolean; serverGraded?: boolean } | undefined> }> | null | undefined;

// An exam the server can mark. A new exam made of pasted files has no grader (exam library step 2, rule X4): it is shown as the final exam but never required.
export const isGradedExam = (a: { isExam?: boolean; serverGraded?: boolean } | null | undefined): boolean => a?.isExam === true && a?.serverGraded === true;

// Does the course's lesson layout (the data-file shape the learner pages read) hold an exam the server marks?
export const layoutHasExam = (layout: LegacyLayout): boolean =>
  (layout ?? []).some((m) => Object.values(m.githubAssignments ?? {}).some((a) => isGradedExam(a)));

export const certificateAllowed = (percent: number, examRequired: boolean, examPassed: boolean): boolean =>
  percent >= CERTIFICATE_MIN_PERCENT && (!examRequired || examPassed);
