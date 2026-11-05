import { test, expect } from '@playwright/test';
import {
  ASSIGNMENT_HOSTS, RESOURCE_HOSTS, LIMITS, assignmentProblems, assignmentToForm, cleanResources, countLessons, emptyAssignmentForm, formToAssignment, layoutAfterMove,
  layoutAfterMoveToModule, lessonIdFrom, lessonKindOf, lessonLabel, linkProblem, moduleOrderAfterMove, moved, outline, resourceProblems, urlFieldsFor, type Module,
} from '../../lib/adminUi/curriculum';
import { ASSIGNMENT_HOSTS as SERVER_ASSIGNMENT_HOSTS, RESOURCE_HOSTS as SERVER_RESOURCE_HOSTS, LIMITS as SERVER_LIMITS, reorderLessons, reorderModules, patchLesson } from '../../lib/adminApi/curriculum';

// Unit level (phase 4c): the pure helpers behind the curriculum editor. No browser, no network.
const V1 = 'a9nrrH5XkG0'; const V2 = 'b9nrrH5XkG1'; const V3 = 'c9nrrH5XkG2'; const D1 = 'doc-notes-1';
const mods = (): Module[] => [
  { id: 'm-aaaaaaaa', title: 'Basics', advanced: false, lessons: [{ id: V1, kind: 'video', title: 'Intro' }, { id: V2, kind: 'video' }, { id: D1, kind: 'document', title: 'Notes' }] },
  { id: 'm-bbbbbbbb', title: 'Loops', advanced: true, lessons: [{ id: V3, kind: 'video', assignment: { title: 'Exam', isExam: true }, resources: [{ title: 'Slides', url: 'https://github.com/x', type: 'Link' }] }] },
  { id: 'm-cccccccc', title: 'Empty', advanced: false, lessons: [] },
];

test.describe('Admin UI curriculum @regression', () => {
  test('[ADMUI-UNIT-CUR-001] the host lists and limits equal the server\'s (they cannot drift)', () => {
    expect([...ASSIGNMENT_HOSTS]).toEqual([...SERVER_ASSIGNMENT_HOSTS]);
    expect([...RESOURCE_HOSTS]).toEqual([...SERVER_RESOURCE_HOSTS]);
    expect(LIMITS).toEqual(SERVER_LIMITS);
  });

  test('[ADMUI-UNIT-CUR-002] a pasted YouTube link, id or document id becomes a lesson id; anything else is refused', () => {
    for (const ok of [V1, `  ${V1}  `, `https://www.youtube.com/watch?v=${V1}`, `https://youtube.com/watch?v=${V1}&t=30s`, `https://youtu.be/${V1}?si=abc`, `https://m.youtube.com/watch?v=${V1}`,
      `https://www.youtube.com/embed/${V1}`, `https://www.youtube.com/shorts/${V1}`, `https://www.youtube.com/live/${V1}`]) expect(lessonIdFrom(ok), ok).toBe(V1);
    expect(lessonIdFrom(D1)).toBe(D1);
    for (const bad of ['', 'short', 'a9nrrH5XkG0extra', 'https://example.com/watch?v=' + V1, 'https://www.youtube.com/watch?v=short', 'https://www.youtube.com/playlist?list=PL123', 'javascript:alert(1)', 'doc-', 'doc-has space', 'ftp://youtu.be/' + V1]) expect(lessonIdFrom(bad), bad).toBeNull();
    expect(lessonKindOf(D1)).toBe('document');
    expect(lessonKindOf(V1)).toBe('video');
    expect(lessonLabel({ id: V1, kind: 'video', title: ' Intro ' })).toBe('Intro');
    expect(lessonLabel({ id: V1, kind: 'video' })).toBe(`Video ${V1}`);
    expect(lessonLabel({ id: D1, kind: 'document' })).toBe('Document notes-1');
  });

  test('[ADMUI-UNIT-CUR-003] moving: up and down swap neighbours, the ends do nothing, and the lists built are accepted by the server\'s reorder rules', () => {
    expect(moved([1, 2, 3], 1, -1)).toEqual([2, 1, 3]);
    expect(moved([1, 2, 3], 1, 1)).toEqual([1, 3, 2]);
    expect(moved([1, 2, 3], 0, -1)).toBeNull();
    expect(moved([1, 2, 3], 2, 1)).toBeNull();
    expect(moved([1, 2, 3], 5, 1)).toBeNull();
    expect(moved([], 0, 1)).toBeNull();
    const m = mods();
    const order = moduleOrderAfterMove(m, 'm-bbbbbbbb', -1)!;
    expect(order).toEqual(['m-bbbbbbbb', 'm-aaaaaaaa', 'm-cccccccc']);
    expect(reorderModules(m, order).map((x) => x.id)).toEqual(order);   // the server accepts exactly what the screen builds
    expect(moduleOrderAfterMove(m, 'm-aaaaaaaa', -1)).toBeNull();
    expect(moduleOrderAfterMove(m, 'nope', 1)).toBeNull();
    const up = layoutAfterMove(m, V2, -1)!;
    expect(up[0].lessonIds).toEqual([V2, V1, D1]);
    expect(reorderLessons(m, up)[0].lessons.map((l) => l.id)).toEqual([V2, V1, D1]);
    expect(layoutAfterMove(m, V1, -1)).toBeNull();
    expect(layoutAfterMove(m, D1, 1)).toBeNull();
    expect(layoutAfterMove(m, 'nope', 1)).toBeNull();
    expect(m[0].lessons.map((l) => l.id)).toEqual([V1, V2, D1]);   // the input is never changed
  });

  test('[ADMUI-UNIT-CUR-004] moving a lesson to another module appends it there and keeps every lesson exactly once', () => {
    const m = mods();
    const l = layoutAfterMoveToModule(m, V2, 'm-cccccccc')!;
    expect(l).toEqual([{ moduleId: 'm-aaaaaaaa', lessonIds: [V1, D1] }, { moduleId: 'm-bbbbbbbb', lessonIds: [V3] }, { moduleId: 'm-cccccccc', lessonIds: [V2] }]);
    const after = reorderLessons(m, l);   // accepted by the server rules: every module and lesson exactly once
    expect(after.map((x) => x.lessons.length)).toEqual([2, 1, 1]);
    expect(countLessons(after)).toBe(countLessons(m));
    expect(layoutAfterMoveToModule(m, V1, 'm-aaaaaaaa')).toBeNull();
    expect(layoutAfterMoveToModule(m, V1, 'm-zzzzzzzz')).toBeNull();
    expect(layoutAfterMoveToModule(m, 'nope', 'm-bbbbbbbb')).toBeNull();
  });

  test('[ADMUI-UNIT-CUR-005] link hints: https only, only the allowed hosts, empty is fine', () => {
    expect(linkProblem('', ASSIGNMENT_HOSTS)).toBeNull();
    expect(linkProblem('https://raw.githubusercontent.com/o/r/main/a.py', ASSIGNMENT_HOSTS)).toBeNull();
    expect(linkProblem('http://raw.githubusercontent.com/o/r/a.py', ASSIGNMENT_HOSTS)).toMatch(/https/);
    expect(linkProblem('https://github.com/o/r', ASSIGNMENT_HOSTS)).toMatch(/raw\.githubusercontent\.com/);
    expect(linkProblem('not a url', ASSIGNMENT_HOSTS)).toMatch(/full https link/);
    expect(linkProblem('javascript:alert(1)', RESOURCE_HOSTS)).toMatch(/https/);
    expect(linkProblem('https://github.com/o/r', RESOURCE_HOSTS)).toBeNull();
    expect(linkProblem('https://evil.example/a.pdf', RESOURCE_HOSTS)).toMatch(/must be a link on/);
  });

  test('[ADMUI-UNIT-CUR-006] the assignment form sends only the chosen lab type\'s links, drops empty boxes, and never sends the read-only exam fields', () => {
    const f = { ...emptyAssignmentForm(), title: ' Day 1 ', rawUrl: ' https://raw.githubusercontent.com/o/r/a.py ', solutionUrl: '', starterRepoUrl: 'https://raw.githubusercontent.com/o/r/g' };
    expect(formToAssignment(f)).toEqual({ title: 'Day 1', labType: 'python', rawUrl: 'https://raw.githubusercontent.com/o/r/a.py' });   // git field ignored for python
    expect(formToAssignment({ ...f, labType: 'git', carryOverCode: true })).toEqual({ title: 'Day 1', labType: 'git', starterRepoUrl: 'https://raw.githubusercontent.com/o/r/g', carryOverCode: true });
    expect(urlFieldsFor('git')).toContain('validatorUrl');
    expect(urlFieldsFor('python')).not.toContain('validatorUrl');
    const exam = assignmentToForm({ title: 'Exam', isExam: true, serverGraded: true, expectedOutcomeUrl: 'https://raw.githubusercontent.com/o/r/x', rawUrl: 'https://raw.githubusercontent.com/o/r/a.py' });
    const sent = formToAssignment(exam);
    expect(sent).not.toHaveProperty('isExam');
    expect(sent).not.toHaveProperty('serverGraded');
    expect(sent).not.toHaveProperty('expectedOutcomeUrl');
    expect(assignmentToForm(undefined)).toEqual(emptyAssignmentForm());
    expect(assignmentToForm({ title: 'T', labType: 'git', carryOverCode: true }).labType).toBe('git');
    expect(assignmentProblems(emptyAssignmentForm())).toEqual(['The assignment needs a title']);
    expect(assignmentProblems({ ...f, title: 'x', rawUrl: 'https://github.com/o/r' })[0]).toMatch(/^rawUrl must be a link on raw/);
    expect(assignmentProblems({ ...f, title: 'x' })).toEqual([]);
    // what the screen builds is accepted by the server's own patch logic and never touches the protected flags
    const patched = patchLesson([{ id: 'm-aaaaaaaa', title: 'M', advanced: false, lessons: [{ id: V1, kind: 'video' }] }], V1, { assignment: formToAssignment({ ...f, title: 'x' }) });
    expect(patched[0].lessons[0].assignment).toMatchObject({ title: 'x', rawUrl: 'https://raw.githubusercontent.com/o/r/a.py' });
  });

  test('[ADMUI-UNIT-CUR-007] resources: each needs a title and an allowed link, at most 20, and are trimmed before sending', () => {
    expect(resourceProblems([])).toEqual([]);
    expect(resourceProblems([{ title: 'Slides', url: 'https://drive.google.com/x', type: 'Link' }])).toEqual([]);
    expect(resourceProblems([{ title: ' ', url: '', type: 'PDF' }])).toEqual(['Resource 1 needs a title', 'Resource 1 needs a link']);
    expect(resourceProblems([{ title: 'A', url: 'http://github.com/x', type: 'Link' }])[0]).toMatch(/Resource 1 link must start with https/);
    expect(resourceProblems([{ title: 'A', url: 'https://evil.example/x', type: 'Link' }, { title: 'B', url: 'https://github.com/y', type: 'Link' }]).length).toBe(1);
    expect(resourceProblems(Array.from({ length: 21 }, () => ({ title: 'A', url: 'https://github.com/y', type: 'Link' as const })))[0]).toMatch(/At most 20/);
    expect(cleanResources([{ title: ' A ', url: ' https://github.com/y ', type: 'PDF' }])).toEqual([{ title: 'A', url: 'https://github.com/y', type: 'PDF' }]);
  });

  test('[ADMUI-UNIT-CUR-008] the learner-style outline numbers lessons per module and flags advanced modules, assignments, exams and resources', () => {
    const o = outline(mods());
    expect(o.map((m) => [m.moduleTitle, m.advanced, m.lessons.length])).toEqual([['Basics', false, 3], ['Loops', true, 1], ['Empty', false, 0]]);
    expect(o[0].lessons.map((l) => [l.number, l.label])).toEqual([[1, 'Intro'], [2, `Video ${V2}`], [3, 'Notes']]);
    expect(o[1].lessons[0]).toEqual({ number: 1, label: `Video ${V3}`, assignment: true, exam: true, resources: 1 });
    expect(o[0].lessons[0]).toMatchObject({ assignment: false, exam: false, resources: 0 });
    expect(countLessons(mods())).toBe(4);
    expect(outline([])).toEqual([]);
  });
});
