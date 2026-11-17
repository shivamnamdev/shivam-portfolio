import { test, expect } from '@playwright/test';
import { cardPreview, cardPrice, INSTRUCTOR, type CardCourse } from '../../lib/catalogCard';

// Unit level: what a catalog card shows (SCP-43). No database, no network.
const single: CardCourse = { enrollmentClosed: false, pricing: { inr: { currentPrice: '₹1,999' }, usd: { currentPrice: '$25' } } };

test.describe('Catalog card rules @unit', () => {
  test('[CARD-UNIT-001] the instructor is Shivam Namdev', () => {
    expect(INSTRUCTOR).toBe('Shivam Namdev');
  });

  test('[CARD-UNIT-002] cardPrice: a single-price course follows the currency, with no note', () => {
    expect(cardPrice(single, 'INR')).toEqual({ label: '₹1,999' });
    expect(cardPrice(single, 'USD')).toEqual({ label: '$25' });
  });

  test('[CARD-UNIT-003] cardPrice: no USD price keeps the INR price and says INR only', () => {
    const noUsd: CardCourse = { enrollmentClosed: false, pricing: { inr: { currentPrice: '₹599' } } };
    expect(cardPrice(noUsd, 'USD')).toEqual({ label: '₹599', note: 'INR only' });
    expect(cardPrice(noUsd, 'INR')).toEqual({ label: '₹599' });
  });

  test('[CARD-UNIT-004] cardPrice: a plan course shows From the cheapest plan, INR only in USD mode', () => {
    const plans: CardCourse = { enrollmentClosed: false, pricing: { inr: { currentPrice: '₹4,999' } }, pricingPlans: [{ price: '₹4,999' }, { price: '₹2,999' }, { price: '₹3,500' }] };
    expect(cardPrice(plans, 'INR')).toEqual({ label: 'From ₹2999' });
    expect(cardPrice(plans, 'USD')).toEqual({ label: 'From ₹2999', note: 'INR only' });
  });

  test('[CARD-UNIT-005] cardPrice: a closed cohort shows Closed (Soon when recorded) in either currency, never a price', () => {
    expect(cardPrice({ ...single, enrollmentClosed: true }, 'INR')).toEqual({ label: 'Closed' });
    expect(cardPrice({ ...single, enrollmentClosed: true }, 'USD')).toEqual({ label: 'Closed' });
    expect(cardPrice({ ...single, enrollmentClosed: true, format: 'recorded' }, 'USD')).toEqual({ label: 'Soon' });
  });

  test('[CARD-UNIT-006] cardPreview: highlights and modules are capped at 6, the rest is counted', () => {
    const modules = Array.from({ length: 9 }, (_, i) => ({ title: `Module ${i + 1}` }));
    const facts = Array.from({ length: 8 }, (_, i) => `Fact ${i + 1}`);
    const p = cardPreview({ enrollmentClosed: false, vsl: { facts }, modules });
    expect(p.highlights).toEqual(facts.slice(0, 6));
    expect(p.modules).toEqual(modules.slice(0, 6).map(m => m.title));
    expect(p.moreModules).toBe(3);
  });

  test('[CARD-UNIT-007] cardPreview: a course with no facts or modules gives empty lists and nothing is invented', () => {
    expect(cardPreview({ enrollmentClosed: false })).toEqual({ highlights: [], modules: [], moreModules: 0 });
    expect(cardPreview({ enrollmentClosed: false, vsl: { facts: ['', '  '] }, modules: [{ title: '' }, { title: 'Real' }] })).toEqual({ highlights: [], modules: ['Real'], moreModules: 0 });
  });
});
