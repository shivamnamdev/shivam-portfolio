import { test, expect } from '@playwright/test';
import { CTA_BUY, CTA_ENROLL, CTA_TRUST } from '../../components/ctaStyles';

// Unit level: the enroll button looks (SCP-30). No database, no network.
test.describe('CTA styles @unit', () => {
  test('[CTA-UNIT-001] the trust line is made only of plain facts: no numbers, counters or deadlines', () => {
    expect(CTA_TRUST.length).toBeGreaterThan(0);
    for (const t of CTA_TRUST) expect(t).not.toMatch(/\d|left|hurry|only|ends|today/i);
  });

  test('[CTA-UNIT-002] both looks keep dark text on a light amber background and have a hover state', () => {
    for (const cls of [CTA_BUY, CTA_ENROLL]) {
      expect(cls).toContain('text-black');
      expect(cls).toMatch(/amber/);
      expect(cls).toContain('hover:');
    }
  });
});
