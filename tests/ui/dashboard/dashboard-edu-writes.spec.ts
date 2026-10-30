import { test, expect } from '@playwright/test';
import { QA_FIXTURE_SLUG } from '../../../data/courses';
import { EMAIL, COURSE } from '../../support/personas';
import { requireFixture, requireSeed } from '../../support/guards';
import { grantTestEnrolment, revokeTestEnrolment } from '../../support/db';
import { signInAs } from '../../support/clerk';
import { expectOnPath } from '../../support/assertions';
import { cards, denied, emptyState, openDashboard } from '../../support/dashboard';

// PRD 06 cases for U1 (edu, no enrolments) and M1 (edu + temporary grants). Edu is the only account these cases
// change, so everything sits under one parent describe (one worker) and every grant is removed after each test.
const U1 = EMAIL.edu;
const FIXTURE_TITLE = 'QA Checkout Sandbox';

test.describe('PRD06 dashboard for the no-enrolment learner and temporary grants', () => {
  test.describe.configure({ mode: 'default' });
  test.describe('@regression', () => {
    test.beforeEach(() => requireSeed());
    test.afterEach(async () => {
      for (const slug of [QA_FIXTURE_SLUG, COURSE.C]) await revokeTestEnrolment(U1, slug).catch(() => {});
    });

    test('[DSH-STATE-004][DSH-STATE-005][DSH-STATE-007][DSH-RES-005][DSH-STATE-008] a learner with no enrolments sees the empty state, no course controls and the resources hint', async ({ page }) => {
      await openDashboard(page, U1);
      await expect(emptyState(page)).toBeVisible();
      await expect(page.getByText("You haven't enrolled in any cohorts.")).toBeVisible();
      await expect(cards(page)).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'View Recordings' })).toHaveCount(0);
      await expect(page.getByText('Enrolled', { exact: true })).toHaveCount(0);
      await expect(page.getByText('Course resources appear here once you enroll.')).toBeVisible();
      await expect(page.getByRole('heading', { name: /Welcome back, .+! 👋/ })).toBeVisible();
    });

    test('[DSH-STATE-006][DSH-MOB-006] Browse Catalog opens the catalog (also by keyboard)', async ({ page }) => {
      await openDashboard(page, U1);
      await page.getByRole('button', { name: 'Browse Catalog' }).focus();
      await page.keyboard.press('Enter');
      await expectOnPath(page, '/courses');
    });

    test('[DSH-STATE-009] query parameters do not unlock courses', async ({ page }) => {
      await signInAs(page, U1);
      await page.goto('/learning?enrolled=true&course=python-beginners-batch-2');
      await expect(emptyState(page)).toBeVisible({ timeout: 25000 });
      await expect(cards(page)).toHaveCount(0);
    });

    test('[DSH-LOB-002][DSH-LOB-003][DSH-E2E-004] a not-enrolled learner is denied the lobby, can return to the dashboard and sees the empty state', async ({ page }) => {
      await signInAs(page, U1);
      await page.goto(`/live/${COURSE.A}`);
      await expect(denied(page)).toBeVisible({ timeout: 25000 });
      await expect(page.getByText('You are not enrolled in this cohort, or your session has expired.')).toBeVisible();
      await page.getByRole('link', { name: 'Return to Dashboard' }).click();
      await expectOnPath(page, '/learning');
      await expect(emptyState(page)).toBeVisible();
    });

    test('[DSH-CHG-004] a newly enrolled course appears on the next load', async ({ page }) => {
      requireFixture();
      await openDashboard(page, U1);
      await expect(emptyState(page)).toBeVisible();
      await grantTestEnrolment(U1, QA_FIXTURE_SLUG);
      await page.reload();
      await expect(page.getByRole('heading', { name: FIXTURE_TITLE })).toBeVisible({ timeout: 25000 });
      await expect(emptyState(page)).toHaveCount(0);
    });

    test('[DSH-CHG-001][DSH-CHG-002][DSH-CHG-003][DSH-CHG-010] two granted courses show two cards in catalog order and each links to its own course', async ({ page }) => {
      requireFixture();
      await grantTestEnrolment(U1, QA_FIXTURE_SLUG);
      await grantTestEnrolment(U1, COURSE.C);
      await openDashboard(page, U1);
      await expect(cards(page)).toHaveCount(2);
      const titles = await page.locator('h3', { hasText: /Python Live Session|QA Checkout/ }).allInnerTexts();
      expect(titles).toHaveLength(2);
      await cards(page).nth(1).click();
      await expect.poll(() => new URL(page.url()).pathname).toMatch(/^\/live\/.+/);
      await page.goBack();
      await page.getByRole('button', { name: 'View Recordings' }).first().click();
      await expect.poll(() => new URL(page.url()).pathname).toMatch(/^\/learning\/.+/);
    });

    test('[DSH-CHG-007][DSH-CHG-008] a revoked course disappears and its lobby is denied', async ({ page }) => {
      requireFixture();
      await grantTestEnrolment(U1, QA_FIXTURE_SLUG);
      await grantTestEnrolment(U1, COURSE.C);
      await openDashboard(page, U1);
      await expect(cards(page)).toHaveCount(2);
      await revokeTestEnrolment(U1, QA_FIXTURE_SLUG);
      await page.reload();
      await expect(cards(page)).toHaveCount(1);
      await expect(page.getByRole('heading', { name: FIXTURE_TITLE })).toHaveCount(0);
      await page.goto(`/live/${QA_FIXTURE_SLUG}`);
      await expect(denied(page)).toBeVisible({ timeout: 25000 });
    });

    test('[DSH-E2E-005] enrolment removed during the session: dashboard is empty and the lobby is denied', async ({ page }) => {
      requireFixture();
      await grantTestEnrolment(U1, QA_FIXTURE_SLUG);
      await openDashboard(page, U1);
      await expect(page.getByRole('heading', { name: FIXTURE_TITLE })).toBeVisible();
      await revokeTestEnrolment(U1, QA_FIXTURE_SLUG);
      await page.reload();
      await expect(emptyState(page)).toBeVisible({ timeout: 25000 });
      await page.goto(`/live/${QA_FIXTURE_SLUG}`);
      await expect(denied(page)).toBeVisible({ timeout: 25000 });
    });
  });
});
