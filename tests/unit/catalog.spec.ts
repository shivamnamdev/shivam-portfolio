import { test, expect } from '@playwright/test';
import { chooseSource, readWithFallback } from '../../lib/catalog/source';
import { CATALOG_TAG, touchesCatalog } from '../../lib/catalog/tags';
import { PITCH_KEYS, buildCourse, formatMoney, pricingFromCohort, savingsText, whatsappNumber, FALLBACK_WHATSAPP_NUMBER, type CohortView, type CourseView, type PricingView } from '../../lib/catalog/mapping';
import { activeCourses, isQaFixture } from '../../data/courses';

// Unit level (phase 5, slice 5a): the source flag, the cache tag rule and the mapping from the portal's documents to the sales-page object.
// No database, no network. The last test compares what the portal would build from today's data files with the files themselves (drift guard).
const cohort = (extra: Partial<CohortView> = {}): CohortView => ({
  slug: 'py-1', courseSlug: 'python', title: 'Python Batch 1', statusText: 'Open', demoOffer: 'Free demo', duration: '4 weeks', contactPhone: '9999999999',
  enrollmentClosed: false, pricing: { kind: 'single', inr: { amount: 1999, original: 2499 }, usd: { amount: 25, original: 40 } }, ...extra,
});
const course = (pitch: Record<string, unknown> = {}): CourseView => ({ slug: 'python', title: 'Python', summary: 's', pitch });
const fileEntry = (extra: Record<string, unknown> = {}) => ({
  slug: 'py-1', enrollmentClosed: false,
  pricing: { inr: { currentPrice: '₹1,499', originalPrice: '₹1,999', savingsText: 'File text', currencyCode: 'INR' } } as PricingView, ...extra,
});

test.describe('Catalog source and mapping @regression', () => {
  test('[CAT-UNIT-SRC-001] only the exact word "database" turns the database on; anything else is the files', () => {
    expect(chooseSource('database')).toBe('database');
    expect(chooseSource('  DataBase ')).toBe('database');
    for (const v of ['files', '', ' ', 'db', 'true', '1', 'databases', undefined, null]) expect(chooseSource(v as never), String(v)).toBe('files');
  });

  test('[CAT-UNIT-SRC-002] reading: files never touch the database; the database answers when it can; an error or an empty answer falls back to the files and says why', async () => {
    const reasons: string[] = [];
    let touched = 0;
    const db = async () => { touched++; return ['db']; };
    const files = () => ['files'];
    const note = (r: string) => reasons.push(r);
    expect(await readWithFallback('files', db, files, note)).toEqual({ value: ['files'], source: 'files' });
    expect(touched).toBe(0);
    expect(await readWithFallback('database', db, files, note)).toEqual({ value: ['db'], source: 'database' });
    expect(await readWithFallback('database', async () => null, files, note)).toEqual({ value: ['files'], source: 'files' });
    expect(await readWithFallback('database', async () => undefined, files, note)).toEqual({ value: ['files'], source: 'files' });
    expect(await readWithFallback('database', async () => { throw new Error('boom'); }, files, note)).toEqual({ value: ['files'], source: 'files' });
    expect(reasons).toEqual(['empty', 'empty', 'error']);
    expect(await readWithFallback('database', async () => [] as string[], files, note)).toEqual({ value: [], source: 'database' });   // an empty LIST is an answer; only null means "nothing published"
  });

  test('[CAT-UNIT-TAG-001] writes to courses, cohorts and settings refresh the catalog; reads and other resources do not', () => {
    expect(CATALOG_TAG).toBe('catalog');
    for (const r of ['course', 'cohort', 'setting']) for (const a of ['create', 'update', 'delete', 'publish', 'unpublish', 'archive', 'restore']) expect(touchesCatalog(r, a), `${r} ${a}`).toBe(true);
    for (const [r, a] of [['export', 'export'], ['enrolment', 'grant'], ['coupon', 'create'], ['banner', 'publish'], ['curriculum', 'update'], ['cohort', 'read'], ['course', 'export'], ['', '']]) expect(touchesCatalog(r, a), `${r} ${a}`).toBe(false);
  });

  test('[CAT-UNIT-MAP-001] money is written like the site writes it: rupees with Indian grouping, dollars with cents only when there are some; savings text only when it is a real saving', () => {
    expect(formatMoney(399, 'INR')).toBe('₹399');
    expect(formatMoney(1999, 'INR')).toBe('₹1,999');
    expect(formatMoney(125000, 'INR')).toBe('₹1,25,000');
    expect(formatMoney(9.99, 'USD')).toBe('$9.99');
    expect(formatMoney(150, 'USD')).toBe('$150');
    expect(formatMoney(-5, 'INR')).toBe('₹0');
    expect(formatMoney(NaN, 'USD')).toBe('$0');
    expect(savingsText({ amount: 1500, original: 2000 }, 'INR')).toBe('Save ₹500 (25% off)');
    expect(savingsText({ amount: 2000, original: 2000 }, 'INR')).toBe('');
    expect(savingsText({ amount: 2000 }, 'INR')).toBe('');
  });

  test('[CAT-UNIT-MAP-002] pricing: single prices become the INR and optional USD blocks; a plans cohort shows its lowest plan', () => {
    const single = pricingFromCohort({ kind: 'single', inr: { amount: 1999, original: 2499 }, usd: { amount: 25 } });
    expect(single.inr).toEqual({ currentPrice: '₹1,999', originalPrice: '₹2,499', savingsText: 'Save ₹500 (20% off)', currencyCode: 'INR' });
    expect(single.usd).toEqual({ currentPrice: '$25', originalPrice: '', savingsText: '', currencyCode: 'USD' });
    expect(pricingFromCohort({ kind: 'single', inr: { amount: 500 } }).usd).toBeUndefined();
    const plans = pricingFromCohort({ kind: 'plans', currency: 'INR', plans: [{ id: 'b', name: 'B', price: { amount: 2999 } }, { id: 'a', name: 'A', price: { amount: 1999, original: 2499 } }] });
    expect(plans.inr.currentPrice).toBe('₹1,999');
    expect(plans.usd).toBeUndefined();
  });

  test('[CAT-UNIT-MAP-003] a built course takes its identity from the cohort and only the known sales blocks from the pitch; a pitch can never set price, status, ids or links', () => {
    const hostile = { vsl: { headlinePart1: 'Hi' }, modules: [{ title: 'M' }], slug: 'evil', id: 'evil', title: 'Evil', enrollmentClosed: true, listed: false, pricing: { inr: { currentPrice: '₹1' } },
      liveLink: 'https://meet.google.com/x', whatsappLink: 'https://chat.whatsapp.com/x', private: { liveLink: 'x' }, statusText: 'Evil' };
    const c = buildCourse(cohort(), course(hostile), 'database', undefined);
    expect(c).toMatchObject({ id: 'py-1', slug: 'py-1', courseSlug: 'python', title: 'Python Batch 1', statusText: 'Open', enrollmentClosed: false, listed: true, vsl: { headlinePart1: 'Hi' }, modules: [{ title: 'M' }] });
    expect(c.pricing.inr.currentPrice).toBe('₹1,999');
    for (const k of ['liveLink', 'whatsappLink', 'private']) expect(Object.keys(c), k).not.toContain(k);
    expect(Object.keys(c).filter((k) => (PITCH_KEYS as readonly string[]).includes(k)).sort()).toEqual(['modules', 'vsl']);
    expect(JSON.stringify(c)).not.toMatch(/meet\.google|chat\.whatsapp/);
  });

  test('[CAT-UNIT-MAP-006] a pitch with blocks missing leaves them absent (the sales components hide or default a missing block); given blocks are kept', () => {
    const bare = buildCourse(cohort(), course({}), 'database', undefined);
    for (const k of PITCH_KEYS) expect(Object.keys(bare), k).not.toContain(k);
    const some = buildCourse(cohort(), course({ outcomes: ['a'], painPoints: { oldWay: ['x'], newWay: ['y'] } }), 'database', undefined);
    expect(some.outcomes).toEqual(['a']);
    expect(some.painPoints).toEqual({ oldWay: ['x'], newWay: ['y'] });
    expect(Object.keys(some)).not.toContain('modules');
    expect(buildCourse(cohort(), { slug: 'python', title: 'Python' }, 'database', undefined).slug).toBe('py-1');   // a course with no pitch at all
  });

  test('[CAT-UNIT-MAP-004] price and open or closed follow the payment source: files price a cohort that exists in the files; a portal-only cohort is closed until the database prices orders', () => {
    const inFiles = buildCourse(cohort(), course(), 'files', fileEntry());
    expect(inFiles.pricing.inr.currentPrice).toBe('₹1,499');          // the file's price, not the portal's ₹1,999
    expect(inFiles.pricing.inr.savingsText).toBe('File text');
    expect(inFiles.enrollmentClosed).toBe(false);
    expect(buildCourse(cohort(), course(), 'files', fileEntry({ enrollmentClosed: true })).enrollmentClosed).toBe(true);
    expect(buildCourse(cohort({ enrollmentClosed: false }), course(), 'files', undefined).enrollmentClosed).toBe(true);   // portal-only: the server could not charge it
    const db = buildCourse(cohort({ enrollmentClosed: true }), course(), 'database', fileEntry());
    expect(db.pricing.inr.currentPrice).toBe('₹1,999');                // the portal's price once the database prices orders
    expect(db.enrollmentClosed).toBe(true);                            // and the portal's closed flag
    expect(buildCourse(cohort({ listed: false }), course(), 'database', undefined).listed).toBe(false);
    expect(buildCourse(cohort({ listed: undefined }), course(), 'database', undefined).listed).toBe(true);
    expect(buildCourse(cohort({ statusText: undefined, demoOffer: undefined, duration: undefined, contactPhone: undefined }), course(), 'database', undefined)).toMatchObject({ statusText: '', demoOffer: '', duration: '', contactPhone: '' });
  });

  test('[CAT-UNIT-MAP-005] the support number: digits only, India added to a plain 10-digit number, nothing for something unusable', () => {
    expect(whatsappNumber('+91 98765 43210')).toBe('919876543210');
    expect(whatsappNumber('98765 43210')).toBe('919876543210');
    expect(whatsappNumber('(020) 1234-5678')).toBeNull();   // starts with 0: not the international form wa.me needs
    expect(whatsappNumber('09876543210')).toBeNull();
    expect(whatsappNumber(null)).toBeNull();
    expect(whatsappNumber('')).toBeNull();
    expect(whatsappNumber('12345')).toBeNull();
    expect(whatsappNumber('1'.repeat(16))).toBeNull();
    expect(FALLBACK_WHATSAPP_NUMBER).toBe('917057034840');
  });

  test('[CAT-UNIT-DRIFT-001] what the portal would build from every real course in the data files equals the files: sales blocks, texts and price strings (links are not carried)', () => {
    const real = (activeCourses as unknown as Array<Record<string, any>>).filter((c) => !isQaFixture(c.slug));
    expect(real.length).toBeGreaterThan(0);
    const amount = (label: string) => Number.parseFloat(label.replace(/[^0-9.]/g, ''));
    for (const f of real) {
      const pitch = Object.fromEntries(PITCH_KEYS.filter((k) => f[k] !== undefined).map((k) => [k, f[k]]));
      const pricing = { kind: 'single' as const, inr: { amount: amount(f.pricing.inr.currentPrice), original: amount(f.pricing.inr.originalPrice) }, ...(f.pricing.usd ? { usd: { amount: amount(f.pricing.usd.currentPrice), original: amount(f.pricing.usd.originalPrice) } } : {}) };
      const co: CohortView = { slug: f.slug, courseSlug: 'x', title: f.title, statusText: f.statusText, demoOffer: f.demoOffer, duration: f.duration, contactPhone: f.contactPhone, enrollmentClosed: f.enrollmentClosed, pricing };
      const viaFiles = buildCourse(co, { slug: 'x', title: f.title, pitch }, 'files', f as never);
      for (const k of PITCH_KEYS) expect(viaFiles[k], `${f.slug} ${k}`).toEqual(f[k]);
      for (const k of ['id', 'slug', 'title', 'statusText', 'demoOffer', 'duration', 'contactPhone', 'enrollmentClosed']) expect(viaFiles[k], `${f.slug} ${k}`).toEqual(f[k]);
      expect(viaFiles.pricing).toEqual(f.pricing);
      expect(Object.keys(viaFiles)).not.toContain('whatsappLink');
      expect(Object.keys(viaFiles)).not.toContain('liveLink');
      // and the portal's own numbers write the same price strings as the files do
      const viaDb = buildCourse(co, { slug: 'x', title: f.title, pitch }, 'database', undefined);
      expect(viaDb.pricing.inr.currentPrice, `${f.slug} inr`).toBe(f.pricing.inr.currentPrice);
      expect(viaDb.pricing.inr.originalPrice, `${f.slug} inr original`).toBe(f.pricing.inr.originalPrice);
      if (f.pricing.usd) { expect(viaDb.pricing.usd?.currentPrice).toBe(f.pricing.usd.currentPrice); expect(viaDb.pricing.usd?.originalPrice).toBe(f.pricing.usd.originalPrice); }
    }
  });
});
