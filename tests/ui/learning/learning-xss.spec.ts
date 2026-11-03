import { test, expect } from '@playwright/test';
import { EMAIL, COURSE } from '../../support/personas';
import { requireSeed } from '../../support/guards';
import { deleteComments, firstVideoId, openCourse, tab } from '../../support/learning';

// PRD 16 · SEC-XSS-001: a Q&A question that contains HTML is shown as plain text and nothing runs.
const S2 = EMAIL.mavish;
const SLUG = COURSE.A;
const FIRST = firstVideoId(SLUG);
const PAYLOAD = '<img src=x onerror="window.__xss=1"><script>window.__xss=2</script><b>bold</b>';

test.describe('SEC stored XSS in Q&A @regression', () => {
  test.beforeEach(() => requireSeed());
  test.afterEach(async () => { await deleteComments(S2, '<img src=x').catch(() => {}); });

  test('[SEC-XSS-001] HTML in a question is shown as text, no script runs and no element is created', async ({ page }) => {
    await openCourse(page, S2, SLUG);
    await tab(page, /Q&A/).click();
    await page.getByPlaceholder('Ask Shivam or the community...').fill(PAYLOAD);
    await page.getByRole('button', { name: /Post/ }).click();
    const shown = page.locator('p.whitespace-pre-wrap', { hasText: 'onerror' });
    await expect(shown.first()).toHaveText(PAYLOAD);
    await page.reload();
    await expect(page.getByText('Course Content')).toBeVisible({ timeout: 40000 });
    await tab(page, /Q&A/).click();
    await expect(page.locator('p.whitespace-pre-wrap', { hasText: 'onerror' }).first()).toHaveText(PAYLOAD);
    expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined();
    await expect(page.locator('img[src="x"]')).toHaveCount(0);
  });
});
