import { test, expect } from '@playwright/test';
import { courseNote, inMode, isPreviewStatus, parseMode, sortPreview } from '../../lib/catalog/previewView';
import { buildCourse, cohortFromDoc } from '../../lib/catalog/mapping';
import { NAV } from '../../lib/adminUi/nav';

// The admin-only learner preview (slice 5e): pure rules. The pages and the access rules are covered by tests/ui/portal/preview.spec.ts.
test.describe('portal preview rules @smoke', () => {
  test('PRV-UNIT-001 the list shows draft and published by default; "archived" shows only archived; anything else is the default', () => {
    expect(parseMode(undefined)).toBe('active');
    expect(parseMode('archived')).toBe('archived');
    expect(parseMode('ARCHIVED')).toBe('active');      // only the exact word
    expect(parseMode(['archived'])).toBe('active');    // a repeated query parameter is not trusted
    for (const s of ['draft', 'published'] as const) { expect(inMode('active', s)).toBe(true); expect(inMode('archived', s)).toBe(false); }
    expect(inMode('active', 'archived')).toBe(false);
    expect(inMode('archived', 'archived')).toBe(true);
  });

  test('PRV-UNIT-002 drafts come first, then published, then archived; by slug inside a group; the input is not changed', () => {
    const items = [
      { slug: 'b', previewStatus: 'published' as const }, { slug: 'z', previewStatus: 'draft' as const }, { slug: 'a', previewStatus: 'archived' as const },
      { slug: 'a', previewStatus: 'published' as const }, { slug: 'c', previewStatus: 'draft' as const },
    ];
    const before = JSON.stringify(items);
    expect(sortPreview(items).map((i) => `${i.previewStatus}:${i.slug}`)).toEqual(['draft:c', 'draft:z', 'published:a', 'published:b', 'archived:a']);
    expect(JSON.stringify(items)).toBe(before);
  });

  test('PRV-UNIT-003 a card notes a missing or unpublished course and says nothing for a published one', () => {
    expect(courseNote(undefined)).toBe('its course is missing');
    expect(courseNote(null)).toBe('its course is missing');
    expect(courseNote('draft')).toBe('its course is draft');
    expect(courseNote('archived')).toBe('its course is archived');
    expect(courseNote('published')).toBeUndefined();
  });

  test('PRV-UNIT-004 only draft, published and archived are previewable statuses', () => {
    for (const s of ['draft', 'published', 'archived']) expect(isPreviewStatus(s)).toBe(true);
    for (const s of ['deleted', '', null, undefined, 1]) expect(isPreviewStatus(s)).toBe(false);
  });

  test('PRV-UNIT-005 a preview page object carries prices and plans from the portal and never the private links', () => {
    const doc = {
      courseSlug: 'py', title: 'Batch 1', statusText: 'Enrolling', duration: '6 weeks', enrollmentClosed: false,
      pricing: { kind: 'plans', currency: 'INR', plans: [{ id: 'community', name: 'Community', price: { amount: 1999, original: 2499 }, features: ['A'] }] },
      private: { whatsappLink: 'https://chat.whatsapp.com/secret', liveLink: 'https://meet.google.com/secret' },
    };
    const built = buildCourse(cohortFromDoc('b1', doc, 'Fallback'), { slug: 'py', title: 'Py' }, 'database', undefined);
    expect(built).toMatchObject({ id: 'b1', slug: 'b1', title: 'Batch 1', statusText: 'Enrolling', pricedBy: 'database' });
    expect(built.pricingPlans.map((p: { id: string; price: string }) => [p.id, p.price])).toEqual([['community', '₹1,999']]);
    expect(JSON.stringify(built)).not.toMatch(/secret|liveLink|whatsappLink/);
    expect(cohortFromDoc('b2', { courseSlug: 'py', pricing: { kind: 'single', inr: { amount: 1 } } }, 'Fallback title').title).toBe('Fallback title');
  });

  test('PRV-UNIT-006 the sidebar offers the preview as an external entry', () => {
    const e = NAV.find((n) => n.href === '/preview/courses');
    expect(e).toMatchObject({ label: 'Learner preview', external: true, ready: true });
  });
});
