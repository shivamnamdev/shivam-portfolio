import { test, expect } from '@playwright/test';
import { canViewSolution, hasCode, NO_CODE_MESSAGE } from '../../lib/labRules';

// Unit level: the Python lab rules (SCP-54, SCP-56). No database, no network.
test.describe('Python lab rules @unit', () => {
  test('[LABR-UNIT-001] hasCode: real code is accepted, also with the file and step markers around it', () => {
    expect(hasCode("print('hi')")).toBe(true);
    expect(hasCode("# --- File: main.py ---\nprint('hi')")).toBe(true);
    expect(hasCode("# === Step 1 ===\n# --- File: main.py ---\n\n\n# === Step 2 ===\n# --- File: main.py ---\nx = 1")).toBe(true);
  });

  test('[LABR-UNIT-002] hasCode: an empty editor is not code, however many markers and blank lines surround it', () => {
    expect(hasCode('')).toBe(false);
    expect(hasCode('   \n\n  ')).toBe(false);
    expect(hasCode("# --- File: main.py ---\n")).toBe(false);
    expect(hasCode("# --- File: main.py ---\n   \n\n# --- File: helper.py ---\n")).toBe(false);
    expect(hasCode("# === Step 1 ===\n# --- File: main.py ---\n\n# === Step 2 ===\n# --- File: main.py ---\n# No code provided")).toBe(false);
  });

  test('[LABR-UNIT-003] hasCode: a comment the learner wrote counts as content; a non-string never does', () => {
    expect(hasCode("# --- File: main.py ---\n# my plan")).toBe(true);
    expect(hasCode(undefined)).toBe(false);
    expect(hasCode(null)).toBe(false);
    expect(hasCode(42)).toBe(false);
  });

  test('[LABR-UNIT-004] canViewSolution: only after a submission exists for the lesson', () => {
    expect(canViewSolution("print(1)")).toBe(true);
    expect(canViewSolution(undefined)).toBe(false);
    expect(canViewSolution(null)).toBe(false);
    expect(canViewSolution('')).toBe(false);
    expect(canViewSolution('   ')).toBe(false);
  });

  test('[LABR-UNIT-005] the refusal text is the one the page and the server show', () => {
    expect(NO_CODE_MESSAGE).toBe('Write some code first.');
  });
});
