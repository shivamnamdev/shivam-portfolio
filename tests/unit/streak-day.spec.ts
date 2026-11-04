import { test, expect } from '@playwright/test';
import { streakDays, validTimeZone } from '../../lib/streakDay';

// SCP-60: the streak day is the learner's calendar day.
test.describe('STK streak day @regression', () => {
  const evening = new Date('2026-11-03T20:00:00Z');   // 01:30 on 4 Nov in India, 12:00 on 3 Nov in Los Angeles
  test('[STK-DAY-001] without a time zone the day is the UTC day', () => {
    expect(streakDays(evening)).toEqual({ today: '2026-11-03', yesterday: '2026-11-02' });
  });
  test('[STK-DAY-002] an Indian learner is already on the next day at 01:30 (SCP-60)', () => {
    expect(streakDays(evening, 'Asia/Kolkata')).toEqual({ today: '2026-11-04', yesterday: '2026-11-03' });
  });
  test('[STK-DAY-003] a learner west of UTC is still on the earlier day', () => {
    expect(streakDays(new Date('2026-11-03T03:00:00Z'), 'America/Los_Angeles')).toEqual({ today: '2026-11-02', yesterday: '2026-11-01' });
  });
  test('[STK-DAY-004] yesterday is correct across a daylight-saving change and a month end', () => {
    expect(streakDays(new Date('2026-11-01T12:00:00Z'), 'America/New_York').yesterday).toBe('2026-10-31');
    expect(streakDays(new Date('2026-03-01T10:00:00Z'), 'UTC').yesterday).toBe('2026-02-28');
  });
  test('[STK-DAY-005] an unknown or unsafe time zone falls back to UTC', () => {
    for (const tz of ['Not/AZone', '', 5, null, undefined, 'x'.repeat(100)]) {
      expect(validTimeZone(tz), String(tz)).toBe(false);
      expect(streakDays(evening, tz).today).toBe('2026-11-03');
    }
  });
});
