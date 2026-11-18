import { test, expect } from '@playwright/test';
import { examResultView, attemptsLeft, PASS_MARK, MAX_ATTEMPTS } from '../../lib/examResult';
import { splitFeedback, notesAsText } from '../../lib/examNotes';

// SCP-115 · what the learner is told after an exam submission, and how the grader's per-question notes are read. No database, no network.
test.describe('Exam result and notes @unit', () => {
  test('[EXR-UNIT-001] 80 and above is a pass (green), 79 and below is not (red); the boundary is exact', () => {
    expect(PASS_MARK).toBe(80);
    for (const s of [80, 90, 100]) expect(examResultView(s, 1)).toMatchObject({ passed: true, tone: 'pass' });
    for (const s of [0, 40, 79]) expect(examResultView(s, 1)).toMatchObject({ passed: false, tone: 'fail' });
    expect(examResultView(80, 1).headline).toBe('Passing score: 80%');
  });

  test('[EXR-UNIT-002] a fail carries a motivational note and the attempts left; the last attempt says none are left', () => {
    const v = examResultView(60, 1);
    expect(v.attemptsLeft).toBe(4);
    expect(v.message).toMatch(/You have 4 attempts left\./);
    expect(examResultView(60, 4).message).toMatch(/You have 1 attempt left\./);
    expect(examResultView(60, MAX_ATTEMPTS).message).toMatch(/used all your attempts/);
    expect(examResultView(60, 1).message).not.toBe(examResultView(60, 2).message.replace(/ You have.*/, '') + ' You have 4 attempts left.');
    expect(examResultView(60, 3, true).message).toMatch(/earlier pass still stands/);
  });

  test('[EXR-UNIT-003] odd scores are clamped and attempts never go below zero', () => {
    expect(examResultView(NaN, 1).title).toContain('0%');
    expect(examResultView(150, 1).title).toContain('100%');
    expect(attemptsLeft(9)).toBe(0);
    expect(attemptsLeft(-2)).toBe(MAX_ATTEMPTS);
  });

  test('[EXR-UNIT-004] the feedback line is read out of the report and removed from it', () => {
    const notes = [{ q: 2, label: 'Q2 (Strings)', passed: false, note: 'Check masking' }, { q: 1, label: 'Q1 (Lists)', passed: true, note: 'Good' }];
    const r = splitFeedback(`start\nEXAM_FEEDBACK:${JSON.stringify(notes)}\n====\nEXAM_SCORE:20\n`);
    expect(r.report).not.toContain('EXAM_FEEDBACK');
    expect(r.report).toContain('EXAM_SCORE:20');
    expect(r.notes.map(n => n.q)).toEqual([1, 2]);   // sorted by question
  });

  test('[EXR-UNIT-005] a missing, broken or malformed feedback line gives no notes and never throws', () => {
    expect(splitFeedback('EXAM_SCORE:0').notes).toEqual([]);
    expect(splitFeedback('EXAM_FEEDBACK:{not json').notes).toEqual([]);
    expect(splitFeedback('EXAM_FEEDBACK:{"a":1}').notes).toEqual([]);
    const mixed = splitFeedback('EXAM_FEEDBACK:[1,null,{"q":"x"},{"q":3,"label":"Q3","passed":true,"note":"ok"}]');
    expect(mixed.notes).toEqual([{ q: 3, label: 'Q3', passed: true, note: 'ok' }]);
  });

  test('[EXR-UNIT-006] notes are capped in number and length', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ q: i, label: 'L', passed: true, note: 'x'.repeat(5000) }));
    const r = splitFeedback(`EXAM_FEEDBACK:${JSON.stringify(many)}`);
    expect(r.notes).toHaveLength(20);
    expect(r.notes[0].note.length).toBe(600);
  });

  test('[EXR-UNIT-007] the improvement note as text has the score, the passing score and one line per question', () => {
    const text = notesAsText([{ q: 1, label: 'Q1 (Lists)', passed: true, note: 'Good.' }, { q: 2, label: 'Q2 (Strings)', passed: false, note: 'Fix masking.' }], 60, 80);
    expect(text).toContain('Score: 60% (passing score: 80%)');
    expect(text).toContain('[OK]      Q1 (Lists): Good.');
    expect(text).toContain('[IMPROVE] Q2 (Strings): Fix masking.');
    expect(notesAsText([], 0, 80)).toContain('No per-question notes');
  });
});
