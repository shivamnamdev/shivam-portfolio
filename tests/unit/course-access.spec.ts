import { test, expect } from '@playwright/test';
import { canOpenSalesPage, shareDestination, sharePreviewIsPublic } from '../../lib/courseAccess';

// Old live cohorts are hidden (listed: false): only their learners and the admin reach them.
test.describe('Course access rules @regression', () => {
  test('[CAC-UNIT-001] a listed course page is open to everyone', () => {
    expect(canOpenSalesPage({ listed: true, hasAccess: false })).toBe(true);
    expect(canOpenSalesPage({ listed: true, hasAccess: true })).toBe(true);
  });

  test('[CAC-UNIT-002] a hidden course page opens only for an enrolled learner or the admin', () => {
    expect(canOpenSalesPage({ listed: false, hasAccess: true })).toBe(true);
    expect(canOpenSalesPage({ listed: false, hasAccess: false })).toBe(false);
  });

  test('[CAC-UNIT-003] a share link sends an owner to the lesson, listed or not', () => {
    expect(shareDestination({ slug: 'python-beginners-batch-2', videoId: 'abc', listed: false, hasAccess: true })).toBe('/learning/python-beginners-batch-2?v=abc');
    expect(shareDestination({ slug: 'python-foundation', videoId: 'abc', listed: true, hasAccess: true })).toBe('/learning/python-foundation?v=abc');
  });

  test('[CAC-UNIT-004] a share link sends a non-owner to the course page when it is public, to the catalog when it is hidden', () => {
    expect(shareDestination({ slug: 'python-foundation', videoId: 'abc', listed: true, hasAccess: false })).toBe('/courses/python-foundation');
    expect(shareDestination({ slug: 'python-beginners-batch-2', videoId: 'abc', listed: false, hasAccess: false })).toBe('/courses');
  });

  test('[CAC-UNIT-005] the link preview names a lesson only for a listed course', () => {
    expect(sharePreviewIsPublic(true)).toBe(true);
    expect(sharePreviewIsPublic(false)).toBe(false);
  });
});
