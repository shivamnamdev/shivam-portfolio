// lib/examResult.ts
// What the learner is told after an exam submission (SCP-115). One pure function decides the tone, the title and the words, so the screen,
// the e-mail and the tests all agree. 80 and above is a pass; the green celebration is for that only.
export const PASS_MARK = 80;
export const MAX_ATTEMPTS = 5;

export type ExamResultView = {
  passed: boolean;            // this attempt reached the passing score
  tone: "pass" | "fail";
  title: string;
  message: string;
  attemptsLeft: number;
  headline: string;           // "Passing score: 80%"
};

const MOTIVATION = [
  "Every expert was once stuck on this exact exam. Read the notes below, fix one thing at a time and try again.",
  "A lower score is information, not a verdict: the notes show exactly what to work on next.",
  "You are closer than you think. Run your code on different data of your own before you submit again.",
  "Good programmers debug, they do not give up. Pick the first question marked to improve and start there.",
  "Progress is built attempt by attempt. Take a short break, then come back with fresh eyes.",
];

export const attemptsLeft = (attemptsUsed: number): number => Math.max(0, MAX_ATTEMPTS - Math.max(0, Math.floor(attemptsUsed)));

/** `attemptsUsed` counts this attempt. `alreadyPassed` is a pass stored from an earlier attempt (a later low score never takes it away). */
export function examResultView(score: number, attemptsUsed: number, alreadyPassed = false): ExamResultView {
  const s = Number.isFinite(score) ? Math.min(100, Math.max(0, Math.round(score))) : 0;
  const left = attemptsLeft(attemptsUsed);
  const headline = `Passing score: ${PASS_MARK}%`;
  if (s >= PASS_MARK) {
    return { passed: true, tone: "pass", title: `You passed with ${s}%!`, message: "Excellent work. All Advanced videos are now unlocked.", attemptsLeft: left, headline };
  }
  const note = MOTIVATION[(Math.max(1, Math.floor(attemptsUsed)) - 1) % MOTIVATION.length];
  const tail = alreadyPassed ? "Your earlier pass still stands." : left > 0 ? `You have ${left} attempt${left === 1 ? "" : "s"} left.` : "You have used all your attempts.";
  return { passed: false, tone: "fail", title: `You scored ${s}%. Not there yet.`, message: `${note} ${tail}`, attemptsLeft: left, headline };
}
