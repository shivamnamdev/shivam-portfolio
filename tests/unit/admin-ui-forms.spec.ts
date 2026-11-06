import { test, expect } from '@playwright/test';
import {
  LIFECYCLE, availableActions, canonicalJson, cohortChanges, freeNotice, sameJson, cohortToForm, emptyPlan, isSlug, isoToLocalInput, localInputToIso, parseMoney, parsePitch, pitchText, pricingHints, slugify,
  type CohortForm, type Pricing,
} from '../../lib/adminUi/forms';
import { COURSE_ACTIONS } from '../../lib/adminApi/courses';

// Unit level (phase 4b): the pure helpers behind the course and cohort screens. No browser, no network.
const single: Pricing = { kind: 'single', inr: { amount: 1999, original: 2499 }, usd: { amount: 29 } };
const plans: Pricing = { kind: 'plans', currency: 'INR', plans: [{ id: 'community', name: 'C', price: { amount: 1999 }, features: ['a'] }, { id: 'personal', name: 'P', price: { amount: 2999, original: 4999 }, features: [] }] };
const base: CohortForm = cohortToForm({ title: 'Python Batch 1', statusText: 'Open', enrollmentClosed: false, listed: true, startsAt: '2026-12-01T04:30:00.000Z', pricing: single });

test.describe('Admin UI forms @regression', () => {
  test('[ADMUI-UNIT-LIFE-001] the life-cycle buttons offered are exactly the transitions the server allows', () => {
    expect(Object.keys(LIFECYCLE).sort()).toEqual(Object.keys(COURSE_ACTIONS).sort());
    for (const [action, rule] of Object.entries(COURSE_ACTIONS)) expect([...LIFECYCLE[action].from].sort(), action).toEqual([...rule.from].sort());
    expect(availableActions('draft')).toEqual(['publish', 'archive']);
    expect(availableActions('published')).toEqual(['unpublish', 'archive']);
    expect(availableActions('archived')).toEqual(['restore']);
    expect(availableActions('nonsense')).toEqual([]);
  });

  test('[ADMUI-UNIT-SLUG-001] slug suggestions are lower case, dashed, bounded and valid; bad slugs are recognised', () => {
    expect(slugify('Python for Beginners — Batch 2!')).toBe('python-for-beginners-batch-2');
    expect(slugify('  Café  Déjà vu ')).toBe('cafe-deja-vu');
    expect(slugify('---')).toBe('');
    expect(slugify('')).toBe('');
    expect(slugify('x'.repeat(150)).length).toBe(100);
    expect(slugify('a'.repeat(99) + ' b')).toBe('a'.repeat(99));   // no trailing dash after cutting
    for (const t of ['Python 101', 'DevOps & Cloud', 'क्या है']) { const s = slugify(t); expect(s === '' || isSlug(s), t).toBe(true); }
    for (const ok of ['a', 'py-1', 'a_b', '9lives']) expect(isSlug(ok), ok).toBe(true);
    for (const bad of ['', '-a', 'A', 'a b', 'a/b', 'x'.repeat(101)]) expect(isSlug(bad), bad).toBe(false);
  });

  test('[ADMUI-UNIT-PITCH-001] the pitch box accepts empty or a JSON object and explains anything else', () => {
    expect(parsePitch('')).toEqual({ ok: true, value: {} });
    expect(parsePitch('   ')).toEqual({ ok: true, value: {} });
    expect(parsePitch('{"headline":"Hi","n":[1,2]}')).toEqual({ ok: true, value: { headline: 'Hi', n: [1, 2] } });
    for (const bad of ['{', '[1]', '"text"', '42', 'null', '{"a":}']) { const r = parsePitch(bad); expect(r.ok, bad).toBe(false); }
    const r = parsePitch('[1]'); if (!r.ok) expect(r.message).toMatch(/object/);
    expect(parsePitch(pitchText({ a: { b: 1 } }))).toEqual({ ok: true, value: { a: { b: 1 } } });
    expect(pitchText(undefined)).toBe('{}');
  });

  test('[ADMUI-UNIT-DATE-001] date boxes round-trip a minute-aligned instant; empty or bad input is "not set"', () => {
    for (const iso of ['2026-12-01T04:30:00.000Z', '2027-03-28T23:59:00.000Z', '2026-01-01T00:00:00.000Z']) expect(localInputToIso(isoToLocalInput(iso)), iso).toBe(iso);
    expect(isoToLocalInput(null)).toBe('');
    expect(isoToLocalInput('garbage')).toBe('');
    expect(isoToLocalInput('2026-12-01T04:30:00.000Z')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(localInputToIso('')).toBeUndefined();
    expect(localInputToIso('not a date')).toBeUndefined();
  });

  test('[ADMUI-UNIT-PRICE-001] money boxes: empty is unset, a plain number is kept, junk and negatives are invalid', () => {
    expect(parseMoney('')).toBeUndefined();
    expect(parseMoney('  ')).toBeUndefined();
    expect(parseMoney('1999')).toBe(1999);
    expect(parseMoney('0')).toBe(0);
    expect(parseMoney('19.99')).toBe(19.99);
    for (const bad of ['abc', '-5', 'NaN', 'Infinity', '1,999']) expect(parseMoney(bad), bad).toBeNull();
  });

  test('[ADMUI-UNIT-PRICE-002] pricing hints mirror the server rules: minimum charge, free is fine, original not below price, unique valid plan ids', () => {
    expect(pricingHints(single)).toEqual([]);
    expect(pricingHints({ kind: 'single', inr: { amount: 0 } })).toEqual([]);   // zero = free enrolment
    expect(pricingHints({ kind: 'single', inr: { amount: 0.4 } })[0]).toMatch(/at least 1 INR/);
    expect(pricingHints({ kind: 'single', inr: { amount: 500 }, usd: { amount: 0.5 } })[0]).toMatch(/USD price.*at least 1 USD/);
    expect(pricingHints({ kind: 'single', inr: { amount: 500, original: 400 } })[0]).toMatch(/original price cannot be lower/);
    expect(pricingHints(plans)).toEqual([]);
    expect(pricingHints({ kind: 'plans', currency: 'INR', plans: [plans.kind === 'plans' ? plans.plans[0] : emptyPlan(1), plans.kind === 'plans' ? plans.plans[0] : emptyPlan(1)] }).join(' ')).toMatch(/unique/);
    expect(pricingHints({ kind: 'plans', currency: 'INR', plans: [{ ...emptyPlan(1), name: 'N', id: 'Bad Id', price: { amount: 5 } }] }).join(' ')).toMatch(/must be lower case/);
    expect(pricingHints({ kind: 'plans', currency: 'INR', plans: [{ ...emptyPlan(1), name: 'N', price: { amount: 0.5 } }] })[0]).toMatch(/Plan plan-1.*at least 1 INR/);
    expect(pricingHints({ kind: 'plans', currency: 'INR', plans: [{ ...emptyPlan(1), price: { amount: 5 } }] })).toEqual(['Plan plan-1 needs a name']);
    expect(pricingHints({ kind: 'plans', currency: 'INR', plans: [{ ...emptyPlan(1), name: '   ', price: { amount: 5 } }] })[0]).toMatch(/needs a name/);
    expect(emptyPlan(3).id).toBe('plan-3');
  });

  test('[ADMUI-UNIT-COH-001] an unchanged cohort form sends nothing; only changed fields are sent', () => {
    expect(cohortChanges(base, { ...base })).toEqual({});
    expect(cohortChanges(base, { ...base, title: ' New title ' })).toEqual({ title: 'New title' });
    expect(cohortChanges(base, { ...base, enrollmentClosed: true, listed: false })).toEqual({ enrollmentClosed: true, listed: false });
    expect(cohortChanges(base, { ...base, statusText: 'Few seats left', duration: '8 weeks' })).toEqual({ statusText: 'Few seats left', duration: '8 weeks' });
    expect(cohortChanges(base, { ...base, endsAt: '2027-01-31T10:00' }).endsAt).toBe(new Date('2027-01-31T10:00').toISOString());
    expect(cohortChanges(base, { ...base, pricing: { kind: 'single', inr: { amount: 2499 } } })).toEqual({ pricing: { kind: 'single', inr: { amount: 2499 } } });
    expect(cohortChanges(base, { ...base, pricing: plans }).pricing).toEqual(plans);
  });

  test('[ADMUI-UNIT-COH-002] an emptied optional box or date is not sent (the API cannot clear them), so it never sends "" or a bad date', () => {
    const withText = { ...base, statusText: 'Open', demoOffer: 'Free demo' };
    expect(cohortChanges(withText, { ...withText, statusText: '', demoOffer: '   ' })).toEqual({});
    expect(cohortChanges(base, { ...base, startsAt: '' })).toEqual({});
    expect(cohortChanges(base, { ...base, startsAt: 'garbage' })).toEqual({});
    expect(cohortChanges(base, { ...base, title: '   ' })).toEqual({});   // a blank title is never sent
    expect(Object.keys(cohortToForm({ pricing: single })).sort()).toEqual(['contactPhone', 'demoOffer', 'duration', 'endsAt', 'enrollmentClosed', 'listed', 'pricing', 'startsAt', 'statusText', 'title']);
    expect(cohortToForm({ pricing: single })).toMatchObject({ listed: true, enrollmentClosed: false, title: '' });
  });

  test('[ADMUI-UNIT-PRICE-003] a zero price shows a "free" notice, a paid setup shows none', () => {
    expect(freeNotice(single)).toBeNull();
    expect(freeNotice({ kind: 'single', inr: { amount: 0 } })).toMatch(/free/);
    expect(freeNotice({ kind: 'single', inr: { amount: 999 }, usd: { amount: 0 } })).toMatch(/free/);
    expect(freeNotice(plans)).toBeNull();
    expect(freeNotice({ kind: 'plans', currency: 'INR', plans: [{ ...emptyPlan(1), id: 'gift' }, { ...emptyPlan(2), id: 'paid', price: { amount: 10 } }] })).toBe('Free to join: gift (price 0).');
  });

  test('[ADMUI-UNIT-JSON-001] comparing JSON ignores key order (the database returns its own order), but sees every real difference', () => {
    expect(sameJson({ type: 'fixed', inr: 300 }, { inr: 300, type: 'fixed' })).toBe(true);
    expect(sameJson({ a: { b: 1, c: [1, { y: 1, x: 2 }] } }, { a: { c: [1, { x: 2, y: 1 }], b: 1 } })).toBe(true);
    expect(sameJson({ a: 1 }, { a: 2 })).toBe(false);
    expect(sameJson([1, 2], [2, 1])).toBe(false);   // array order is real
    expect(sameJson({ a: undefined, b: 1 }, { b: 1 })).toBe(true);   // an absent key equals an undefined one
    expect(sameJson({ a: null }, {})).toBe(false);
    expect(sameJson(undefined, undefined)).toBe(true);
    expect(sameJson([], [])).toBe(true);
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    // the real cases: a price written by the database and the same price built by the form, and a resource list
    const fromDb: Pricing = JSON.parse('{"inr":{"amount":1999,"original":2499},"kind":"single"}');
    const fromForm: Pricing = { kind: 'single', inr: { original: 2499, amount: 1999 } };
    expect(cohortChanges(cohortToForm({ title: 'T', pricing: fromDb }), { ...cohortToForm({ title: 'T', pricing: fromDb }), pricing: fromForm })).toEqual({});
    expect(sameJson([{ title: 'A', type: 'PDF', url: 'https://github.com/x' }], [{ title: 'A', url: 'https://github.com/x', type: 'PDF' }])).toBe(true);
  });
});
