import { test, expect } from '@playwright/test';
import {
  directoryRow, engagementRow, laterOf, layoutFor, lessonTitle, offsetCursor, parseFilters, percentOf, progressRow, submissionRow, submissionWithCode, tally, tallyKey, totalsOf, whoOf, type Layout,
} from '../../lib/adminApi/progress';
import { roleCan } from '../../lib/adminApi/permissions';
import { OPERATIONS } from '../../lib/adminApi/openapi';
import { ApiError } from '../../lib/adminApi/envelope';
import type { Module } from '../../lib/adminApi/curriculum';

// Unit level (slice 4f): totals, percent, titles, tallies and the row shapes of the read-only progress, submissions and engagement routes. No database.
const refusal = (fn: () => unknown): ApiError => { try { fn(); } catch (e) { return e as ApiError; } throw new Error('expected a refusal'); };
const layout: Layout = [
  { moduleTitle: 'Basics', videoIds: ['v1', 'v2', 'v3'], githubAssignments: { v2: { title: 'Print hello' } } },
  { moduleTitle: 'Loops', videoIds: ['v4', 'v5'], githubAssignments: { v4: { title: 'Sum a list' }, v5: {} } },
];
const published: Module[] = [{ id: 'm1', title: 'Published module', advanced: false, lessons: [{ id: 'p1', kind: 'video' }, { id: 'p2', kind: 'video', assignment: { title: 'Do it' } as never }] }];

test.describe('AAPI progress rules @regression', () => {
  test('[AAPI-UNIT-PRG-001] totals count every lesson and every lesson that has an assignment', () => {
    expect(totalsOf(layout)).toEqual({ videos: 5, assignments: 3 });
    expect(totalsOf([])).toEqual({ videos: 0, assignments: 0 });
    expect(totalsOf([{ moduleTitle: 'x' }])).toEqual({ videos: 0, assignments: 0 });
    expect(totalsOf([{ moduleTitle: 'x', videoIds: ['a'], githubAssignments: { zzz: {} } }])).toEqual({ videos: 1, assignments: 0 });   // an assignment with no lesson does not count
  });

  test('[AAPI-UNIT-PRG-002] which lessons count: the published curriculum, else the older static list, else nothing is known', () => {
    const fromPublished = layoutFor(published, layout) as Layout;
    expect(fromPublished.map((m) => m.moduleTitle)).toEqual(['Published module']);
    expect(totalsOf(fromPublished)).toEqual({ videos: 2, assignments: 1 });
    expect(layoutFor(null, layout)).toBe(layout);
    expect(layoutFor([], layout)).toBe(layout);          // an empty published list is not a curriculum
    expect(layoutFor(undefined, layout)).toBe(layout);
    expect(layoutFor(null, undefined)).toBeNull();
    expect(layoutFor(null, [])).toBeNull();
  });

  test('[AAPI-UNIT-PRG-003] percent is a whole number, never above 100, and null when the total is unknown or zero', () => {
    const t = { videos: 5, assignments: 3 };
    expect(percentOf(0, 0, t)).toBe(0);
    expect(percentOf(4, 0, t)).toBe(50);
    expect(percentOf(5, 3, t)).toBe(100);
    expect(percentOf(1, 0, t)).toBe(13);        // 12.5 rounds to 13
    expect(percentOf(9, 9, t)).toBe(100);       // progress on a lesson removed later cannot push it past 100
    expect(percentOf(3, 1, null)).toBeNull();
    expect(percentOf(0, 0, { videos: 0, assignments: 0 })).toBeNull();
  });

  test('[AAPI-UNIT-PRG-004] a lesson title is the assignment title, else module and position, else "Unknown lesson"', () => {
    expect(lessonTitle(layout, 'v2')).toBe('Print hello');
    expect(lessonTitle(layout, 'v1')).toBe('Basics (Lesson 1)');
    expect(lessonTitle(layout, 'v5')).toBe('Loops (Lesson 2)');   // an assignment with no title falls back
    expect(lessonTitle(layout, 'nope')).toBe('Unknown lesson');
    expect(lessonTitle(null, 'v1')).toBe('Unknown lesson');
  });

  test('[AAPI-UNIT-PRG-005] tally counts per learner and cohort and keeps the latest time; one learner never leaks into another', () => {
    const t = tally([
      { user_id: 'user_a', course_slug: 'py', completed_at: '2026-11-01T10:00:00Z' }, { user_id: 'user_a', course_slug: 'py', completed_at: '2026-11-03T10:00:00Z' },
      { user_id: 'user_a', course_slug: 'git', completed_at: null }, { user_id: 'user_b', course_slug: 'py', completed_at: '2026-11-02T10:00:00Z' },
    ]);
    expect(t.get(tallyKey('user_a', 'py'))).toEqual({ count: 2, last: '2026-11-03T10:00:00Z' });
    expect(t.get(tallyKey('user_a', 'git'))).toEqual({ count: 1, last: null });
    expect(t.get(tallyKey('user_b', 'py'))?.count).toBe(1);
    expect(t.get(tallyKey('user_b', 'git'))).toBeUndefined();
    expect(tally([]).size).toBe(0);
    expect(laterOf(null, null)).toBeNull();
    expect(laterOf('2026-11-01T00:00:00Z', null)).toBe('2026-11-01T00:00:00Z');
    expect(laterOf('2026-11-01T00:00:00Z', '2026-11-05T00:00:00Z')).toBe('2026-11-05T00:00:00Z');
  });

  test('[AAPI-UNIT-PRG-006] a progress row has the named fields only, with null totals and percent when the course is unknown', () => {
    const e = { userId: 'user_a', cohortSlug: 'py' };
    const row = progressRow(e, { name: 'Asha', email: 'a@x.com' }, { count: 3, last: '2026-11-03T00:00:00Z' }, { count: 1, last: '2026-11-04T00:00:00Z' }, { videos: 5, assignments: 3 });
    expect(row).toEqual({ userId: 'user_a', name: 'Asha', email: 'a@x.com', cohortSlug: 'py', videosDone: 3, totalVideos: 5, assignmentsDone: 1, totalAssignments: 3, percent: 50, lastActivityAt: '2026-11-04T00:00:00Z' });
    expect(progressRow(e, { name: 'Asha', email: null }, undefined, undefined, null)).toMatchObject({ videosDone: 0, totalVideos: null, totalAssignments: null, percent: null, lastActivityAt: null });
  });

  test('[AAPI-UNIT-PRG-007] a submission list row never carries code; only the single-submission shape does', () => {
    const db = { id: 'id1', user_id: 'user_a', course_slug: 'py', video_id: 'v2', completed_at: '2026-11-03T00:00:00Z', submitted_code: "print('secret answer')" };
    const row = submissionRow(db, { name: 'Asha', email: 'a@x.com' }, layout);
    expect(row).toEqual({ id: 'id1', userId: 'user_a', name: 'Asha', email: 'a@x.com', cohortSlug: 'py', lessonId: 'v2', lessonTitle: 'Print hello', completedAt: '2026-11-03T00:00:00Z', codeLength: 22 });
    expect(JSON.stringify(row)).not.toContain('secret answer');
    expect(Object.keys(row)).not.toContain('submittedCode');
    expect(submissionRow({ ...db, submitted_code: null }, { name: 'A', email: null }, null)).toMatchObject({ codeLength: 0, lessonTitle: 'Unknown lesson' });
    expect(submissionWithCode(row, db.submitted_code).submittedCode).toBe("print('secret answer')");
    expect(submissionWithCode(row, null).submittedCode).toBe('');
  });

  test('[AAPI-UNIT-PRG-008] engagement rows are clamped to sensible numbers; a person is named by Clerk first, then what the row stored, then "Unknown student"', () => {
    expect(engagementRow({ user_id: 'user_a', total_time_seconds: 3700, current_streak: 4, last_active_date: '2026-11-05' }, { name: 'Asha', email: null })).toEqual({ userId: 'user_a', name: 'Asha', email: null, totalTimeSeconds: 3700, currentStreak: 4, lastActiveDate: '2026-11-05' });
    expect(engagementRow({ user_id: 'u', total_time_seconds: null, current_streak: -2, last_active_date: null }, { name: 'x', email: null })).toMatchObject({ totalTimeSeconds: 0, currentStreak: 0, lastActiveDate: null });
    expect(whoOf({ name: 'Asha K', email: 'a@x.com' }, { name: 'old', email: 'old@x.com' })).toEqual({ name: 'Asha K', email: 'a@x.com' });
    expect(whoOf({ name: '(user not found)', email: null }, { name: 'Stored', email: 's@x.com' })).toEqual({ name: 'Stored', email: 's@x.com' });
    expect(whoOf(undefined, {})).toEqual({ name: 'Unknown student', email: null });
    expect(whoOf({ name: '', email: null }, { email: 's@x.com' })).toEqual({ name: 'Unknown student', email: 's@x.com' });
  });

  test('[AAPI-UNIT-PRG-009] filters and the position cursor are checked; bad input is a 400', () => {
    expect(parseFilters(new URL('http://x/y'))).toEqual({ cohortSlug: null, userId: null });
    expect(parseFilters(new URL('http://x/y?cohortSlug=py-1&userId=user_2abc'))).toEqual({ cohortSlug: 'py-1', userId: 'user_2abc' });
    expect(refusal(() => parseFilters(new URL('http://x/y?cohortSlug=Bad%20Slug'))).status).toBe(400);
    expect(refusal(() => parseFilters(new URL('http://x/y?userId=nope'))).status).toBe(400);
    expect(refusal(() => parseFilters(new URL("http://x/y?userId=user_1'%20or%201=1"))).status).toBe(400);
    expect(offsetCursor(null)).toBe(0);
    expect(offsetCursor('50')).toBe(50);
    for (const bad of ['-1', '1.5', 'abc', '2000000']) expect(refusal(() => offsetCursor(bad)).status, bad).toBe(400);
  });

  test('[AAPI-UNIT-PRG-011] a directory row is a learner with one enrolment or more and a lead with none; the join date is a real date or null; counts are never negative', () => {
    const who = { id: 'user_a', name: 'Asha', email: 'a@x.com' };
    expect(directoryRow(who, Date.parse('2026-11-01T10:00:00Z'), 2)).toEqual({ id: 'user_a', name: 'Asha', email: 'a@x.com', joinedAt: '2026-11-01T10:00:00.000Z', enrolments: 2, status: 'enrolled' });
    expect(directoryRow(who, Date.parse('2026-11-01T10:00:00Z'), 0).status).toBe('lead');
    expect(directoryRow(who, undefined, 1).joinedAt).toBeNull();
    expect(directoryRow(who, NaN, 1).joinedAt).toBeNull();
    expect(directoryRow({ ...who, name: '' }, null, 0).name).toBe('Unknown student');
    expect(directoryRow(who, null, -3)).toMatchObject({ enrolments: 0, status: 'lead' });
    expect(directoryRow(who, null, 2.9).enrolments).toBe(2);
    expect(Object.keys(directoryRow(who, null, 1)).sort()).toEqual(['email', 'enrolments', 'id', 'joinedAt', 'name', 'status']);   // no payment, coupon or link field
  });

  test('[AAPI-UNIT-PERM-005] permissions: staff keys may list progress, submissions and engagement but never read code; admin keys and the owner may', () => {
    for (const p of ['progress:read', 'engagement:read', 'submissions:read'] as const) {
      expect(roleCan('key-staff', p), p).toBe(true);
      expect(roleCan('key-admin', p), p).toBe(true);
      expect(roleCan('owner', p), p).toBe(true);
    }
    expect(roleCan('key-staff', 'submissions:read-code')).toBe(false);
    expect(roleCan('key-admin', 'submissions:read-code')).toBe(true);
    expect(roleCan('owner', 'submissions:read-code')).toBe(true);
  });

  test('[AAPI-UNIT-PRG-010] the four routes are in the OpenAPI document, all read only, with the code route on its own permission', () => {
    const ops = OPERATIONS.filter((o) => ['/progress', '/submissions', '/submissions/{id}', '/engagement'].includes(o.path));
    expect(ops.map((o) => `${o.method} ${o.path} ${o.permission}`).sort()).toEqual([
      'get /engagement engagement:read', 'get /progress progress:read', 'get /submissions submissions:read', 'get /submissions/{id} submissions:read-code',
    ]);
  });
});
