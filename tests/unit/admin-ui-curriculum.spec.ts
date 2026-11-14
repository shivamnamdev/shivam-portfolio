import { test, expect } from '@playwright/test';
import {
  ASSIGNMENT_HOSTS, RESOURCE_HOSTS, LIMITS, assignmentProblems, assignmentToForm, cleanResources, countLessons, emptyAssignmentForm, formToAssignment, layoutAfterMove,
  layoutAfterMoveToModule, lessonIdFrom, lessonKindOf, lessonLabel, linkProblem, moduleOrderAfterMove, moved, outline, resourceProblems, urlFieldsFor, type Module,
  FINAL_EXAM_BADGE, catalogActionText, catalogWouldChange, examChange, examSwitchBlock, FIELD_LABELS, GIT_FIELDS, PYTHON_FIELDS, documentFile, documentIdFrom, documentLessonBody, documentProblems, emptyDocumentForm, examOf, formatDuration, parseYoutubeItems, thumbnailUrl, youtubeRequestUrls, type Lesson,
} from '../../lib/adminUi/curriculum';
import { ASSIGNMENT_HOSTS as SERVER_ASSIGNMENT_HOSTS, RESOURCE_HOSTS as SERVER_RESOURCE_HOSTS, LIMITS as SERVER_LIMITS, reorderLessons, reorderModules, patchLesson, addLesson, lessonCheck } from '../../lib/adminApi/curriculum';
import { courseCurriculumMap } from '../../data/learning-content';

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
    expect(assignmentProblems({ ...f, title: 'x', rawUrl: 'https://github.com/o/r' })[0]).toMatch(/^Assignment file must be a link on raw/);   // plain label, not the field name
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
  test('[ADMUI-UNIT-CUR-009] a git lab keeps its solution link through the form (the data files have one on every git day) and every link field has a plain label', () => {
    expect(GIT_FIELDS).toContain('solutionUrl');
    const git = { title: 'Git Day 01', labType: 'git' as const, instructionsUrl: 'https://raw.githubusercontent.com/o/g/instructions.md', starterRepoUrl: 'https://raw.githubusercontent.com/o/g/repo-seed.json',
      expectedStateUrl: 'https://raw.githubusercontent.com/o/g/expected-state.json', validatorUrl: 'https://raw.githubusercontent.com/o/g/validator.json', solutionUrl: 'https://raw.githubusercontent.com/o/g/solution.md' };
    expect(formToAssignment(assignmentToForm(git))).toEqual(git);   // round trip loses nothing
    // the real Git Day 01 from the data files survives the editor's form unchanged
    const real = (courseCurriculumMap['git-beginner-batch-1'][0].githubAssignments as Record<string, any>)['LNmtD68zih0'];
    expect(formToAssignment(assignmentToForm(real))).toEqual(real);
    for (const k of [...PYTHON_FIELDS, ...GIT_FIELDS]) { expect(FIELD_LABELS[k].label, k).not.toMatch(/Url|^[a-z]+[A-Z]/); expect(FIELD_LABELS[k].hint).toContain('raw.githubusercontent.com'); }
    expect(assignmentProblems({ ...emptyAssignmentForm(), title: 'x', labType: 'git', validatorUrl: 'https://github.com/x' })[0]).toMatch(/^Validator \(\.json\) must be a link on/);
  });

  test('[ADMUI-UNIT-CUR-010] a document lesson from a title, a link and a type: id from the title, -2 on a clash, accepted by the server, first resource is the document', () => {
    expect(documentIdFrom('Right Thinking Pattern for Coding', [])).toBe('doc-right-thinking-pattern-for-coding');
    expect(documentIdFrom('  Git  Cheatsheet! ', ['doc-git-cheatsheet'])).toBe('doc-git-cheatsheet-2');
    expect(documentIdFrom('Café résumé', ['doc-cafe-resume', 'doc-cafe-resume-2'])).toBe('doc-cafe-resume-3');
    expect(documentIdFrom('!!!', [])).toBeNull();
    expect(documentIdFrom('x'.repeat(80), [])!.length).toBeLessThanOrEqual(54);
    const f = { ...emptyDocumentForm(), title: 'Git Cheatsheet', url: 'https://s3.ap-south-1.amazonaws.com/git-course-content.shivamnamdev.com/Git+Cheatsheet.pdf', type: 'Document' as const, description: 'Git Complete Course Cheatsheet' };
    const body = documentLessonBody(f, [V1]);
    expect(body).toEqual({ id: 'doc-git-cheatsheet', title: 'Git Cheatsheet', description: 'Git Complete Course Cheatsheet', resources: [{ title: 'Git Cheatsheet', url: f.url, type: 'Document' }] });
    const checked = lessonCheck(body!);                                              // the server accepts exactly this body (the route checks, then adds)
    expect(checked.ok).toBe(true);
    const added = addLesson([{ id: 'm-aaaaaaaa', title: 'M', advanced: false, lessons: [] }], 'm-aaaaaaaa', (checked as { ok: true; value: Lesson }).value);
    expect(added[0].lessons[0]).toMatchObject({ id: 'doc-git-cheatsheet', kind: 'document' });
    expect(documentProblems(emptyDocumentForm())).toEqual(['The document needs a title', 'The document needs a link']);
    expect(documentProblems({ ...f, url: 'https://evil.example/x.pdf' })[0]).toMatch(/^The document link must be a link on/);
    expect(documentProblems({ ...f, description: 'x'.repeat(501) })).toEqual(['The description can have at most 500 characters']);
    expect(documentLessonBody({ ...f, url: '' }, [])).toBeNull();
    const doc: Lesson = { id: 'doc-x', kind: 'document', resources: [{ title: 'The doc', url: 'https://github.com/a', type: 'PDF' }, { title: 'Extra', url: 'https://github.com/b', type: 'Link' }] };
    expect(documentFile(doc)).toEqual({ file: doc.resources![0], extras: [doc.resources![1]] });
    expect(documentFile({ id: V1, kind: 'video', resources: doc.resources })).toEqual({ file: null, extras: doc.resources });
    expect(documentFile({ id: 'doc-y', kind: 'document' })).toEqual({ file: null, extras: [] });
  });

  test('[ADMUI-UNIT-CUR-011] the exam card finds the final exam, its files and its place; a course without one says so', () => {
    const exam = examOf(mods());
    expect(exam).toMatchObject({ moduleId: 'm-bbbbbbbb', moduleTitle: 'Loops', number: 1, serverGraded: false, files: [] });
    expect(exam!.lesson.id).toBe(V3);
    expect(examOf([{ id: 'm-aaaaaaaa', title: 'M', advanced: false, lessons: [{ id: V1, kind: 'video', assignment: { title: 'Day 1' } }] }])).toBeNull();
    const real = examOf([{ id: 'm-aaaaaaaa', title: 'Module 5', advanced: false, lessons: [{ id: 'WhP2F-xk3Kk', kind: 'video', assignment: (courseCurriculumMap['python-beginners'][4].githubAssignments as Record<string, any>)['WhP2F-xk3Kk'] }] }]);
    expect(real).toMatchObject({ serverGraded: true });
    expect(real!.files.map((x) => x.label)).toEqual(['Exam file', 'Add-on file', 'Expected result']);
    for (const x of real!.files) expect(x.url).toMatch(/^https:\/\/raw\.githubusercontent\.com\//);
  });

  test('[ADMUI-UNIT-CUR-012] YouTube requests: videos only, no duplicates, 50 per request, the key encoded; the answer is read tolerantly', () => {
    const ids = Array.from({ length: 120 }, (_, i) => `v${String(i).padStart(10, '0')}`);
    const urls = youtubeRequestUrls([...ids, 'doc-notes', ids[0], 'bad id'], 'k&y');
    expect(urls.length).toBe(3);
    expect(urls[0]).toMatch(/^https:\/\/www\.googleapis\.com\/youtube\/v3\/videos\?part=snippet,contentDetails&id=v0000000000,/);
    expect(urls[0].split('&id=')[1].split('&key=')[0].split(',').length).toBe(50);
    expect(urls[2].split('&id=')[1].split('&key=')[0].split(',').length).toBe(20);
    expect(urls[0].endsWith('&key=k%26y')).toBe(true);
    expect(urls.join()).not.toContain('doc-notes');
    expect(youtubeRequestUrls(['doc-a'], 'k')).toEqual([]);
    const parsed = parseYoutubeItems({ items: [
      { id: V1, snippet: { title: 'Intro', description: 'First class', thumbnails: { medium: { url: `https://i.ytimg.com/vi/${V1}/mqdefault.jpg` } } }, contentDetails: { duration: 'PT1H2M3S' } },
      { id: V2, snippet: { title: 'No thumb' } },
      { id: 'short', snippet: { title: 'bad id' } },
      { id: V3 },
      { id: 'd9nrrH5XkG3', snippet: { title: 'Evil', thumbnails: { medium: { url: 'javascript:alert(1)' } } } },
    ] });
    expect(parsed[V1]).toEqual({ title: 'Intro', description: 'First class', duration: '1:02:03', thumbnail: `https://i.ytimg.com/vi/${V1}/mqdefault.jpg` });
    expect(parsed[V2]).toEqual({ title: 'No thumb', description: '', duration: '', thumbnail: thumbnailUrl(V2) });
    expect(parsed).not.toHaveProperty('short'); expect(parsed).not.toHaveProperty(V3);
    expect(parsed['d9nrrH5XkG3'].thumbnail).toBe(thumbnailUrl('d9nrrH5XkG3'));   // only an i.ytimg.com picture is trusted
    expect(parseYoutubeItems(null)).toEqual({}); expect(parseYoutubeItems({ error: 'quota' })).toEqual({});
    expect(formatDuration('PT5M30S')).toBe('5:30'); expect(formatDuration('PT45S')).toBe('0:45'); expect(formatDuration('PT2H')).toBe('2:00:00'); expect(formatDuration('nope')).toBe(''); expect(formatDuration(undefined)).toBe('');
  });
  test('[ADMUI-UNIT-CUR-013] the exam switch in the panel: off with a reason when it cannot work, never blocks switching an existing exam off; the body sent is only what changed', () => {
    const ok = { grader: true, kind: 'video' as const, moduleLocked: false, hasAssignment: true, assignmentFileSet: true, isExamNow: false };
    expect(examSwitchBlock(ok)).toBeNull();
    expect(examSwitchBlock({ ...ok, grader: false })).toMatch(/no exam grader yet.*optional/);
    expect(examSwitchBlock({ ...ok, kind: 'document' })).toMatch(/document cannot be the exam/);
    expect(examSwitchBlock({ ...ok, moduleLocked: true })).toMatch(/Locked until the exam is passed/);
    expect(examSwitchBlock({ ...ok, hasAssignment: false })).toMatch(/assignment/);
    expect(examSwitchBlock({ ...ok, assignmentFileSet: false })).toMatch(/Assignment file/);
    expect(examSwitchBlock({ ...ok, grader: false, moduleLocked: true, isExamNow: true })).toBeNull();   // an existing exam can always be switched off
    const base = { lessonId: V1, wasExam: false, isExam: false, wasOutcome: '', outcome: '' };
    expect(examChange(base)).toBeNull();
    expect(examChange({ ...base, isExam: true })).toEqual({ lessonId: V1 });
    expect(examChange({ ...base, isExam: true, outcome: ' https://raw.githubusercontent.com/o/r/e.py ' })).toEqual({ lessonId: V1, expectedOutcomeUrl: 'https://raw.githubusercontent.com/o/r/e.py' });
    expect(examChange({ ...base, wasExam: true, isExam: true })).toBeNull();
    expect(examChange({ ...base, wasExam: true, isExam: true, wasOutcome: 'https://raw.githubusercontent.com/o/r/e.py', outcome: '' })).toEqual({ lessonId: V1, expectedOutcomeUrl: '' });
    expect(examChange({ ...base, wasExam: true, isExam: false, wasOutcome: 'x' })).toEqual({ lessonId: null });
    expect(FINAL_EXAM_BADGE).toContain('Final exam');
  });

  test('[ADMUI-UNIT-CUR-014] catalog import rows: plain words for a check and for an applied run; apply is offered only when something would be created or replaced', () => {
    expect(catalogActionText('create', true, false)).toBe('Will be created');
    expect(catalogActionText('unchanged', true, false)).toBe('Already the same');
    expect(catalogActionText('differs', true, false)).toMatch(/skipped unless you overwrite/);
    expect(catalogActionText('overwrite', true, false)).toBe('Will be replaced');
    expect(catalogActionText('create', false, true)).toBe('Written');
    expect(catalogActionText('differs', false, false)).toMatch(/skipped/);     // not written, and it says why
    expect(catalogWouldChange([{ course: 'unchanged', cohort: 'unchanged' }, { course: 'differs', cohort: 'differs' }])).toBe(false);
    expect(catalogWouldChange([{ course: 'unchanged', cohort: 'create' }])).toBe(true);
    expect(catalogWouldChange([{ course: 'overwrite', cohort: 'unchanged' }])).toBe(true);
    expect(catalogWouldChange([])).toBe(false);
  });
});
