import { test, expect } from '@playwright/test';
import { activeCourses } from '../../data/courses';
import { parseAmount, planCatalogImport, pricingFor, type FileCourse } from '../../lib/adminApi/importCatalog';
import { cohortCreateShape, cohortUpdateShape, publicCohort } from '../../lib/adminApi/cohorts';
import { cohortFromDoc, buildCourse } from '../../lib/catalog/mapping';
import { parseObject } from '../../lib/adminApi/validate';

// Unit level: the one-off copy of data/courses.ts into portal courses and cohorts. No database, no network.
const SLUGS = ['python-beginners', 'python-beginners-batch-2', 'python-foundation', 'git-beginner-batch-1'];
const entries = (): FileCourse[] => SLUGS.map((s) => (activeCourses as unknown as FileCourse[]).find((c) => c.slug === s)!);
const none = { courses: {}, cohorts: {} };
const refusal = (fn: () => unknown): Error => { try { fn(); } catch (e) { return e as Error; } throw new Error('expected a refusal'); };

test.describe('AAPI catalog import @regression', () => {
  test('[AAPI-UNIT-CAT-001] the four sold cohorts exist in the data files and each maps to a valid course and cohort', () => {
    expect(entries().every(Boolean)).toBe(true);
    const plans = planCatalogImport(entries(), none, false);
    expect(plans.map((p) => p.slug)).toEqual(SLUGS);
    for (const p of plans) {
      expect(p.course.action).toBe('create');
      expect(p.cohort.action).toBe('create');
      expect(p.cohort.doc.courseSlug).toBe(p.slug);       // one course per cohort, same slug
      expect(p.cohort.doc).not.toHaveProperty('slug');    // the slug is the row key
    }
  });

  test('[AAPI-UNIT-CAT-002] price strings become numbers: plans keep id, popular and the original price; single keeps INR and USD', () => {
    expect(parseAmount('₹1,999')).toBe(1999);
    expect(parseAmount('$9.99')).toBe(9.99);
    for (const bad of ['', 'free', '₹', '₹1.999,5', 'Rs 10', undefined]) refusal(() => parseAmount(bad as string));
    const f = entries().find((c) => c.slug === 'python-foundation')!;
    const p = pricingFor(f);
    expect(p.kind).toBe('plans');
    if (p.kind === 'plans') {
      expect(p.plans.map((x) => [x.id, x.price.amount, x.price.original, !!x.popular])).toEqual([['community', 1999, 2499, false], ['personal', 2999, 4999, true]]);
    }
    const git = pricingFor(entries().find((c) => c.slug === 'git-beginner-batch-1')!);
    expect(git).toEqual({ kind: 'single', inr: { amount: 399, original: 799 }, usd: { amount: 9.99, original: 19.99 } });
    refusal(() => pricingFor({ slug: 'x', title: 'x' } as FileCourse));
  });

  test('[AAPI-UNIT-CAT-003] status flags are copied exactly: listed, enrolment closed, format', () => {
    const by = Object.fromEntries(planCatalogImport(entries(), none, false).map((p) => [p.slug, p.cohort.doc]));
    expect(by['python-beginners-batch-2']).toMatchObject({ listed: false, enrollmentClosed: true });
    expect(by['python-beginners']).toMatchObject({ listed: false });
    expect(by['python-foundation']).toMatchObject({ listed: true, enrollmentClosed: true, format: 'recorded' });
    expect(by['git-beginner-batch-1']).toMatchObject({ listed: true, enrollmentClosed: true });
    expect(by['git-beginner-batch-1']).not.toHaveProperty('format');   // a file entry without a format stays "not set", which reads as live
  });

  test('[AAPI-UNIT-CAT-004] links go under private, and the notes and the public view never carry a link', () => {
    const plans = planCatalogImport(entries(), none, false);
    const b2 = plans.find((p) => p.slug === 'python-beginners-batch-2')!;
    expect((b2.cohort.doc.private as { whatsappLink: string }).whatsappLink).toMatch(/^https:\/\/chat\.whatsapp\.com\//);
    expect(publicCohort(b2.cohort.doc)).not.toHaveProperty('private');
    const f = plans.find((p) => p.slug === 'python-foundation')!;
    expect(f.cohort.doc.private).toEqual({ whatsappLink: '', liveLink: '' });
    for (const p of plans) {
      expect(p.notes.join(' ')).not.toMatch(/https?:|meet\.google|whatsapp\.com/);
      expect(p.notes[0]).toMatch(/^whatsapp link (set|empty)$/);
    }
    expect(b2.notes[0]).toBe('whatsapp link set');
    expect(f.notes[0]).toBe('whatsapp link empty');
  });

  test('[AAPI-UNIT-CAT-005] pitch blocks go to the course; nothing identity, price or link related leaks into the pitch', () => {
    for (const p of planCatalogImport(entries(), none, false)) {
      const pitch = p.course.doc.pitch as Record<string, unknown>;
      expect(Object.keys(pitch)).toEqual(expect.arrayContaining(['vsl', 'modules']));
      for (const k of ['slug', 'title', 'pricing', 'pricingPlans', 'liveLink', 'whatsappLink', 'enrollmentClosed', 'listed']) expect(pitch, `${p.slug} ${k}`).not.toHaveProperty(k);
      expect(p.course.doc.title).toBe(p.cohort.doc.title);
    }
  });

  test('[AAPI-UNIT-CAT-006] a record that matches is "unchanged", one that differs is left alone unless overwrite is asked for, a missing one is created', () => {
    const first = planCatalogImport(entries(), none, false);
    const existing = {
      courses: Object.fromEntries(first.map((p) => [p.slug, p.course.doc])),
      cohorts: Object.fromEntries(first.map((p) => [p.slug, p.cohort.doc])),
    };
    // key order inside jsonb is not stable, so a re-ordered copy must still count as unchanged
    const reordered = { ...existing, cohorts: Object.fromEntries(Object.entries(existing.cohorts).map(([k, v]) => [k, Object.fromEntries(Object.entries(v!).reverse())])) };
    for (const p of planCatalogImport(entries(), reordered, false)) { expect(p.course.action).toBe('unchanged'); expect(p.cohort.action).toBe('unchanged'); }

    const edited = { courses: existing.courses, cohorts: { ...existing.cohorts, 'python-foundation': { ...existing.cohorts['python-foundation'], title: 'Edited in the portal' } } };
    const safe = planCatalogImport(entries(), edited, false).find((p) => p.slug === 'python-foundation')!;
    expect(safe.cohort.action).toBe('differs');
    expect(safe.course.action).toBe('unchanged');
    expect(planCatalogImport(entries(), edited, true).find((p) => p.slug === 'python-foundation')!.cohort.action).toBe('overwrite');

    const partial = { courses: { 'python-foundation': existing.courses['python-foundation'] }, cohorts: {} };
    const p = planCatalogImport(entries(), partial, false).find((x) => x.slug === 'python-foundation')!;
    expect([p.course.action, p.cohort.action]).toEqual(['unchanged', 'create']);
  });

  test('[AAPI-UNIT-CAT-010] what is planned equals what the database returns: a JSON round trip changes nothing (keys set to undefined cannot make a second run say "differs")', () => {
    const plans = planCatalogImport(entries(), none, false);
    for (const p of plans) {
      expect(JSON.parse(JSON.stringify(p.cohort.doc)), p.slug).toEqual(p.cohort.doc);
      expect(JSON.stringify(p.cohort.doc)).not.toContain('undefined');
    }
    const stored = { courses: Object.fromEntries(plans.map((p) => [p.slug, JSON.parse(JSON.stringify(p.course.doc))])), cohorts: Object.fromEntries(plans.map((p) => [p.slug, JSON.parse(JSON.stringify(p.cohort.doc))])) };
    for (const p of planCatalogImport(entries(), stored, false)) expect([p.course.action, p.cohort.action], p.slug).toEqual(['unchanged', 'unchanged']);
  });

  test('[AAPI-UNIT-CAT-007] bad file data is refused, never guessed: an unreadable price, a non-https link, a price below the payment minimum', () => {
    const base = entries()[0];
    refusal(() => planCatalogImport([{ ...base, pricingPlans: undefined, pricing: { inr: { currentPrice: 'ask us' } } }], none, false));
    refusal(() => planCatalogImport([{ ...base, whatsappLink: 'http://chat.example.com/x' }], none, false));
    refusal(() => planCatalogImport([{ ...base, pricingPlans: undefined, pricing: { inr: { currentPrice: '₹0.5' } } }], none, false));
    refusal(() => planCatalogImport([{ ...base, slug: 'Bad Slug' }], none, false));
  });

  test('[AAPI-UNIT-CAT-008] format: accepted on create and update as live or recorded, anything else refused', () => {
    expect(cohortCreateShape).toHaveProperty('format');
    expect(cohortUpdateShape).toHaveProperty('format');
    expect(parseObject({ format: 'recorded' }, cohortUpdateShape)).toEqual({ format: 'recorded' });
    expect(parseObject({ format: 'live' }, cohortUpdateShape)).toEqual({ format: 'live' });
    refusal(() => parseObject({ format: 'hybrid' }, cohortUpdateShape));
  });

  test('[AAPI-UNIT-CAT-009] format reaches the sales-page view: set by the cohort, absent when not set', () => {
    const doc = planCatalogImport(entries(), none, false).find((p) => p.slug === 'python-foundation')!;
    const cohort = cohortFromDoc('python-foundation', doc.cohort.doc, 'x');
    expect(cohort.format).toBe('recorded');
    const course = buildCourse(cohort, { slug: 'python-foundation', title: 'x', pitch: doc.course.doc.pitch as Record<string, unknown> }, 'files', undefined);
    expect(course.format).toBe('recorded');
    expect(course.differentiatorsTagline).toBe((entries().find((c) => c.slug === 'python-foundation')!).differentiatorsTagline);
    const git = planCatalogImport(entries(), none, false).find((p) => p.slug === 'git-beginner-batch-1')!;
    expect(cohortFromDoc('git-beginner-batch-1', git.cohort.doc, 'x')).not.toHaveProperty('format');
  });
});
