import { test, expect } from '@playwright/test';
import { checkExamChange, chooseExamId, discardDoc, hasUnpublishedChanges, publishDoc, setExam, toLegacy, type CurriculumDoc, type Module } from '../../lib/adminApi/curriculum';
import { courseDefaultExam, examIdExists, examLinks, examList, graderFor, resolveExamId } from '../../lib/examGraders';
import { certificateAllowed, isGradedExam, layoutHasExam } from '../../lib/examRule';
import { examChange, examPickProblem, examSwitchBlock, isLibraryPick, newExamProblem } from '../../lib/adminUi/curriculum';

// Unit level: the exam library, step 1 (docs/architecture/exam-library.md). A course uses the exam its curriculum names; results stay per course. No database, no network.
const refusal = (fn: () => unknown): { status?: number; message: string } => { try { fn(); } catch (e) { return e as never; } throw new Error('expected a refusal'); };
const mods = (): Module[] => [{ id: 'm-aaaaaaaa', title: 'Basics', advanced: false, lessons: [{ id: 'vid00000001', kind: 'video' }] }];
const doc = (extra: Partial<CurriculumDoc> = {}): CurriculumDoc => ({ modules: mods(), published: null, ...extra });
const ID = 'python-batch-1-final';

test.describe('Exam library @regression', () => {
  test('[AAPI-UNIT-EXL-001] the library lists id, title and number of questions, and never the grader script', () => {
    expect(examList().map(({ id, title, questions }) => ({ id, title, questions }))).toEqual([{ id: ID, title: 'Python Batch 1 final exam', questions: 5 }]);
    expect(Object.keys(examList()[0])).toEqual(['id', 'title', 'questions', 'links']);
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
    expect(none.status).toBe(422); expect(none.message).toMatch(/Choose an exam from a course, or None/);
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

  // ---- step 2 (exam-library.md section 13): the exam brings its own files; "None" is a new exam with pasted files and no grader ----
  const RAW = 'https://raw.githubusercontent.com/o/r/main';
  const two = (): Module[] => [{ id: 'm-aaaaaaaa', title: 'Basics', advanced: false, lessons: [
    { id: 'vid00000001', kind: 'video' },
    { id: 'vid00000002', kind: 'video', assignment: { title: 'Day 2', labType: 'python', rawUrl: `${RAW}/d2.docx`, solutionUrl: `${RAW}/d2_sol.py`, carryOverCode: true } },
  ] }];
  const asg = (m: Module[], i: number) => m[0].lessons[i].assignment!;

  test('[AAPI-UNIT-EXL-008] a library exam fills the lesson: files and title come from the library, a lesson with no assignment gets one, other fields are kept, graded on the server', () => {
    const links = examLinks(ID)!;
    expect(links.rawUrl).toMatch(/v1\.docx$/); expect(links.starterCodeUrl).toMatch(/v1_addon\.docx$/); expect(links.expectedOutcomeUrl).toMatch(/v1_expected_result\.py$/);
    const fresh = setExam(two(), 'vid00000001', { library: links });   // the lesson had no assignment: nothing to type first
    expect(asg(fresh, 0)).toEqual({ ...links, labType: 'python', isExam: true, serverGraded: true });
    const over = setExam(two(), 'vid00000002', { library: links });    // its own files are replaced, solution and carry-over stay
    expect(asg(over, 1)).toMatchObject({ title: links.title, rawUrl: links.rawUrl, starterCodeUrl: links.starterCodeUrl, expectedOutcomeUrl: links.expectedOutcomeUrl, solutionUrl: `${RAW}/d2_sol.py`, carryOverCode: true, isExam: true, serverGraded: true });
    expect(asg(two(), 1).rawUrl).toBe(`${RAW}/d2.docx`);               // the input is not changed
    expect(examLinks('nope')).toBeUndefined(); expect(examLinks('__proto__')).toBeUndefined();
  });

  test('[AAPI-UNIT-EXL-009] "None" is a new exam: it needs its own assignment file, keeps the pasted files, is not graded on the server, and the library is never touched', () => {
    expect(chooseExamId({ requested: 'none', courseDefault: ID, exists: examIdExists })).toBeNull();   // None wins over the course default
    const refused = refusal(() => setExam(two(), 'vid00000001', {}));
    expect(refused.status).toBe(422); expect(refused.message).toMatch(/assignment file/);
    const next = setExam(two(), 'vid00000002', { expectedOutcomeUrl: `${RAW}/e.py` });
    expect(asg(next, 1)).toMatchObject({ rawUrl: `${RAW}/d2.docx`, isExam: true, expectedOutcomeUrl: `${RAW}/e.py` });
    expect(asg(next, 1)).not.toHaveProperty('serverGraded');
    expect(isGradedExam(asg(next, 1))).toBe(false);
    expect(examIdExists('none')).toBe(false);                                                         // "none" can never be a library id
    // moving a graded exam to a new one drops the grader flag
    const moved = setExam(setExam(two(), 'vid00000001', { library: examLinks(ID)! }), 'vid00000002', {});
    expect(asg(moved, 0)).not.toHaveProperty('isExam'); expect(asg(moved, 1)).not.toHaveProperty('serverGraded');
  });

  test('[AAPI-UNIT-EXL-010] a new exam never holds back the certificate; an exam with a grader still does', () => {
    const none = toLegacy(setExam(two(), 'vid00000002', {})) as never;
    const graded = toLegacy(setExam(two(), 'vid00000001', { library: examLinks(ID)! })) as never;
    expect(layoutHasExam(none)).toBe(false);
    expect(layoutHasExam(graded)).toBe(true);
    expect(certificateAllowed(80, layoutHasExam(none), false)).toBe(true);
    expect(certificateAllowed(80, layoutHasExam(graded), false)).toBe(false);
    expect(isGradedExam(undefined)).toBe(false); expect(isGradedExam({ isExam: true })).toBe(false); expect(isGradedExam({ isExam: true, serverGraded: true })).toBe(true);
  });

  test('[AAPI-UNIT-EXL-011] once a learner has passed, the course cannot change to None either (409); keeping the exam is fine', () => {
    const blocked = refusal(() => checkExamChange({ current: ID, chosen: null, passed: 2 }));
    expect(blocked.status).toBe(409);
    expect(() => checkExamChange({ current: ID, chosen: null, passed: 0 })).not.toThrow();
    expect(() => checkExamChange({ chosen: null, passed: 9 })).not.toThrow();                         // a new exam had no grader: nothing to protect
  });

  test('[ADMUI-UNIT-CUR-016] the panel: the switch needs no assignment first; picking is required; None needs the assignment file; the body says which exam', () => {
    expect(examSwitchBlock({ kind: 'video', moduleLocked: false, isExamNow: false })).toBeNull();
    expect(examPickProblem(true, '')).toMatch(/Choose an exam from a course, or None/); expect(examPickProblem(true, 'none')).toBeNull(); expect(examPickProblem(false, '')).toBeNull();
    expect(newExamProblem(true, 'none', ' ')).toMatch(/Paste the assignment file link/); expect(newExamProblem(true, 'none', `${RAW}/x`)).toBeNull();
    expect(newExamProblem(true, ID, '')).toBeNull(); expect(newExamProblem(false, 'none', '')).toBeNull();
    expect(isLibraryPick('')).toBe(false); expect(isLibraryPick('none')).toBe(false); expect(isLibraryPick(ID)).toBe(true);
    const base = { lessonId: 'vid00000001', wasExam: false, isExam: true, wasOutcome: '', outcome: '' };
    expect(examChange({ ...base, examId: ID })).toEqual({ lessonId: 'vid00000001', examId: ID });
    expect(examChange({ ...base, examId: 'none', outcome: `${RAW}/e.py` })).toEqual({ lessonId: 'vid00000001', expectedOutcomeUrl: `${RAW}/e.py`, examId: 'none' });
    expect(examChange({ ...base, wasExam: true, examId: ID, wasExamId: ID })).toBeNull();            // nothing changed
    expect(examChange({ ...base, wasExam: true, examId: ID, wasExamId: 'none' })).toEqual({ lessonId: 'vid00000001', examId: ID });   // new exam to a library exam
  });
});
