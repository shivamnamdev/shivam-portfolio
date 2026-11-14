import { test, expect } from '@playwright/test';
import { courseCurriculumMap } from '../../data/learning-content';
import { clearExam, enforceProtected, examLessonId, fromLegacy, patchLesson, setExam, toLegacy, type Module } from '../../lib/adminApi/curriculum';
import { examGraderExists } from '../../lib/examGraders';
import { CERTIFICATE_MIN_PERCENT, certificateAllowed, layoutHasExam } from '../../lib/examRule';

// Unit level: marking the final exam in the portal (docs/architecture/exam-switch.md) and the optional-exam certificate rule. No database, no network.
const refusal = (fn: () => unknown): { status?: number; message: string } => { try { fn(); } catch (e) { return e as never; } throw new Error('expected a refusal'); };
const RAW = 'https://raw.githubusercontent.com/o/r';
const V = (n: number) => `vid${String(n).padStart(8, '0')}`;
const mods = (): Module[] => [
  { id: 'm-aaaaaaaa', title: 'Basics', advanced: false, lessons: [
    { id: V(1), kind: 'video', assignment: { title: 'Day 1', rawUrl: `${RAW}/a1` } },
    { id: V(2), kind: 'video', assignment: { title: 'Final', rawUrl: `${RAW}/exam.docx`, starterCodeUrl: `${RAW}/addon.docx`, isExam: true, serverGraded: true, expectedOutcomeUrl: `${RAW}/expected.py` } },
    { id: V(3), kind: 'video' },
    { id: 'doc-notes', kind: 'document', resources: [{ title: 'Notes', url: 'https://github.com/x', type: 'PDF' }] },
  ] },
  { id: 'm-bbbbbbbb', title: 'Advanced', advanced: true, lessons: [{ id: V(4), kind: 'video', assignment: { title: 'Adv', rawUrl: `${RAW}/adv` } }] },
];
const find = (m: Module[], id: string) => m.flatMap((x) => x.lessons).find((l) => l.id === id)!;

test.describe('Exam switch @regression', () => {
  test('[AAPI-UNIT-EXM-001] the exam lesson is found; a course without one has none', () => {
    expect(examLessonId(mods())).toBe(V(2));
    expect(examLessonId(clearExam(mods()))).toBeNull();
    expect(examLessonId([])).toBeNull();
  });

  test('[AAPI-UNIT-EXM-002] setting the exam moves it: the old lesson keeps its assignment as an ordinary one, there is only ever one exam, the flags are set together', () => {
    const next = setExam(mods(), V(1), { graderExists: true });
    expect(find(next, V(1)).assignment).toEqual({ title: 'Day 1', rawUrl: `${RAW}/a1`, isExam: true, serverGraded: true });
    expect(find(next, V(2)).assignment).toEqual({ title: 'Final', rawUrl: `${RAW}/exam.docx`, starterCodeUrl: `${RAW}/addon.docx` });   // exam flags and expected result gone, files kept
    expect(next.flatMap((m) => m.lessons).filter((l) => l.assignment?.isExam).map((l) => l.id)).toEqual([V(1)]);
    expect(mods()[0].lessons[1].assignment!.isExam).toBe(true);                       // the input is not changed
  });

  test('[AAPI-UNIT-EXM-003] the expected result: kept when the same lesson stays the exam, replaced when given, removed with an empty text, not carried to a new exam lesson', () => {
    expect(find(setExam(mods(), V(2), { graderExists: true }), V(2)).assignment!.expectedOutcomeUrl).toBe(`${RAW}/expected.py`);
    expect(find(setExam(mods(), V(2), { graderExists: true, expectedOutcomeUrl: `${RAW}/new.py` }), V(2)).assignment!.expectedOutcomeUrl).toBe(`${RAW}/new.py`);
    expect(find(setExam(mods(), V(2), { graderExists: true, expectedOutcomeUrl: '' }), V(2)).assignment).not.toHaveProperty('expectedOutcomeUrl');
    expect(find(setExam(mods(), V(1), { graderExists: true }), V(1)).assignment).not.toHaveProperty('expectedOutcomeUrl');
    expect(find(setExam(mods(), V(1), { graderExists: true, expectedOutcomeUrl: `${RAW}/e1.py` }), V(1)).assignment!.expectedOutcomeUrl).toBe(`${RAW}/e1.py`);
  });

  test('[AAPI-UNIT-EXM-004] refusals: no grader in code, unknown lesson, a document, no assignment file, a module locked until the exam; nothing changes on a refusal', () => {
    const before = JSON.stringify(mods());
    expect(refusal(() => setExam(mods(), V(1), { graderExists: false })).message).toMatch(/no exam grader yet/);
    expect(refusal(() => setExam(mods(), 'zzzzzzzzzzz', { graderExists: true })).status).toBe(404);
    expect(refusal(() => setExam(mods(), 'doc-notes', { graderExists: true })).message).toMatch(/document cannot be the exam/);
    expect(refusal(() => setExam(mods(), V(3), { graderExists: true })).message).toMatch(/assignment file/);   // no assignment at all
    const noFile = mods(); noFile[0].lessons[0].assignment = { title: 'No file' };
    expect(refusal(() => setExam(noFile, V(1), { graderExists: true })).message).toMatch(/assignment file/);
    expect(refusal(() => setExam(mods(), V(4), { graderExists: true })).message).toMatch(/locked until the exam is passed/);
    for (const code of [refusal(() => setExam(mods(), V(1), { graderExists: false })), refusal(() => setExam(mods(), V(4), { graderExists: true }))]) expect(code.status).toBe(422);
    expect(JSON.stringify(mods())).toBe(before);
  });

  test('[AAPI-UNIT-EXM-005] removing the exam leaves every assignment in place; a course may have no exam at all (an exam is optional)', () => {
    const cleared = clearExam(mods());
    expect(find(cleared, V(2)).assignment).toEqual({ title: 'Final', rawUrl: `${RAW}/exam.docx`, starterCodeUrl: `${RAW}/addon.docx` });
    expect(cleared.flatMap((m) => m.lessons).filter((l) => l.assignment).length).toBe(3);
    expect(clearExam(clearExam(mods()))).toEqual(cleared);   // repeatable
  });

  test('[AAPI-UNIT-EXM-006] the generic lesson calls still cannot create, move or remove the exam (rule R6): only the dedicated call can; the import still keeps the flags', () => {
    const stored = mods();
    const makeExam = JSON.parse(JSON.stringify(stored)) as Module[]; makeExam[0].lessons[0].assignment!.isExam = true;
    expect(refusal(() => enforceProtected(stored, makeExam)).status).toBe(400);
    const removeAssignment = JSON.parse(JSON.stringify(stored)) as Module[]; delete removeAssignment[0].lessons[1].assignment;
    expect(refusal(() => enforceProtected(stored, removeAssignment)).status).toBe(422);
    expect(patchLesson(stored, V(2), { title: 'Renamed' })[0].lessons[1].assignment!.isExam).toBe(true);   // an ordinary edit keeps it
    expect(enforceProtected(stored, setExam(stored, V(1), { graderExists: true }), true)[0].lessons[0].assignment!.isExam).toBe(true);   // allowProtected: the dedicated call and the import
  });

  test('[AAPI-UNIT-EXM-007] the real Python exam round trips: the files mark it, the portal finds it, the learner shape keeps the flags, and re-marking the same lesson changes nothing', () => {
    const slug = 'python-beginners';
    const { modules } = fromLegacy(slug, courseCurriculumMap[slug] as never);
    expect(examLessonId(modules)).toBe('WhP2F-xk3Kk');
    expect(setExam(modules, 'WhP2F-xk3Kk', { graderExists: true })).toEqual(modules);
    const legacy = toLegacy(setExam(modules, 'WhP2F-xk3Kk', { graderExists: true })) as Array<{ githubAssignments: Record<string, any> }>;
    expect(layoutHasExam(legacy)).toBe(true);
    expect(legacy.flatMap((m) => Object.entries(m.githubAssignments)).find(([, a]) => a.isExam)![1]).toMatchObject({ serverGraded: true, expectedOutcomeUrl: expect.stringMatching(/^https:\/\/raw\.githubusercontent\.com\//) });
    expect(layoutHasExam(toLegacy(clearExam(modules)) as never)).toBe(false);
  });

  test('[AAPI-UNIT-EXM-008] only courses with a grader in code can have an exam marked: Python Batch 1 yes, Git and the new recorded courses not yet', () => {
    expect(examGraderExists('python-beginners')).toBe(true);
    for (const slug of ['git-beginner-batch-1', 'git-beginner', 'python-foundation', 'toString', '__proto__', 'constructor']) expect(examGraderExists(slug), slug).toBe(false);
  });

  test('[AAPI-UNIT-EXM-009] certificate rule: an exam is optional; when the course has one it must be passed, and 80% of the tasks is always needed', () => {
    expect(CERTIFICATE_MIN_PERCENT).toBe(80);
    expect(certificateAllowed(80, false, false)).toBe(true);     // no exam in the course (Git today): 80% is enough
    expect(certificateAllowed(100, false, false)).toBe(true);
    expect(certificateAllowed(79, false, false)).toBe(false);
    expect(certificateAllowed(100, true, false)).toBe(false);    // the course has an exam and it is not passed
    expect(certificateAllowed(80, true, true)).toBe(true);
    expect(certificateAllowed(79, true, true)).toBe(false);
    expect(layoutHasExam(null)).toBe(false); expect(layoutHasExam([])).toBe(false);
    expect(layoutHasExam(courseCurriculumMap['python-beginners'] as never)).toBe(true);
    expect(layoutHasExam(courseCurriculumMap['git-beginner-batch-1'] as never)).toBe(false);
    expect(layoutHasExam(courseCurriculumMap['python-beginners-batch-2'] as never)).toBe(false);
  });
});
