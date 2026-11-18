import { test, expect } from '@playwright/test';
import { examAttemptDetail, examAttemptRow, type DbExamAttempt } from '../../lib/adminApi/examAttempts';
import { attemptResultText, mailStatusText, mailText } from '../../lib/adminUi/progressView';
import { cleanNotes } from '../../lib/examNotes';

// SCP-115 part C · the shapes of the exam attempt admin rows. Pure: no database, no network.
const db: DbExamAttempt = {
  id: 'a1', user_id: 'user_1', user_name: ' Asha Rao ', user_email: 'asha@example.com', course_slug: 'python-beginners', attempt_no: 2, score: 60, passed: false,
  code: 'print(1)\n', notes: [{ q: 2, label: 'Q2', passed: false, note: 'Fix' }, { q: 1, label: 'Q1', passed: true, note: 'Good' }, 'junk'], mail_learner: 'sent', mail_owner: 'failed', created_at: '2026-11-18T10:00:00Z',
};

test.describe('Exam attempt rows @unit', () => {
  test('[EXA-UNIT-001] a list row has the named fields only: no code, no notes; the code is counted', () => {
    const row = examAttemptRow(db);
    expect(row).toEqual({ id: 'a1', userId: 'user_1', name: 'Asha Rao', email: 'asha@example.com', cohortSlug: 'python-beginners', attemptNo: 2, score: 60, passed: false, createdAt: '2026-11-18T10:00:00Z', codeLength: 9, mailLearner: 'sent', mailOwner: 'failed' });
    expect(JSON.stringify(row)).not.toContain('print(1)');
  });

  test('[EXA-UNIT-002] the name falls back to the e-mail, then to the user id; an unknown mail status reads as pending', () => {
    expect(examAttemptRow({ ...db, user_name: null }).name).toBe('asha@example.com');
    expect(examAttemptRow({ ...db, user_name: '', user_email: null }).name).toBe('user_1');
    expect(examAttemptRow({ ...db, mail_learner: 'weird' }).mailLearner).toBe('pending');
  });

  test('[EXA-UNIT-003] the detail adds the code, the cleaned and sorted notes, the improvement note text and the passing score', () => {
    const d = examAttemptDetail(db);
    expect(d.code).toBe('print(1)\n');
    expect(d.notes.map((n) => n.q)).toEqual([1, 2]);
    expect(d.notesText).toContain('Score: 60% (passing score: 80%)');
    expect(d.passMark).toBe(80);
    expect(examAttemptDetail({ ...db, code: null, notes: 'bad' })).toMatchObject({ code: '', notes: [], codeLength: 0 });
  });

  test('[EXA-UNIT-004] stored notes are re-checked: malformed entries are dropped', () => {
    expect(cleanNotes([{ q: 1, label: 'x', passed: true, note: 'y' }, { q: '1' }, null])).toHaveLength(1);
    expect(cleanNotes(null)).toEqual([]);
  });

  test('[EXA-UNIT-005] screen wording: passed or not passed, and both e-mail statuses in one line', () => {
    expect(attemptResultText({ passed: true })).toBe('Passed');
    expect(attemptResultText({ passed: false })).toBe('Not passed');
    expect(mailStatusText('failed')).toBe('Failed');
    expect(mailStatusText('???')).toBe('Pending');
    expect(mailText({ mailLearner: 'sent', mailOwner: 'skipped' })).toBe('Learner: Sent · You: Skipped');
  });
});
