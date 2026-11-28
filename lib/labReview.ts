// lib/labReview.ts
// The "Official Solution & Code Review" window after a submit: every step of the lab, with the learner's code and the instructor's
// solution for that step (SCP-126). Pure: no browser, no network.
import { hasRealCode } from "./labDraft";

export type ReviewStep = {
  step: number;               // 1-based, as the learner sees it
  code: string | null;        // main.py of that step; null for a carry-over lab (one shared editor, see `sharedCode`)
  hasCode: boolean;           // false when the step only holds the plain template or nothing
  solution: string | null;    // the instructor's solution for the step, null when the file has none
};

export type ReviewInput = {
  stepCount: number;                                        // steps of the assignment file
  stepFiles: Array<Record<string, string> | undefined>;     // saved files per step
  currentIndex: number;                                     // the step open in the editor
  currentFiles: Record<string, string>;                     // what the editor holds now (newer than stepFiles[currentIndex])
  solutions: string[];                                      // official solution, one entry per step
  carryOver: boolean;
};

export function buildReviewSteps(input: ReviewInput): { steps: ReviewStep[]; sharedCode: string | null } {
  const count = Math.max(1, input.stepCount, input.solutions.length);
  const mainOf = (files?: Record<string, string>) => (files && typeof files["main.py"] === "string" ? files["main.py"] : "");
  const steps: ReviewStep[] = Array.from({ length: count }, (_, i) => {
    const solution = typeof input.solutions[i] === "string" && input.solutions[i].trim() ? input.solutions[i] : null;
    if (input.carryOver) return { step: i + 1, code: null, hasCode: false, solution };
    const code = mainOf(i === input.currentIndex ? input.currentFiles : input.stepFiles[i]);
    return { step: i + 1, code, hasCode: hasRealCode(code), solution };
  });
  return { steps, sharedCode: input.carryOver ? mainOf(input.currentFiles) : null };
}
