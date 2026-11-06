import { test, expect } from '@playwright/test';
import { barPercent, codeSizeText, countText, formatDuration, joinedText, lastActivityText, learnerLine, percentText, statusText, streakText, submittedText } from '../../lib/adminUi/progressView';
import { NAV } from '../../lib/adminUi/nav';
import { percentOf } from '../../lib/adminApi/progress';

// Unit level (slice 4f screens): how the progress, submission and engagement numbers are written. The numbers themselves are the server's.
const NOW = new Date('2026-11-10T12:00:00.000Z');

test.describe('Admin UI progress helpers @regression', () => {
  test('[ADMUI-UNIT-PRV-001] counts and percentages: a dash where the server says unknown, never a made-up number', () => {
    expect(countText(2, 3)).toBe('2 / 3');
    expect(countText(0, 0)).toBe('0 / 0');
    expect(countText(4, null)).toBe('4 / —');
    expect(percentText(75)).toBe('75%');
    expect(percentText(0)).toBe('0%');
    expect(percentText(null)).toBe('—');
    expect([barPercent(null), barPercent(-5), barPercent(40), barPercent(250)]).toEqual([0, 0, 40, 100]);
    expect(percentText(percentOf(3, 1, { videos: 5, assignments: 3 }))).toBe('50%');   // the server's rule feeds the wording
    expect(percentText(percentOf(3, 1, null))).toBe('—');
  });

  test('[ADMUI-UNIT-PRV-002] time spent is written as hours and minutes; a streak is singular for one day', () => {
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(59)).toBe('0m');
    expect(formatDuration(60)).toBe('1m');
    expect(formatDuration(3599)).toBe('59m');
    expect(formatDuration(3600)).toBe('1h 0m');
    expect(formatDuration(45900)).toBe('12h 45m');
    expect(formatDuration(99999999)).toBe('27777h 46m');
    for (const bad of [-5, NaN, Infinity]) expect(formatDuration(bad), String(bad)).toBe('0m');
    expect(streakText(0)).toBe('0 days');
    expect(streakText(1)).toBe('1 day');
    expect(streakText(7)).toBe('7 days');
  });

  test('[ADMUI-UNIT-PRV-003] code size, last activity, submitted time and the learner line', () => {
    expect(codeSizeText(0)).toBe('empty');
    expect(codeSizeText(1)).toBe('1 character');
    expect(codeSizeText(22)).toBe('22 characters');
    expect(codeSizeText(999)).toBe('999 characters');
    expect(codeSizeText(1500)).toBe('1.5k characters');
    expect(lastActivityText(null, NOW)).toBe('No activity yet');
    expect(lastActivityText('2026-11-10T11:00:00.000Z', NOW)).toBe('1 hour ago');
    expect(lastActivityText('2026-11-07T12:00:00.000Z', NOW)).toBe('3 days ago');
    expect(submittedText('2026-11-03T09:05:59.000Z')).toBe('2026-11-03 09:05 UTC');
    expect(submittedText(null)).toBe('—');
    expect(learnerLine({ name: 'Asha', email: 'a@x.com', userId: 'user_1' })).toBe('Asha (a@x.com)');
    expect(learnerLine({ name: '', email: null, userId: 'user_1' })).toBe('Unknown student (user_1)');
  });

  test('[ADMUI-UNIT-PRV-005] the directory wording: enrolled in n cohorts (singular for one), lead, and the join date', () => {
    expect(statusText({ status: 'lead', enrolments: 0 })).toBe('Lead (not enrolled yet)');
    expect(statusText({ status: 'enrolled', enrolments: 1 })).toBe('Enrolled in 1 cohort');
    expect(statusText({ status: 'enrolled', enrolments: 3 })).toBe('Enrolled in 3 cohorts');
    expect(joinedText('2026-11-01T10:00:00.000Z')).toBe('2026-11-01');
    expect(joinedText(null)).toBe('—');
  });

  test('[ADMUI-UNIT-PRV-004] the sidebar offers Student progress, Code submissions and Engagement, and nothing is left "coming later"', () => {
    for (const href of ['/admin/progress', '/admin/submissions', '/admin/engagement', '/admin/learners']) expect(NAV.find((n) => n.href === href)?.ready, href).toBe(true);
    expect(NAV.filter((n) => !n.ready)).toEqual([]);
  });
});
