import { test, expect } from '@playwright/test';
import { hasMeaningfulDraft, hasRealCode, LAB_PLACEHOLDER } from '../../lib/labDraft';

// Unit level: which saved lab drafts may replace a starter file. No browser, no network.
test.describe('lab draft rule @unit', () => {
  test('[LABD-UNIT-001] the plain template and blank text are not real code', () => {
    expect(hasRealCode(LAB_PLACEHOLDER)).toBe(false);
    expect(hasRealCode(`${LAB_PLACEHOLDER}\n\n`)).toBe(false);
    expect(hasRealCode('   \n')).toBe(false);
    expect(hasRealCode('')).toBe(false);
    expect(hasRealCode(undefined)).toBe(false);
    expect(hasRealCode(null)).toBe(false);
  });

  test('[LABD-UNIT-002] anything the learner typed, even next to the template, is real code', () => {
    expect(hasRealCode('print("hi")')).toBe(true);
    expect(hasRealCode(`${LAB_PLACEHOLDER}\nprint(1)`)).toBe(true);
    expect(hasRealCode('def login(u, p):\n    pass')).toBe(true);
  });

  test('[LABD-UNIT-003] a draft of only the template is not a draft, so a starter file is not hidden by it', () => {
    expect(hasMeaningfulDraft([{ 'main.py': `${LAB_PLACEHOLDER}\n\n` }])).toBe(false);
    expect(hasMeaningfulDraft([{ 'main.py': `${LAB_PLACEHOLDER}\n\n` }, { 'main.py': '' }])).toBe(false);
  });

  test('[LABD-UNIT-004] a draft with real code in any step or any file is kept', () => {
    expect(hasMeaningfulDraft([{ 'main.py': `${LAB_PLACEHOLDER}\n\n` }, { 'main.py': 'x = 1' }])).toBe(true);
    expect(hasMeaningfulDraft([{ 'main.py': `${LAB_PLACEHOLDER}\n\n`, 'utils.py': 'def f(): pass' }])).toBe(true);
  });

  test('[LABD-UNIT-005] missing or malformed input is not a draft', () => {
    expect(hasMeaningfulDraft(undefined)).toBe(false);
    expect(hasMeaningfulDraft(null)).toBe(false);
    expect(hasMeaningfulDraft([])).toBe(false);
    expect(hasMeaningfulDraft([null, undefined])).toBe(false);
    expect(hasMeaningfulDraft({} as never)).toBe(false);
  });
});
