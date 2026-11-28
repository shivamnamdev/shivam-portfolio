// lib/labStarter.ts
// The starter file of a carry-over Python lab, step by step (docs/architecture/lab-starter-carryover.md). Pure: no browser, no network.
// The file is split on lines of "# ----------" (ten or more dashes). Section n belongs to step n:
//   blank or "# @carry"  -> the learner's code carries on, nothing is added
//   "# @clear"           -> the editor is set to the plain template (the only marker that removes learner code)
//   "# @clear" as the first line, code below -> the editor is reset and shows only that code
//   anything else        -> added below the learner's code, once
import { LAB_PLACEHOLDER, hasRealCode } from "./labDraft";

export type StarterStep = { kind: "carry" } | { kind: "clear"; code?: string } | { kind: "code"; code: string };

const TEMPLATE = `${LAB_PLACEHOLDER}\n\n`;
const SEPARATOR = /^#[ \t]*-{10,}[ \t]*$/m;   // the same line the lesson files use today
const CARRY = /^#\s*@carry$/i;
const CLEAR = /^#\s*@clear$/i;
const CLEAR_FIRST_LINE = /^#[ \t]*@clear[ \t]*\n([\s\S]+)$/i;   // "# @clear" on the first line, code below it

// Blank sections are KEPT (the older reader dropped them, which moved every later section up by one step).
export function parseStarterSteps(raw: string): StarterStep[] {
  const text = (raw ?? "").replace(/\r\n?/g, "\n");
  return text.split(SEPARATOR).map((section): StarterStep => {
    const t = section.trim();
    if (!t || CARRY.test(t)) return { kind: "carry" };
    if (CLEAR.test(t)) return { kind: "clear" };
    const withCode = CLEAR_FIRST_LINE.exec(t);
    if (withCode && withCode[1].trim()) return { kind: "clear", code: withCode[1].trim() };
    return { kind: "code", code: t };
  });
}

// What the editor holds when the lab opens: the first section's code, or the plain template.
export function initialStarter(steps: StarterStep[]): string {
  const first = steps[0];
  if (first && first.kind === "code") return first.code;
  if (first && first.kind === "clear" && first.code) return first.code;
  return TEMPLATE;
}

// What the editor holds after the learner moves forward to step `toIndex` (0-based). `applied` lists the steps already handled
// (step 0 is handled when the lab opens). Every step from 1 up to `toIndex` that is not handled yet is handled in order, so a jump
// from step 1 to step 3 brings step 2 and then step 3. Moving back changes nothing.
export function advanceStarter(input: { steps: StarterStep[]; current: string; toIndex: number; applied: number[] }): { code: string; applied: number[] } {
  const done = new Set(input.applied);
  let code = typeof input.current === "string" ? input.current : "";
  for (let i = 1; i <= input.toIndex; i++) {
    if (done.has(i)) continue;
    done.add(i);
    const step = input.steps[i];
    if (!step || step.kind === "carry") continue;
    if (step.kind === "clear") { code = step.code ? `${step.code}\n` : TEMPLATE; continue; }
    if (code.includes(step.code)) continue;   // already there, for example from a restored submission
    code = hasRealCode(code) ? `${code.replace(/\s+$/, "")}\n\n${step.code}\n` : `${step.code}\n`;
  }
  return { code, applied: Array.from(done).sort((a, b) => a - b) };
}
