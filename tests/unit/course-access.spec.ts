import { test, expect } from '@playwright/test';
import { canOpenSalesPage, courseGate, shareDestination, sharePreviewIsPublic } from '../../lib/courseAccess';

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

  // SCP-39: the server decides before a course page is sent.
  test('[CAC-UNIT-006] courseGate: enrolled or admin is shown the page, anyone else gets Access Denied', () => {
    expect(courseGate({ signedIn: true, slugValid: true, hasAccess: true })).toBe('show');
    expect(courseGate({ signedIn: true, slugValid: true, hasAccess: false })).toBe('denied');
  });

  test('[CAC-UNIT-007] courseGate: a malformed slug is denied without a lookup; a failed lookup shows the page (the data routes still check)', () => {
    expect(courseGate({ signedIn: true, slugValid: false, hasAccess: null })).toBe('denied');
    expect(courseGate({ signedIn: true, slugValid: false, hasAccess: true })).toBe('denied');
    expect(courseGate({ signedIn: true, slugValid: true, hasAccess: null })).toBe('show');
  });

  test('[CAC-UNIT-008] courseGate: a visitor with no session is left to the sign-in redirect of the proxy', () => {
    expect(courseGate({ signedIn: false, slugValid: true, hasAccess: false })).toBe('show');
  });
});
