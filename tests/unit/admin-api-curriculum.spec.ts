import { test, expect } from '@playwright/test';
import { courseCurriculumMap } from '../../data/learning-content';
import {
  addLesson, addModule, assignmentCheck, checkCurriculum, discardDoc, emptyDoc, enforceProtected, fromLegacy, hasUnpublishedChanges, lessonCheck, LIMITS, patchLesson, patchModule,
  publishDoc, removedLessonIds, removeLesson, removeModule, reorderLessons, reorderModules, replaceModules, resourceCheck, stableModuleId, summary, toLegacy,
  lessonCreateShape, lessonPatchShape, moduleBodyShape, wholeShape, type Lesson, type Module,
} from '../../lib/adminApi/curriculum';
import { parseObject } from '../../lib/adminApi/validate';
import { ApiError } from '../../lib/adminApi/envelope';
import { roleCan } from '../../lib/adminApi/permissions';

// Unit level: the curriculum rules and the conversion from/to today's data/learning-content.ts. No database, no network.
const refusal = (fn: () => unknown): ApiError => { try { fn(); } catch (e) { return e as ApiError; } throw new Error('expected a refusal'); };
const V = (n: number) => `vid${String(n).padStart(8, '0')}`;      // 11 characters
const lesson = (id: string, extra: Partial<Lesson> = {}): Lesson => ({ id, kind: id.startsWith('doc-') ? 'document' : 'video', ...extra });
const mod = (id: string, title: string, lessons: Lesson[], advanced = false): Module => ({ id, title, advanced, lessons });
const sample = (): Module[] => [mod('m-aaaaaaaa', 'One', [lesson(V(1)), lesson(V(2)), lesson('doc-notes')]), mod('m-bbbbbbbb', 'Two', [lesson(V(3))], true)];
const RAW = 'https://raw.githubusercontent.com/shivamnamdev/repo/main/Day1/Assignment';

test.describe('AAPI curriculum @regression', () => {
  test('[AAPI-UNIT-CUR-001] lesson ids: 11-character video ids and doc- ids only; kind must match the id', () => {
    for (const id of [V(1), 'OkK3E7ApZ4Q', 'doc-Git-Cheatsheet', 'doc-a']) expect(lessonCheck({ id }).ok, id).toBe(true);
    for (const bad of ['', 'short', 'x'.repeat(12), 'has space!!', 'doc-', 'DOC-x', '../../etc/pa', 5, null]) expect(lessonCheck({ id: bad }).ok, String(bad)).toBe(false);
    expect(lessonCheck({ id: V(1) })).toEqual({ ok: true, value: { id: V(1), kind: 'video' } });
    expect(lessonCheck({ id: 'doc-x' })).toEqual({ ok: true, value: { id: 'doc-x', kind: 'document' } });
    expect(lessonCheck({ id: V(1), kind: 'document' }).ok).toBe(false);
    expect(lessonCheck({ id: 'doc-x', kind: 'video' }).ok).toBe(false);
    expect(lessonCheck({ id: V(1), nonsense: 1 }).ok).toBe(false);
  });

  test('[AAPI-UNIT-CUR-002] assignment links: https on raw.githubusercontent.com only; empty allowed; placeholders refused', () => {
    expect(assignmentCheck({ title: 'Day 1', rawUrl: RAW, solutionUrl: RAW + '.py', carryOverCode: true }).ok).toBe(true);
    expect(assignmentCheck({ title: 'Day 1', rawUrl: '' }).ok).toBe(true);
    for (const bad of ['...', 'http://raw.githubusercontent.com/a', 'https://evil.example/a', 'javascript:alert(1)', 'https://user:pw@raw.githubusercontent.com/a', 'https://github.com/a'])
      expect(assignmentCheck({ title: 'T', rawUrl: bad }).ok, bad).toBe(false);
    expect(assignmentCheck({ rawUrl: RAW }).ok).toBe(false);            // title is required
    expect(assignmentCheck({ title: 'T', labType: 'ruby' }).ok).toBe(false);
  });

  test('[AAPI-UNIT-CUR-003] resources: allowed hosts and types, at most 20 per lesson', () => {
    expect(resourceCheck({ title: 'Cheatsheet', url: 'https://s3.ap-south-1.amazonaws.com/git-course-content.shivamnamdev.com/Git+Cheatsheet.pdf', type: 'PDF' }).ok).toBe(true);
    for (const bad of [{ title: 'x', url: 'https://evil.example/a.pdf', type: 'PDF' }, { title: 'x', url: 'http://s3.ap-south-1.amazonaws.com/a', type: 'PDF' }, { title: 'x', url: RAW, type: 'Video' }, { title: '', url: RAW, type: 'Link' }])
      expect(resourceCheck(bad).ok, JSON.stringify(bad)).toBe(false);
    const many = Array.from({ length: LIMITS.resourcesPerLesson + 1 }, () => ({ title: 'r', url: RAW, type: 'Link' }));
    expect(lessonCheck({ id: V(1), resources: many }).ok).toBe(false);
    expect(lessonCheck({ id: V(1), resources: many.slice(0, LIMITS.resourcesPerLesson) }).ok).toBe(true);
  });

  test('[AAPI-UNIT-CUR-004] module and lesson bodies: unknown fields refused, the id cannot be patched, assignment null clears', () => {
    expect(parseObject({ title: 'M', advanced: true, lessons: [{ id: V(1) }], position: 0 }, moduleBodyShape).title).toBe('M');
    expect(refusal(() => parseObject({ title: 'M', position: -1 }, moduleBodyShape)).fields).toHaveProperty('position');
    expect(refusal(() => parseObject({ title: 'x', id: 'm-aaaaaaaa' }, moduleBodyShape)).fields).toHaveProperty('id');
    expect(refusal(() => parseObject({ id: V(1), title: 'x' }, lessonPatchShape)).fields).toHaveProperty('id');
    expect((parseObject({ assignment: null }, lessonPatchShape) as { assignment: unknown }).assignment).toBeNull();
    expect(parseObject({ id: V(1), title: 'x' }, lessonCreateShape).id).toBe(V(1));
    expect(refusal(() => parseObject({ modules: [{ id: 'bad', title: 'x', lessons: [] }] }, wholeShape)).fields).toHaveProperty('modules');
  });

  test('[AAPI-UNIT-CUR-005] a lesson id can appear only once in a course; module ids too; limits hold', () => {
    expect(() => checkCurriculum(sample())).not.toThrow();
    expect(refusal(() => checkCurriculum([mod('m-aaaaaaaa', 'A', [lesson(V(1))]), mod('m-bbbbbbbb', 'B', [lesson(V(1))])])).status).toBe(400);
    expect(refusal(() => checkCurriculum([mod('m-aaaaaaaa', 'A', []), mod('m-aaaaaaaa', 'B', [])])).status).toBe(400);
    const tooMany = Array.from({ length: LIMITS.modules + 1 }, (_, i) => mod(`m-${String(i).padStart(8, '0')}`, 'M', []));
    expect(refusal(() => checkCurriculum(tooMany)).status).toBe(400);
    expect(() => checkCurriculum(tooMany.slice(0, LIMITS.modules))).not.toThrow();
    const full = [mod('m-aaaaaaaa', 'A', Array.from({ length: LIMITS.lessonsPerModule + 1 }, (_, i) => lesson(`l${String(i).padStart(10, '0')}`)))];
    expect(refusal(() => checkCurriculum(full)).status).toBe(400);
  });

  test('[AAPI-UNIT-CUR-006] module operations: add (at a position), patch, remove, reorder; the input is never changed', () => {
    const before = sample(); const snapshot = JSON.stringify(before);
    const added = addModule(before, { title: 'New', position: 1 }, 'm-cccccccc');
    expect(added.map((m) => m.id)).toEqual(['m-aaaaaaaa', 'm-cccccccc', 'm-bbbbbbbb']);
    expect(added[1]).toMatchObject({ title: 'New', advanced: false, lessons: [] });
    expect(addModule(before, { title: 'End' }, 'm-dddddddd').at(-1)!.id).toBe('m-dddddddd');
    expect(patchModule(before, 'm-bbbbbbbb', { title: 'Renamed', advanced: false })[1]).toMatchObject({ title: 'Renamed', advanced: false });
    expect(removeModule(before, 'm-aaaaaaaa').map((m) => m.id)).toEqual(['m-bbbbbbbb']);
    expect(reorderModules(before, ['m-bbbbbbbb', 'm-aaaaaaaa']).map((m) => m.id)).toEqual(['m-bbbbbbbb', 'm-aaaaaaaa']);
    expect(refusal(() => patchModule(before, 'm-zzzzzzzz', { title: 'x' })).status).toBe(404);
    expect(refusal(() => removeModule(before, 'm-zzzzzzzz')).status).toBe(404);
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  test('[AAPI-UNIT-CUR-007] module reorder must list every module exactly once (R8)', () => {
    const m = sample();
    for (const bad of [['m-aaaaaaaa'], ['m-aaaaaaaa', 'm-aaaaaaaa'], ['m-aaaaaaaa', 'm-bbbbbbbb', 'm-cccccccc'], ['m-aaaaaaaa', 'm-zzzzzzzz'], []])
      expect(refusal(() => reorderModules(m, bad)).status, bad.join()).toBe(400);
  });

  test('[AAPI-UNIT-CUR-008] lesson operations: add at a position, patch, clear the assignment, remove', () => {
    const m = sample();
    const added = addLesson(m, 'm-aaaaaaaa', lesson(V(9)), 1);
    expect(added[0].lessons.map((l) => l.id)).toEqual([V(1), V(9), V(2), 'doc-notes']);
    expect(refusal(() => addLesson(m, 'm-aaaaaaaa', lesson(V(3)))).status).toBe(400);          // already in module two
    expect(refusal(() => addLesson(m, 'm-zzzzzzzz', lesson(V(9)))).status).toBe(404);
    const withA = patchLesson(m, V(1), { title: 'Intro', description: 'First', assignment: { title: 'Day 1', rawUrl: RAW }, resources: [{ title: 'r', url: RAW, type: 'Link' }] });
    expect(withA[0].lessons[0]).toMatchObject({ title: 'Intro', description: 'First', assignment: { title: 'Day 1' }, resources: [{ title: 'r' }] });
    const cleared = patchLesson(withA, V(1), { assignment: null, resources: [] });
    expect(cleared[0].lessons[0]).not.toHaveProperty('assignment');
    expect(cleared[0].lessons[0]).not.toHaveProperty('resources');
    expect(patchLesson(withA, V(1), { title: 'Only title' })[0].lessons[0].assignment).toBeDefined();   // untouched fields stay
    expect(removeLesson(m, V(2))[0].lessons.map((l) => l.id)).toEqual([V(1), 'doc-notes']);
    expect(refusal(() => removeLesson(m, V(77))).status).toBe(404);
    expect(refusal(() => patchLesson(m, V(77), { title: 'x' })).status).toBe(404);
  });

  test('[AAPI-UNIT-CUR-009] lesson reorder: atomic, can move between modules, module order unchanged, every lesson exactly once (R8)', () => {
    const m = sample();
    const moved = reorderLessons(m, [{ moduleId: 'm-aaaaaaaa', lessonIds: [V(2), V(1)] }, { moduleId: 'm-bbbbbbbb', lessonIds: [V(3), 'doc-notes'] }]);
    expect(moved.map((x) => x.id)).toEqual(['m-aaaaaaaa', 'm-bbbbbbbb']);
    expect(moved[0].lessons.map((l) => l.id)).toEqual([V(2), V(1)]);
    expect(moved[1].lessons.map((l) => l.id)).toEqual([V(3), 'doc-notes']);
    const layout = (a: string[], b: string[]) => [{ moduleId: 'm-aaaaaaaa', lessonIds: a }, { moduleId: 'm-bbbbbbbb', lessonIds: b }];
    for (const bad of [layout([V(1), V(2)], [V(3)]), layout([V(1), V(2), 'doc-notes', V(1)], [V(3)]), layout([V(1), V(2), 'doc-notes'], [V(3), V(8)]), layout([V(1), V(2), 'doc-notes'], [])])
      expect(refusal(() => reorderLessons(m, bad)).status).toBe(400);
    expect(refusal(() => reorderLessons(m, [{ moduleId: 'm-aaaaaaaa', lessonIds: [V(1), V(2), 'doc-notes', V(3)] }])).status).toBe(400);   // module two missing
    expect(sample()).toEqual(m);   // untouched
  });

  test('[AAPI-UNIT-CUR-010] publish copies the working copy; discard goes back; an empty curriculum cannot be published (R5)', () => {
    const doc = { ...emptyDoc(), modules: sample() };
    expect(hasUnpublishedChanges(doc)).toBe(true);
    expect(refusal(() => publishDoc(emptyDoc())).status).toBe(422);
    const pub = publishDoc(doc, '2027-01-01T00:00:00.000Z');
    expect(pub.published).toEqual(doc.modules);
    expect(pub.publishedAt).toBe('2027-01-01T00:00:00.000Z');
    expect(hasUnpublishedChanges(pub)).toBe(false);
    const edited = { ...pub, modules: removeLesson(pub.modules, V(1)) };
    expect(hasUnpublishedChanges(edited)).toBe(true);
    expect(edited.published).toEqual(pub.published);                              // learners still see the old one
    const back = discardDoc(edited);
    expect(back.modules).toEqual(pub.published);
    expect(hasUnpublishedChanges(back)).toBe(false);
    expect(refusal(() => discardDoc(doc)).status).toBe(422);                      // never published
    back.modules[0].title = 'changed';
    expect(back.published![0].title).toBe('One');                                 // no shared references
  });

  test('[AAPI-UNIT-CUR-011] removed lesson ids are found (they are checked against learner progress)', () => {
    const m = sample();
    expect(removedLessonIds(m, removeLesson(m, V(2)))).toEqual([V(2)]);
    expect(removedLessonIds(m, removeModule(m, 'm-aaaaaaaa'))).toEqual([V(1), V(2), 'doc-notes']);
    expect(removedLessonIds(m, reorderModules(m, ['m-bbbbbbbb', 'm-aaaaaaaa']))).toEqual([]);          // moving is not removing
    expect(removedLessonIds(m, reorderLessons(m, [{ moduleId: 'm-aaaaaaaa', lessonIds: [V(1)] }, { moduleId: 'm-bbbbbbbb', lessonIds: [V(3), V(2), 'doc-notes'] }]))).toEqual([]);
    expect(summary(m)).toEqual({ modules: 2, lessons: 4 });
  });

  test('[AAPI-UNIT-CUR-012] exam flags are read-only: cannot be set, changed or lost through the API (R6)', () => {
    const exam = lesson(V(5), { assignment: { title: 'Final', rawUrl: RAW, isExam: true, serverGraded: true, expectedOutcomeUrl: RAW + '/expected' } });
    const stored = [mod('m-aaaaaaaa', 'One', [exam, lesson(V(6), { assignment: { title: 'Plain', rawUrl: RAW } })])];
    // the same data sent back (GET then PUT) is fine, and an omitted flag is restored from what is stored
    expect(enforceProtected(stored, JSON.parse(JSON.stringify(stored)))).toEqual(stored);
    const omitted = JSON.parse(JSON.stringify(stored)); delete omitted[0].lessons[0].assignment.isExam; delete omitted[0].lessons[0].assignment.serverGraded;
    expect(enforceProtected(stored, omitted)[0].lessons[0].assignment).toMatchObject({ isExam: true, serverGraded: true });
    // setting a flag on another lesson, changing one, or setting one on a new lesson is refused
    const setOther = JSON.parse(JSON.stringify(stored)); setOther[0].lessons[1].assignment.isExam = true;
    expect(refusal(() => enforceProtected(stored, setOther)).status).toBe(400);
    const changed = JSON.parse(JSON.stringify(stored)); changed[0].lessons[0].assignment.isExam = false;
    expect(refusal(() => enforceProtected(stored, changed)).status).toBe(400);
    const fresh = [mod('m-aaaaaaaa', 'One', [lesson(V(7), { assignment: { title: 'x', serverGraded: true } })])];
    expect(refusal(() => enforceProtected([], fresh)).status).toBe(400);
    // the exam's assignment cannot be removed
    const stripped = JSON.parse(JSON.stringify(stored)); delete stripped[0].lessons[0].assignment;
    expect(refusal(() => enforceProtected(stored, stripped)).status).toBe(422);
    // only the repo's own import may write them
    expect(enforceProtected([], fresh, true)).toEqual(fresh);
  });

  test('[AAPI-UNIT-CUR-013] replacing the whole working copy: ids assigned when missing, duplicates refused', () => {
    const r = replaceModules([{ title: 'A', lessons: [lesson(V(1))] }, { id: 'm-bbbbbbbb', title: 'B', advanced: true, lessons: [] }]);
    expect(r[0].id).toMatch(/^m-[a-z0-9]{8}$/);
    expect(r[1]).toMatchObject({ id: 'm-bbbbbbbb', advanced: true });
    expect(refusal(() => replaceModules([{ title: 'A', lessons: [lesson(V(1))] }, { title: 'B', lessons: [lesson(V(1))] }])).status).toBe(400);
  });

  test('[AAPI-UNIT-CUR-014] stable module ids: the same input gives the same id, different inputs differ', () => {
    expect(stableModuleId('c', 0, 'Module 1')).toBe(stableModuleId('c', 0, 'Module 1'));
    expect(stableModuleId('c', 0, 'Module 1')).not.toBe(stableModuleId('c', 1, 'Module 1'));
    expect(stableModuleId('c', 0, 'Module 1')).not.toBe(stableModuleId('d', 0, 'Module 1'));
    expect(stableModuleId('c', 0, 'x')).toMatch(/^m-[a-z0-9]{8}$/);
  });

  test('[AAPI-UNIT-CUR-015] round trip on today\'s real courses: every lesson, assignment and resource is kept or reported, and what is kept is identical', () => {
    for (const [cohort, legacy] of Object.entries(courseCurriculumMap)) {
      const { modules, dropped } = fromLegacy(cohort, legacy);
      expect(() => checkCurriculum(modules), cohort).not.toThrow();
      const back = toLegacy(modules);
      expect(back.map((m) => m.moduleTitle), cohort).toEqual(legacy.map((m: any) => m.moduleTitle));
      expect(back.map((m) => m.videoIds), cohort).toEqual(legacy.map((m: any) => m.videoIds ?? []));
      legacy.forEach((lm: any, i: number) => {
        expect(back[i].isAdvancedModule === true, `${cohort} ${lm.moduleTitle} advanced`).toBe(lm.isAdvancedModule === true);
        for (const [id, a] of Object.entries<any>(lm.githubAssignments ?? {})) {
          if (back[i].githubAssignments![id]) expect(back[i].githubAssignments![id], `${cohort} ${id}`).toEqual(JSON.parse(JSON.stringify(a)));
        }
        for (const [id, r] of Object.entries<any>(lm.resources ?? {})) {
          const got: any = back[i].resources![id];
          if (got) expect(JSON.parse(JSON.stringify(got)), `${cohort} resource ${id}`).toEqual(Array.isArray(r) ? r : { title: r.title, description: r.description, url: r.url, type: r.type });
        }
      });
      // nothing disappears without a line in `dropped`
      const legacyAssignments = legacy.reduce((n: number, m: any) => n + Object.keys(m.githubAssignments ?? {}).length, 0);
      const keptAssignments = back.reduce((n, m) => n + Object.keys(m.githubAssignments ?? {}).length, 0);
      const droppedAssignments = dropped.filter((d) => d.includes('assignment')).length;
      expect(keptAssignments + droppedAssignments, `${cohort} assignments`).toBe(legacyAssignments);
      // importing twice gives the same result
      expect(fromLegacy(cohort, legacy)).toEqual({ modules, dropped });
      expect(fromLegacy(cohort, toLegacy(modules)).modules, `${cohort} converges`).toEqual(modules);
    }
  });

  test('[AAPI-UNIT-CUR-016] the known junk in today\'s data is reported, not copied', () => {
    const all = Object.entries(courseCurriculumMap).flatMap(([c, l]) => fromLegacy(c, l).dropped);
    expect(all.some((d) => d.includes('empty lesson id'))).toBe(true);                // the assignment under ""
    expect(all.some((d) => d.includes('Iterator') && d.includes('not kept'))).toBe(true);   // rawUrl "..."
    const exam = fromLegacy('python-beginners', courseCurriculumMap['python-beginners']).modules.flatMap((m) => m.lessons).find((l) => l.assignment?.isExam);
    expect(exam?.assignment).toMatchObject({ isExam: true, serverGraded: true });      // exam flags travel with the import
  });

  test('[AAPI-UNIT-CUR-017] curriculum permissions: owner and admin keys read and write, staff keys only read', () => {
    expect(roleCan('owner', 'curriculum:write')).toBe(true);
    expect(roleCan('key-admin', 'curriculum:write')).toBe(true);
    expect(roleCan('key-staff', 'curriculum:read')).toBe(true);
    expect(roleCan('key-staff', 'curriculum:write')).toBe(false);
  });
});

import { canonical, planCurriculumImport } from '../../lib/adminApi/importCurriculum';
import { courseCurriculumMap as FILES } from '../../data/learning-content';
import { PERMISSIONS } from '../../lib/adminApi/permissions';

test.describe('AAPI import plan @regression', () => {
  const legacy = FILES['git-beginner-batch-1'];
  test('[AAPI-UNIT-IMP-001] canonical form ignores key order and compares values', () => {
    expect(canonical({ b: 1, a: [{ d: 1, c: 2 }] })).toBe(canonical({ a: [{ c: 2, d: 1 }], b: 1 }));
    expect(canonical({ a: 1 })).not.toBe(canonical({ a: 2 }));
    expect(canonical([1, 2])).not.toBe(canonical([2, 1]));
  });

  test('[AAPI-UNIT-IMP-002] a new cohort is created and published; the same data again is unchanged, even after a key-order change', () => {
    const first = planCurriculumImport('git-beginner-batch-1', legacy, null, false, '2027-01-01T00:00:00.000Z');
    expect(first.action).toBe('create');
    expect(first.doc.published).toEqual(first.doc.modules);
    expect(first.counts.modules).toBe(legacy.length);
    const stored = JSON.parse(canonical(first.doc));                        // what the database hands back: keys in another order
    const again = planCurriculumImport('git-beginner-batch-1', legacy, stored, false);
    expect(again.action).toBe('unchanged');
  });

  test('[AAPI-UNIT-IMP-003] an existing curriculum that differs is never overwritten unless asked', () => {
    const plan = planCurriculumImport('git-beginner-batch-1', legacy, null, false);
    const edited = JSON.parse(JSON.stringify(plan.doc)); edited.modules[0].title = 'Edited by an admin';
    expect(planCurriculumImport('git-beginner-batch-1', legacy, edited, false)).toMatchObject({ action: 'differs', existing: { modules: legacy.length } });
    expect(planCurriculumImport('git-beginner-batch-1', legacy, edited, true).action).toBe('overwrite');
    const neverPublished = { ...JSON.parse(JSON.stringify(plan.doc)), published: null };
    expect(planCurriculumImport('git-beginner-batch-1', legacy, neverPublished, false).action).toBe('differs');
  });

  test('[AAPI-UNIT-IMP-004] the plan reports what it drops, for all three real courses', () => {
    const dropped = Object.entries(FILES).flatMap(([c, l]) => planCurriculumImport(c, l, null, false).dropped);
    expect(dropped.length).toBeGreaterThanOrEqual(2);
    for (const d of dropped) expect(d).toMatch(/^[a-z0-9-]+ \/ /);
  });

  test('[AAPI-UNIT-IMP-005] only the owner may run the import; an admin key cannot', () => {
    expect(PERMISSIONS).toContain('import:run');
    expect(roleCan('owner', 'import:run')).toBe(true);
    expect(roleCan('key-admin', 'import:run')).toBe(false);
    expect(roleCan('key-staff', 'import:run')).toBe(false);
  });
});
