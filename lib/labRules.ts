// lib/labRules.ts
// Rules of the Python lab that both the page and the server apply (docs/testing/prd/07-ui-learning-experience.md, SCP-54 and SCP-56).
// Pure functions: no database, no network.

export const NO_CODE_MESSAGE = "Write some code first.";

// The page joins the files of every step into one text with these marker lines; they are not code.
const MARKER = /^\s*#\s*(---\s*File:.*---|===\s*Step\s*\d+\s*===|No code provided)\s*$/i;

// True when the submitted text holds at least one line of code that is not a marker or blank (SCP-56: an empty editor is not a submission).
export function hasCode(submitted: unknown): boolean {
  if (typeof submitted !== "string") return false;
  return submitted.split("\n").some((line) => line.trim().length > 0 && !MARKER.test(line));
}

// The official solution is shown only after the learner has submitted this lesson (SCP-54).
export function canViewSolution(submission: unknown): boolean {
  return typeof submission === "string" && submission.trim().length > 0;
}
