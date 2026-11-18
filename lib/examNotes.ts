// lib/examNotes.ts
// The grader prints one line "EXAM_FEEDBACK:<json>" with a note per question (SCP-115). This reads it out of the report: the notes go
// to the learner, the e-mail and the admin portal, and the line itself is removed from the report the learner sees. A missing or broken
// line gives no notes and never an error.
export type ExamNote = { q: number; label: string; passed: boolean; note: string };

const MAX_NOTES = 20;
const MAX_NOTE_CHARS = 600;
const LINE = /^EXAM_FEEDBACK:(.*)$/m;

export function splitFeedback(report: string): { report: string; notes: ExamNote[] } {
  const m = LINE.exec(report);
  if (!m) return { report, notes: [] };
  const cleaned = report.replace(LINE, "").replace(/\n{3,}/g, "\n\n");
  let parsed: unknown;
  try { parsed = JSON.parse(m[1]); } catch { return { report: cleaned, notes: [] }; }
  return { report: cleaned, notes: cleanNotes(parsed) };
}

/** Notes from any source (the grader's line, the database): only well-formed entries survive, capped in number and length, sorted by question. */
export function cleanNotes(value: unknown): ExamNote[] {
  if (!Array.isArray(value)) return [];
  const notes: ExamNote[] = [];
  for (const n of value.slice(0, MAX_NOTES)) {
    if (!n || typeof n !== "object") continue;
    const { q, label, passed, note } = n as Record<string, unknown>;
    if (typeof q !== "number" || !Number.isInteger(q) || typeof label !== "string" || typeof passed !== "boolean" || typeof note !== "string") continue;
    notes.push({ q, label: label.slice(0, 80), passed, note: note.slice(0, MAX_NOTE_CHARS) });
  }
  return notes.sort((a, b) => a.q - b.q);
}

/** The improvement note as plain text (the attachment of the e-mail and the text the admin portal shows). */
export function notesAsText(notes: ExamNote[], score: number, passMark: number): string {
  const lines = [`Score: ${score}% (passing score: ${passMark}%)`, ""];
  if (notes.length === 0) lines.push("No per-question notes were produced for this attempt.");
  for (const n of notes) lines.push(`${n.passed ? "[OK]     " : "[IMPROVE]"} ${n.label}: ${n.note}`);
  return lines.join("\n") + "\n";
}
