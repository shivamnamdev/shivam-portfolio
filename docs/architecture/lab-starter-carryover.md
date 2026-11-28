# Starter code for every step of a carry-over lab

Status: built 2026-11-26 (SCP-124, branch `feat/SCP-124-carryover-starter-steps`); Blueprint approved by the owner (`# @clear` kept).

## 1. Why

In a Python lab with "carry over code" switched on (for example Python batch 2), the learner keeps one editor for all steps. Today only the first section of the starter file is ever shown. When the learner moves to step 2, 3, ... the editor is left exactly as it is, so the starter sections for later steps are never used. A blank section between two `# ----------` lines is also thrown away when the file is read, so every later section moves up by one step.

The owner wants one starter file to serve a whole carry-over video: a step either brings new starter code, or carries on with what the learner wrote.

## 2. Discovery answers (CONSTITUTION section 3)

1. North star: in a carry-over lab, each step of the starter file can add its own starter code or leave the learner's code alone, and blank sections no longer shift the steps.
2. Integrations: none new. GitHub raw files (already used), no SQL, no new package, no env var.
3. Source of truth: the starter file at `starterCodeUrl` (authors write it); the learner's editor content lives in the existing draft (`localStorage`) and the saved submission.
4. Delivery payload: the Python lab editor on `/learning/[slug]`.
5. Behavioural rules (owner answers, 2026-11-26): applies to lessons with `carryOverCode` only; markers `# @carry` and `# @clear` in addition to the blank section; a step's starter code is **added under** the learner's code, never replacing it.

## 3. The rule (author view)

The starter file is split on lines of `# ----------` (ten or more dashes), as today. Section n belongs to step n. For a carry-over lesson:

| Section content | What the learner gets when they reach that step |
|---|---|
| Blank (only spaces or lines) | Nothing changes: their code carries over |
| `# @carry` alone | The same, written out |
| `# @clear` alone | The editor is set to the plain template (`# Write your Python code below:`). This is the only marker that removes learner code |
| Anything else | That text is **added below** the learner's code (one blank line between), once |

Section 1 works as today: it is the editor's first content (blank or `# @carry` gives the plain template; `# @clear` the same). A step with no section (file shorter than the lesson) carries over.

Other labs (no carry-over) keep today's reading of the file, unchanged.

## 4. Data shapes (CONSTITUTION section 3, data-first)

New pure module `lib/labStarter.ts`:

```ts
export type StarterStep =
  | { kind: "carry" }
  | { kind: "clear" }
  | { kind: "code"; code: string };

// Splits the starter file; blank sections are KEPT (unlike the old reader).
export function parseStarterSteps(raw: string): StarterStep[];

// What the editor holds after the learner moves forward to step `toIndex` (0-based).
// `applied` = step indexes already handled (index 0 counts as handled at load).
export function advanceStarter(input: {
  steps: StarterStep[]; current: string; toIndex: number; applied: number[];
}): { code: string; applied: number[] };
```

Rules inside `advanceStarter`:
- Handles every step that is not in `applied` from 1 up to `toIndex`, in order (so jumping from step 1 to step 3 brings steps 2 and 3).
- `carry` or a missing step: no change, marked handled.
- `code`: appended after `current` with a blank line between, unless the learner's code already contains that text exactly (so a restored submission never doubles it); marked handled.
- `clear`: `current` becomes the plain template; marked handled.
- Moving back (`toIndex` lower than before) changes nothing.

Draft shape in `localStorage` (`course-player-<slug>-assignment-<lessonId>`) gains an optional field `appliedStarterSteps: number[]`. Older drafts without it work: the "already contains" check prevents doubling.

## 5. Where it changes

- `lib/labStarter.ts` (new, pure, unit tested).
- `app/learning/[slug]/page.tsx`: when the lesson is carry-over, `loadGithubAssignment` reads the starter file with `parseStarterSteps`; `handleStepChange` calls `advanceStarter` on a forward move and sets the editor; the draft saves and restores `appliedStarterSteps`.
- Docs: `docs/CONTENT_MANAGEMENT.md` (how to write the starter file), this file, `docs/testing/CHANGELOG.md`, CONSTITUTION maintenance log.

## 6. Tests (ship with the code)

Unit, `tests/unit/lab-starter.spec.ts` (LABS-UNIT-*): blank section kept (no shifting); markers in any letter case and with spaces; leading and trailing separators; Windows line ends; blank and `# @carry` leave code alone; code is appended with one blank line, once; going back changes nothing; jump from step 1 to 3 handles step 2 then 3; restored code that already contains the starter is not doubled; `# @clear` resets; file shorter than the lesson carries over; a lesson without carry-over keeps today's reading.

UI, a Playwright spec in `tests/ui/admin/` (ADMUI-STC-005): a carry-over lesson with starter sections (code, blank, code); type real code with the keyboard, move to the next step (nothing changes), then to the last step (starter appended under the typed code, both visible on screen), go back and forward (not added twice).

## 7. Risks and what is not changing

- Learners mid-lesson with a saved draft: their code is never removed except by `# @clear`, which the author writes on purpose.
- The step list for the lesson comes from the assignment file; sections beyond it are ignored.
- Solutions and expected-outcome files are read as today.
- Not touched: pricing, payments, auth, the database, flags.
- Known gap: the owner's `agents/` skills submodule is not checked out here, so the curated skills could not be read; the repo code and docs were used instead.

## 8. Built

- `lib/labStarter.ts` (`parseStarterSteps`, `initialStarter`, `advanceStarter`), unit tests LABS-UNIT-001..013 (`tests/unit/lab-starter.spec.ts`).
- `app/learning/[slug]/page.tsx`: carry-over lessons read the starter file with `parseStarterSteps`; the Next button calls `advanceStarter`; the draft stores `appliedStarterSteps`.
- UI tests ADMUI-COS-001..003 (`tests/ui/admin/admin-carryover-starter.spec.ts`): real keystrokes, text checked on screen, reload, back and forth, `# @clear`.
- Small rule added while building: when the editor holds only the plain template, a step's code replaces the template instead of sitting under its comment (LABS-UNIT-012).
- Known limit: "already there" is a plain text match, so a starter that is a piece of text the learner already wrote is not added again.
- Content authors: `docs/CONTENT_MANAGEMENT.md`.

## 9. Addendum 2026-11-28: `# @clear` with code (SCP-125)

Owner's starter file wrote `# @clear` as the first line of a section with code under it (to start again with new code in one step). The first version only knew `# @clear` as the whole section, so the marker line and the code were added under the learner's code. Rule now: a section whose first line is `# @clear` and that has code below resets the editor to **only that code** (marker line removed, no template comment). `# @clear` with nothing else is still the plain reset. Works in any step, also two in a row; a blank step after it keeps the learner's new work. Same for section 1 (the editor opens with the code). Type: `{ kind: "clear"; code?: string }` in `lib/labStarter.ts`. Tests: LABS-UNIT-014..016, ADMUI-COS-004. No SQL, no new package.

