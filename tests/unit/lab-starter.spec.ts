import { test, expect } from '@playwright/test';
import { advanceStarter, initialStarter, parseStarterSteps } from '../../lib/labStarter';
import { LAB_PLACEHOLDER } from '../../lib/labDraft';

// Unit level: the starter file of a carry-over lab, step by step. No browser, no network.
const SEP = '# ----------';
const TEMPLATE = `${LAB_PLACEHOLDER}\n\n`;

test.describe('lab starter steps @unit', () => {
  test('[LABS-UNIT-001] a blank section is kept as a step, so later sections do not shift', () => {
    const steps = parseStarterSteps(`a = 1\n${SEP}\n\n${SEP}\nb = 2\n`);
    expect(steps).toEqual([{ kind: 'code', code: 'a = 1' }, { kind: 'carry' }, { kind: 'code', code: 'b = 2' }]);
  });

  test('[LABS-UNIT-002] # @carry and # @clear are read in any letter case and spacing; other comments are code', () => {
    const steps = parseStarterSteps(`# @CARRY\n${SEP}\n#@clear\n${SEP}\n#   @Carry  \n${SEP}\n# just a note\n${SEP}\n# @carry and more`);
    expect(steps).toEqual([
      { kind: 'carry' }, { kind: 'clear' }, { kind: 'carry' },
      { kind: 'code', code: '# just a note' }, { kind: 'code', code: '# @carry and more' },
    ]);
  });

  test('[LABS-UNIT-003] leading and trailing separators and Windows line ends are handled', () => {
    expect(parseStarterSteps(`${SEP}\nx = 1\n${SEP}\n`)).toEqual([{ kind: 'carry' }, { kind: 'code', code: 'x = 1' }, { kind: 'carry' }]);
    expect(parseStarterSteps(`a = 1\r\n${SEP}\r\n\r\n${SEP}\r\nb = 2\r\n`)).toEqual([{ kind: 'code', code: 'a = 1' }, { kind: 'carry' }, { kind: 'code', code: 'b = 2' }]);
    expect(parseStarterSteps('')).toEqual([{ kind: 'carry' }]);
    expect(parseStarterSteps('x = 1')).toEqual([{ kind: 'code', code: 'x = 1' }]);
  });

  test('[LABS-UNIT-004] the first section sets the editor: code as written, blank, carry and clear give the plain template', () => {
    expect(initialStarter(parseStarterSteps('x = 1'))).toBe('x = 1');
    expect(initialStarter(parseStarterSteps(`\n${SEP}\ny = 2`))).toBe(TEMPLATE);
    expect(initialStarter(parseStarterSteps(`# @carry\n${SEP}\ny = 2`))).toBe(TEMPLATE);
    expect(initialStarter(parseStarterSteps(`# @clear\n${SEP}\ny = 2`))).toBe(TEMPLATE);
    expect(initialStarter([])).toBe(TEMPLATE);
  });

  test('[LABS-UNIT-005] a blank or # @carry step leaves the learner code alone', () => {
    const steps = parseStarterSteps(`a = 1\n${SEP}\n\n${SEP}\n# @carry`);
    const r = advanceStarter({ steps, current: 'a = 1\nprint(a)', toIndex: 2, applied: [0] });
    expect(r.code).toBe('a = 1\nprint(a)');
    expect(r.applied).toEqual([0, 1, 2]);
  });

  test('[LABS-UNIT-006] a step with code is added below the learner code with one blank line, once', () => {
    const steps = parseStarterSteps(`a = 1\n${SEP}\nb = a * 2`);
    const first = advanceStarter({ steps, current: 'a = 1\nprint(a)\n\n\n', toIndex: 1, applied: [0] });
    expect(first.code).toBe('a = 1\nprint(a)\n\nb = a * 2\n');
    expect(first.applied).toEqual([0, 1]);
    const again = advanceStarter({ steps, current: first.code, toIndex: 1, applied: first.applied });
    expect(again.code).toBe(first.code);
  });

  test('[LABS-UNIT-007] moving back changes nothing, and coming forward again does not add it twice', () => {
    const steps = parseStarterSteps(`a = 1\n${SEP}\nb = 2\n${SEP}\nc = 3`);
    const atThree = advanceStarter({ steps, current: 'a = 1', toIndex: 2, applied: [0] });
    const back = advanceStarter({ steps, current: atThree.code, toIndex: 0, applied: atThree.applied });
    expect(back.code).toBe(atThree.code);
    const forward = advanceStarter({ steps, current: back.code, toIndex: 2, applied: back.applied });
    expect(forward.code).toBe(atThree.code);
  });

  test('[LABS-UNIT-008] jumping from step 1 to step 3 brings step 2 and then step 3, in order', () => {
    const steps = parseStarterSteps(`a = 1\n${SEP}\nb = 2\n${SEP}\nc = 3`);
    const r = advanceStarter({ steps, current: 'a = 1', toIndex: 2, applied: [0] });
    expect(r.code).toBe('a = 1\n\nb = 2\n\nc = 3\n');
    expect(r.applied).toEqual([0, 1, 2]);
  });

  test('[LABS-UNIT-009] code the learner already has (a restored submission) is not doubled', () => {
    const steps = parseStarterSteps(`a = 1\n${SEP}\nb = 2`);
    const r = advanceStarter({ steps, current: 'a = 1\n\nb = 2\nprint(b)', toIndex: 1, applied: [0] });
    expect(r.code).toBe('a = 1\n\nb = 2\nprint(b)');
    expect(r.applied).toEqual([0, 1]);
  });

  test('[LABS-UNIT-010] # @clear resets the editor to the plain template and only that marker removes learner code', () => {
    const steps = parseStarterSteps(`a = 1\n${SEP}\n# @clear\n${SEP}\nc = 3`);
    const r = advanceStarter({ steps, current: 'a = 1\nprint(a)', toIndex: 1, applied: [0] });
    expect(r.code).toBe(TEMPLATE);
    const next = advanceStarter({ steps, current: r.code, toIndex: 2, applied: r.applied });
    expect(next.code).toBe('c = 3\n');
  });

  test('[LABS-UNIT-011] a step with no section (starter file shorter than the lesson) carries over', () => {
    const steps = parseStarterSteps('a = 1');
    const r = advanceStarter({ steps, current: 'a = 1\nmore', toIndex: 3, applied: [0] });
    expect(r.code).toBe('a = 1\nmore');
    expect(r.applied).toEqual([0, 1, 2, 3]);
  });

  test('[LABS-UNIT-012] when the editor holds only the plain template, the step code replaces it instead of sitting under the comment', () => {
    const steps = parseStarterSteps(`\n${SEP}\nb = 2`);
    const r = advanceStarter({ steps, current: TEMPLATE, toIndex: 1, applied: [0] });
    expect(r.code).toBe('b = 2\n');
  });

  test('[LABS-UNIT-013] the input is not changed and bad input does not throw', () => {
    const steps = parseStarterSteps(`a = 1\n${SEP}\nb = 2`);
    const applied = [0];
    advanceStarter({ steps, current: 'a = 1', toIndex: 1, applied });
    expect(applied).toEqual([0]);
    expect(advanceStarter({ steps: [], current: 'x', toIndex: 2, applied: [] }).code).toBe('x');
    expect(advanceStarter({ steps, current: undefined as unknown as string, toIndex: 1, applied: [0] }).code).toBe('b = 2\n');
    expect(advanceStarter({ steps, current: 'x', toIndex: -1, applied: [0] }).code).toBe('x');
  });
});
