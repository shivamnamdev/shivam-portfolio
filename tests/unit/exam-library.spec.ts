import { test, expect } from '@playwright/test';
import { checkExamChange, chooseExamId, discardDoc, hasUnpublishedChanges, publishDoc, type CurriculumDoc, type Module } from '../../lib/adminApi/curriculum';
import { courseDefaultExam, examIdExists, examList, graderFor, resolveExamId } from '../../lib/examGraders';

// Unit level: the exam library, step 1 (docs/architecture/exam-library.md). A course uses the exam its curriculum names; results stay per course. No database, no network.
const refusal = (fn: () => unknown): { status?: number; message: string } => { try { fn(); } catch (e) { return e as never; } throw new Error('expected a refusal'); };
const mods = (): Module[] => [{ id: 'm-aaaaaaaa', title: 'Basics', advanced: false, lessons: [{ id: 'vid00000001', kind: 'video' }] }];
const doc = (extra: Partial<CurriculumDoc> = {}): CurriculumDoc => ({ modules: mods(), published: null, ...extra });
const ID = 'python-batch-1-final';

test.describe('Exam library @regression', () => {
  test('[AAPI-UNIT-EXL-001] the library lists id, title and number of questions, and never the grader script', () => {
    expect(examList()).toEqual([{ id: ID, title: 'Python Batch 1 final exam', questions: 5 }]);
    const shown = JSON.stringify(examList());
    for (const secret of ['EXAM_SCORE', 'Jaskeerat', 'student_output', 'import re']) expect(shown).not.toContain(secret);
  });

  test('[AAPI-UNIT-EXL-002] ids are looked up safely: known ids work, inherited names and junk do not', () => {
    expect(examIdExists(ID)).toBe(true);
    expect(graderFor(ID)).toContain('EXAM_SCORE');
    for (const bad of ['', 'nope', '__proto__', 'constructor', 'toString', 'hasOwnProperty', 'PYTHON-BATCH-1-FINAL']) { expect(examIdExists(bad), bad).toBe(false); expect(graderFor(bad), bad).toBeUndefined(); }
  });

  test('[AAPI-UNIT-EXL-003] the exam a course is graded with: the published choice if it still exists, else the course default, else none', () => {
    expect(resolveExamId('python-foundation', ID)).toBe(ID);                       // a course reusing Python Batch 1's exam
    expect(resolveExamId('python-beginners')).toBe(ID);                            // the default, nothing stored (no data change for Batch 1)
    expect(resolveExamId('python-beginners', null)).toBe(ID);
    expect(resolveExamId('python-foundation')).toBeUndefined();                    // nothing chosen yet: no exam
    expect(resolveExamId('git-beginner-batch-1', 'gone-exam')).toBeUndefined();    // a choice that left the library grades nothing, never another exam
    expect(resolveExamId('python-beginners', 'gone-exam')).toBe(ID);               // ...except the course's own default
    expect(resolveExamId('python-foundation', '__proto__')).toBeUndefined();
    expect(courseDefaultExam('python-beginners')).toBe(ID);
  });

  test('[AAPI-UNIT-EXL-004] choosing the exam when marking one: the request wins, then the stored choice, then the default; unknown or none is refused', () => {
    const exists = (id: string) => id === ID || id === 'other-exam';
    expect(chooseExamId({ requested: ID, exists })).toBe(ID);
    expect(chooseExamId({ requested: 'other-exam', stored: ID, courseDefault: ID, exists })).toBe('other-exam');
    expect(chooseExamId({ stored: 'other-exam', courseDefault: ID, exists })).toBe('other-exam');
    expect(chooseExamId({ courseDefault: ID, exists })).toBe(ID);
    expect(chooseExamId({ stored: 'gone', courseDefault: ID, exists })).toBe(ID);   // a stored choice that left the library falls back to the default
    const unknown = refusal(() => chooseExamId({ requested: 'nope', exists }));
    expect(unknown.status).toBe(422); expect(unknown.message).toMatch(/no exam "nope" in the library/);
    const none = refusal(() => chooseExamId({ exists }));
    expect(none.status).toBe(422); expect(none.message).toMatch(/Choose which exam/);
    expect(refusal(() => chooseExamId({ stored: 'gone', exists })).status).toBe(422);
  });

  test('[AAPI-UNIT-EXL-005] publishing copies the choice for learners, discarding restores it, and an unpublished choice counts as a change', () => {
    const working = doc({ examId: ID });
    expect(hasUnpublishedChanges(publishDoc(working, 'now'))).toBe(false);
    const published = publishDoc(working, 'now');
    expect(published.publishedExamId).toBe(ID);
    const changed = { ...published, examId: 'other-exam' };
    expect(hasUnpublishedChanges(changed)).toBe(true);                             // same lessons, different exam
    expect(discardDoc(changed).examId).toBe(ID);                                   // back to what learners have
    expect(hasUnpublishedChanges({ ...published, examId: undefined })).toBe(true); // choice removed but not published
    expect(publishDoc({ ...published, examId: undefined }, 'later').publishedExamId).toBeUndefined();   // publishing the removal removes it for learners
  });

  test('[AAPI-UNIT-EXL-006] a curriculum without any choice behaves exactly as before (back-compat)', () => {
    const old = doc();
    expect(hasUnpublishedChanges(old)).toBe(true);                                 // never published
    const published = publishDoc(old, 'now');
    expect(published).not.toHaveProperty('publishedExamId');
    expect(hasUnpublishedChanges(published)).toBe(false);
    expect(discardDoc(published)).not.toHaveProperty('examId');
  });

  test('[AAPI-UNIT-EXL-007] switching a course to a different exam is refused once a learner has passed (409 with the count); the same exam, no passes, or a first choice are fine', () => {
    const blocked = refusal(() => checkExamChange({ current: ID, chosen: 'other-exam', passed: 3 }));
    expect(blocked.status).toBe(409); expect(blocked.message).toMatch(/3 learner\(s\) have passed the exam "python-batch-1-final"/);
    expect(() => checkExamChange({ current: ID, chosen: ID, passed: 3 })).not.toThrow();            // keeping the exam
    expect(() => checkExamChange({ current: ID, chosen: 'other-exam', passed: 0 })).not.toThrow();  // nobody passed yet
    expect(() => checkExamChange({ chosen: ID, passed: 5 })).not.toThrow();                         // no exam chosen before: nothing to protect
  });
});
