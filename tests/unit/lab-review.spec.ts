import { test, expect } from '@playwright/test';
import { buildReviewSteps } from '../../lib/labReview';
import { LAB_PLACEHOLDER } from '../../lib/labDraft';

// Unit level: the step list of the solution and code review window (SCP-126). No browser, no network.
const TEMPLATE = `${LAB_PLACEHOLDER}\n\n`;
const base = { stepCount: 3, stepFiles: [], currentIndex: 2, currentFiles: { 'main.py': 'c = 3' }, solutions: ['s1', 's2', 's3'], carryOver: false };

test.describe('lab review steps @unit', () => {
  test('[LABS-UNIT-020] every step is listed with its own code and its own solution, the open step uses the editor text', () => {
    const r = buildReviewSteps({ ...base, stepFiles: [{ 'main.py': 'a = 1' }, { 'main.py': 'b = 2' }, { 'main.py': 'stale' }] });
    expect(r.sharedCode).toBeNull();
    expect(r.steps.map(s => [s.step, s.code, s.solution])).toEqual([[1, 'a = 1', 's1'], [2, 'b = 2', 's2'], [3, 'c = 3', 's3']]);
    expect(r.steps.every(s => s.hasCode)).toBe(true);
  });

  test('[LABS-UNIT-021] a step with no code (nothing, template only, missing entry) is flagged and does not throw', () => {
    const r = buildReviewSteps({ ...base, stepFiles: [{ 'main.py': TEMPLATE }, undefined, { 'main.py': 'x' }] });
    expect(r.steps.map(s => s.hasCode)).toEqual([false, false, true]);
    expect(r.steps[1].code).toBe('');
  });

  test('[LABS-UNIT-022] the list covers the longer of the assignment steps and the solution steps; a missing or blank solution is null', () => {
    const more = buildReviewSteps({ ...base, stepCount: 2, solutions: ['s1', '   ', 's3', 's4'], stepFiles: [], currentFiles: { 'main.py': 'q' }, currentIndex: 0 });
    expect(more.steps).toHaveLength(4);
    expect(more.steps.map(s => s.solution)).toEqual(['s1', null, 's3', 's4']);
    const fewer = buildReviewSteps({ ...base, stepCount: 3, solutions: ['only'] });
    expect(fewer.steps.map(s => s.solution)).toEqual(['only', null, null]);
    expect(buildReviewSteps({ ...base, stepCount: 0, solutions: [] }).steps).toHaveLength(1);
  });

  test('[LABS-UNIT-023] a carry-over lab shows the one shared code once and every step solution', () => {
    const r = buildReviewSteps({ ...base, carryOver: true, currentFiles: { 'main.py': 'shared = 1' } });
    expect(r.sharedCode).toBe('shared = 1');
    expect(r.steps.map(s => [s.code, s.solution])).toEqual([[null, 's1'], [null, 's2'], [null, 's3']]);
  });

  test('[LABS-UNIT-024] the input is not changed', () => {
    const files = [{ 'main.py': 'a' }];
    const copy = JSON.stringify({ files, base });
    buildReviewSteps({ ...base, stepFiles: files });
    expect(JSON.stringify({ files, base })).toBe(copy);
  });
});
