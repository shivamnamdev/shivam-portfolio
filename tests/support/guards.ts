import { test } from '@playwright/test';
import { canSignIn } from './clerk';
import { seedEnabled } from './db';

// Explicit, visible skips: a test that cannot run says why instead of silently passing.
export function requireSignIn() {
  test.skip(!canSignIn(), 'needs CLERK_SECRET_KEY (sk_test_) to sign in personas');
}
export function requireSeed() {
  requireSignIn();
  test.skip(!seedEnabled(), 'needs E2E_SEED_PERSONAS=1 plus NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY of the QA project');
}

import { QA_FIXTURES_ENABLED } from '../../data/courses';
// Cases that need an open cohort run against the QA fixture course (docs/testing/TEST_DATA.md).
export function requireFixture() {
  test.skip(!QA_FIXTURES_ENABLED, 'needs NEXT_PUBLIC_QA_FIXTURES=1 on the test process and the server (open QA fixture course)');
}
