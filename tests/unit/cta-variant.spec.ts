import { test, expect } from '@playwright/test';
import { ctaVariantFrom } from '../../lib/ctaVariant';
import { CTA_LOOK, CTA_TRUST } from '../../components/ctaLook';

// Unit level: the temporary button-look switch (SCP-30). No database, no network.
test.describe('CTA variant switch @unit', () => {
  test('[CTA-UNIT-001] ?cta=a, b and c select a look; anything else keeps today\'s look', () => {
    expect(ctaVariantFrom('?cta=a')).toBe('a');
    expect(ctaVariantFrom('?x=1&cta=b')).toBe('b');
    expect(ctaVariantFrom('cta=c')).toBe('c');
    for (const s of ['', '?cta=', '?cta=d', '?cta=A', '?cta=a,b', '?other=a']) expect(ctaVariantFrom(s), s).toBeNull();
  });

  test('[CTA-UNIT-002] every look has styles and a trust line made only of plain facts', () => {
    for (const v of ['a', 'b', 'c'] as const) {
      expect(CTA_LOOK[v].length).toBeGreaterThan(20);
      expect(CTA_TRUST[v].length).toBeGreaterThan(0);
      for (const t of CTA_TRUST[v]) expect(t, 'no counters or deadlines').not.toMatch(/\d|left|hurry|only/i);
    }
  });
});
