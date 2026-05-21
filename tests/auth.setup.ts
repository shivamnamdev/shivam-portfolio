// tests/auth.setup.ts
import { test as setup, expect } from '@playwright/test';
import { CREDENTIALS } from './config/credentials';

// This defines where Playwright will magically save the session cookies
const authFile = 'playwright/.auth/user.json';

setup('Authenticate via Clerk', async ({ page }) => {
  // 1. Go to the homepage
  await page.goto('/');

  // 2. Click the Login button
  // (We use a regex here just in case the button says "Student Login" or "Log In")
  await page.click('button:has-text("Login"), button:has-text("Log In")');

  // 3. Fill out the Clerk Authentication Modal
  const emailInput = page.locator('input[type="email"], input[name="identifier"]');
  await emailInput.waitFor({ state: 'visible' });
  await emailInput.fill(CREDENTIALS.email);
  await page.click('button:has-text("Continue")');
  
  const passInput = page.locator('input[type="password"], input[name="password"]');
  await passInput.waitFor({ state: 'visible' });
  await passInput.fill(CREDENTIALS.password);
  await page.click('button:has-text("Continue")');

  // 4. Wait for the login to succeed by looking for the "Dashboard" button in the Navbar
  await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible({ timeout: 15000 });

  // 5. 🚨 THE MAGIC: Save the browser's cookies and session to the hidden file!
  await page.context().storageState({ path: authFile });
});