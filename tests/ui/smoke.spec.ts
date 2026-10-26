import { test, expect } from '@playwright/test';
import { activeCourses } from '../../data/courses';
import { courseCurriculumMap } from '../../data/learning-content';

// PR smoke checks for public routes and route protection. Read-only: no payments, emails or DB writes.
test.describe('Public pages @smoke', () => {

  test('home page loads and shows Log In when signed out', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Log In' }).first()).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });

  for (const [path, heading] of [
    ['/about', /./],
    ['/contact', "Let's Connect"],
    ['/mentorship', '1-on-1 Mentorship'],
    ['/privacy', 'Privacy Policy'],
    ['/terms', 'Terms of Service'],
    ['/refund', 'Cancellation & Refund Policy'],
  ] as const) {
    test(`${path} renders`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 }).first()).toContainText(heading);
    });
  }
});

test.describe('Protected pages redirect anonymous users @smoke', () => {
  const slug = activeCourses[0].slug;

  for (const path of ['/learning', '/admin', `/learning/${slug}`, `/live/${slug}`]) {
    test(`${path} does not render for signed-out users`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      // Clerk sends signed-out users to sign-in or home; the protected URL must not stay in place.
      await page.waitForURL(url => url.pathname !== path, { timeout: 15000 });
      expect(new URL(page.url()).pathname).not.toBe(path);
    });
  }
});

test.describe('Share page previews @smoke', () => {
  const [slug] = Object.keys(courseCurriculumMap);
  const videoId = courseCurriculumMap[slug][0].videoIds[0];

  test('known video exposes Open Graph tags with its thumbnail', async ({ request }) => {
    const res = await request.get(`/share/${videoId}`, { headers: { 'User-Agent': 'WhatsApp/2.23' } });
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain('property="og:title"');
    expect(html).toContain(`https://img.youtube.com/vi/${videoId}/0.jpg`);
  });

  test('unknown video falls back to the generic title', async ({ request }) => {
    const res = await request.get('/share/unknownVideo1', { headers: { 'User-Agent': 'WhatsApp/2.23' } });
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('Exclusive Lesson | Shivam Academy');
  });
});
