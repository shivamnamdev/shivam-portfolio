import { test, expect } from '@playwright/test';
import { buildExamMails, deliverExamMails, type ExamMailInput, type MailMessage } from '../../lib/examMail';

// SCP-115 part B · the e-mails after every exam submission. Pure: no mail server, no database.
const notes = [{ q: 1, label: 'Q1 (Lists)', passed: true, note: 'Good.' }, { q: 2, label: 'Q2 (Strings)', passed: false, note: 'Fix the masking.' }];
const base: ExamMailInput = {
  learnerName: 'Asha Rao', learnerEmail: 'asha@example.com', courseTitle: 'Python Batch 1', courseSlug: 'python-beginners', attemptNo: 2,
  score: 60, passed: false, alreadyPassed: false, attemptsLeft: 3, notes, code: 'print("hi")\n',
};

test.describe('Exam mails @unit', () => {
  test('[EXM-UNIT-001] a fail mail carries the score, the passing score, the attempts left, the note and two attachments', () => {
    const { learner } = buildExamMails(base);
    expect(learner.subject).toBe('Your exam result: 60% (3 attempts left)');
    for (const part of ['Score: 60%', 'passing score 80%', 'Attempts left: 3 of 5', '[IMPROVE] Q2 (Strings): Fix the masking.']) expect(learner.text).toContain(part);
    expect(learner.attachments.map(a => a.filename)).toEqual(['exam-attempt-2.py', 'exam-attempt-2-improvement-note.txt']);
    expect(learner.attachments[0].content).toBe('print("hi")\n');
    expect(learner.attachments[1].content).toContain('Score: 60% (passing score: 80%)');
  });

  test('[EXM-UNIT-002] a pass mail says passed and does not talk about attempts left; a fail on the last attempt says none are left', () => {
    const pass = buildExamMails({ ...base, score: 90, passed: true, attemptsLeft: 3 }).learner;
    expect(pass.subject).toBe('Your exam result: 90% (passed)');
    expect(pass.text).toContain('PASSED');
    expect(pass.text).not.toMatch(/Attempts left/);
    const last = buildExamMails({ ...base, attemptNo: 5, attemptsLeft: 0 }).learner;
    expect(last.subject).toContain('no attempts left');
    expect(last.text).toContain('No attempts left (5 of 5 used)');
    const later = buildExamMails({ ...base, alreadyPassed: true }).learner;   // a low score after an earlier pass: the pass stands
    expect(later.text).not.toMatch(/Attempts left/);
  });

  test('[EXM-UNIT-003] the owner copy names the learner, the e-mail, the course and the attempt, and has the same attachments', () => {
    const { owner, learner } = buildExamMails(base);
    expect(owner.subject).toBe('[Exam] Asha Rao scored 60% (attempt 2/5) - Python Batch 1');
    expect(owner.text).toContain('Asha Rao (asha@example.com) submitted attempt 2');
    expect(owner.attachments).toEqual(learner.attachments);
  });

  test('[EXM-UNIT-004] text from a person is escaped in the HTML, the code is never in the body, and subject lines stay on one line', () => {
    const evil = '<script>alert(1)</script>';
    const m = buildExamMails({ ...base, learnerName: `${evil}\nBcc: x@y.z`, notes: [{ q: 1, label: evil, passed: false, note: evil }], code: 'SECRET_CODE_MARKER' });
    for (const msg of [m.learner, m.owner]) {
      expect(msg.html).not.toContain('<script>');
      expect(msg.html).toContain('&lt;script&gt;');
      expect(msg.html).not.toContain('SECRET_CODE_MARKER');
      expect(msg.text).not.toContain('SECRET_CODE_MARKER');
      expect(msg.subject).not.toMatch(/[\r\n]/);
    }
    expect(m.owner.attachments[0].content).toBe('SECRET_CODE_MARKER');
  });

  test('[EXM-UNIT-005] delivery sends to the right addresses, reports a failing send as failed without throwing, and skips when disabled', async () => {
    const mails = buildExamMails(base);
    const sent: Array<MailMessage & { to: string }> = [];
    const ok = await deliverExamMails(mails, { learner: 'asha@example.com', owner: 'site@example.com' }, async m => { sent.push(m); }, true);
    expect(ok).toEqual({ learner: 'sent', owner: 'sent' });
    expect(sent.map(m => m.to).sort()).toEqual(['asha@example.com', 'site@example.com']);

    const half = await deliverExamMails(mails, { learner: 'asha@example.com', owner: 'site@example.com' }, async m => { if (m.to === 'asha@example.com') throw new Error('smtp down'); }, true);
    expect(half).toEqual({ learner: 'failed', owner: 'sent' });

    const calls: string[] = [];
    const off = await deliverExamMails(mails, { learner: 'asha@example.com', owner: 'site@example.com' }, async m => { calls.push(m.to); }, false);
    expect(off).toEqual({ learner: 'skipped', owner: 'skipped' });
    const noAddress = await deliverExamMails(mails, { learner: null, owner: 'site@example.com' }, async m => { calls.push(m.to); }, true);
    expect(noAddress).toEqual({ learner: 'skipped', owner: 'sent' });
    expect(calls).toEqual(['site@example.com']);
  });
});
