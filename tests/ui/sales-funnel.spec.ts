import { test, expect } from '@playwright/test';

test.describe('Course Sales Page UI', () => {

  test('Should load Python Course page and toggle pricing regions', async ({ page }) => {
    // 1. Navigate and wait for the page to fully settle (fixes Chromium hydration speed issues)
    await page.goto('/courses/python-beginners');
    await page.waitForLoadState('networkidle');

    // 2. Verify the page title loads correctly using a strict heading locator
    await expect(page.getByRole('heading', { name: 'Master Python Programming' })).toBeVisible();

    // 3. Verify Default Pricing (INR)
    const inrButton = page.getByRole('button', { name: '🇮🇳 India' });
    await expect(inrButton).toBeVisible();
    
    // Use getByText with exact matching to prevent DOM overlap issues
    // await expect(page.getByText('₹599', { exact: true })).toBeVisible(); 
    await expect(page.getByText('₹899', { exact: true })).toBeVisible(); 
    
    // Locate the specific button
    const buyButtonInr = page.getByRole('button', { name: /Buy Now \(INR\)/i });
    await expect(buyButtonInr).toBeVisible();

    // 4. Switch to International Pricing (USD)
    const usdButton = page.getByRole('button', { name: 'International' });
    
    // In Chromium, sometimes elements are covered by sticky navbars. 
    // .scrollIntoViewIfNeeded() ensures Chromium physically looks at the button before clicking.
    await usdButton.scrollIntoViewIfNeeded();
    await usdButton.click();

    // 5. Verify the UI updated to USD
    await expect(page.getByText('$200', { exact: true })).toBeVisible(); 
    await expect(page.getByText('$250', { exact: true })).toBeVisible(); 
    
    const buyButtonUsd = page.getByRole('button', { name: /Buy Now \(USD\)/i });
    await expect(buyButtonUsd).toBeVisible();
  });

});