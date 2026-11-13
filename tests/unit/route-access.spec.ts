import { test, expect } from '@playwright/test';
import { isApiPath, isPublicPath } from '../../lib/routeAccess';

// The proxy gate (proxy.ts). A path not listed as public needs a session; an API path gets 401 JSON, a page gets the sign-in redirect.
test.describe('Route access rules @regression', () => {
  test('[RTE-UNIT-001] the public pages and the public API routes are open', () => {
    for (const p of ['/', '/about', '/privacy', '/terms', '/refund', '/contact', '/mentorship', '/courses', '/courses/python-beginners-batch-2', '/share/abc',
      '/api/create-order', '/api/verify-payment', '/api/enroll-free', '/api/send-email', '/api/banners', '/api/webhooks/clerk', '/api/admin/v1/courses']) {
      expect(isPublicPath(p), p).toBe(true);
    }
  });

  test('[RTE-UNIT-002] everything else needs a session, including every other admin and learner route', () => {
    for (const p of ['/learning', '/learning/python-beginners-batch-2', '/live/x', '/admin', '/admin/courses', '/api-docs', '/preview/courses', '/track-time',
      '/api/ai-tutor', '/api/xp/sync', '/api/learning/my-courses', '/api/admin/courses', '/api/generate-certificate', '/api/coupons/check']) {
      expect(isPublicPath(p), p).toBe(false);
    }
  });

  test('[RTE-UNIT-003] a prefix stops at a path segment: lookalike paths are not public', () => {
    for (const p of ['/coursesfoo', '/courses-admin', '/shared', '/api/admin/v1x', '/api/webhooks/clerkx', '/about/secret', '/api/banners/x']) {
      expect(isPublicPath(p), p).toBe(false);
    }
  });

  test('[RTE-UNIT-004] a trailing slash does not change the answer', () => {
    expect(isPublicPath('/about/')).toBe(true);
    expect(isPublicPath('/courses/')).toBe(true);
    expect(isPublicPath('/learning/')).toBe(false);
    expect(isApiPath('/api/xp/sync/')).toBe(true);
  });

  test('[RTE-UNIT-005] /api-docs is a page, never an API route (SCP-29)', () => {
    expect(isApiPath('/api-docs')).toBe(false);
    expect(isApiPath('/api-docs/x')).toBe(false);
    for (const p of ['/api', '/api/xp/sync', '/api/admin/v1/courses', '/trpc', '/trpc/x']) expect(isApiPath(p), p).toBe(true);
    for (const p of ['/', '/learning', '/apis', '/trpcx']) expect(isApiPath(p), p).toBe(false);
  });
});
