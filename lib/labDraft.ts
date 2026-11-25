// A saved lab draft counts only when the learner (or a starter file) put real code in it. The plain template the editor opens with when no starter could be read
// is not real code: saving it as a "draft" made it win over a starter file added later (a lab first opened without its starter never showed the starter).
export const LAB_PLACEHOLDER = "# Write your Python code below:";

export type LabStepFiles = Array<Record<string, string> | null | undefined> | null | undefined;

export function hasRealCode(text: string | null | undefined): boolean {
  const t = (text ?? "").trim();
  return t.length > 0 && t !== LAB_PLACEHOLDER;
}

export function hasMeaningfulDraft(steps: LabStepFiles): boolean {
  if (!Array.isArray(steps)) return false;
  return steps.some((step) => !!step && Object.keys(step).some((key) => hasRealCode(step[key])));
}
