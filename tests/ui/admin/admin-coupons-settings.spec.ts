import { test, expect, type Page } from '@playwright/test';
import { EMAIL } from '../../support/personas';
import { requireSeed } from '../../support/guards';
import { signInAs, clerkUserId } from '../../support/clerk';
import { adminDb } from '../../support/db';
import { clearWriteLimits } from '../../support/adminApi';

// Phase 4d-1: the Coupons and Settings screens against the QA project. Coupons are named QAADMUI..., generated codes are found by who made them and
// when, and the QA settings are saved before and restored after.
const alertBox = (page: Page) => page.locator('[role=alert]:not(#__next-route-announcer__)');
const dialog = (page: Page) => page.getByRole('dialog');
const row = (page: Page, text: string) => page.locator('tbody tr', { hasText: text });

test.describe('ADMUI coupons and settings @regression', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async () => { test.setTimeout(150_000); requireSeed(); await clearWriteLimits(); });
  let startedAt = ''; let adminId = ''; let savedSettings: Record<string, unknown>[] = [];
  test.beforeAll(async () => {
    startedAt = new Date().toISOString();
    adminId = await clerkUserId(EMAIL.admin);
    savedSettings = (await adminDb().from('content_docs').select('*').eq('kind', 'setting')).data ?? [];
  });
  test.afterAll(async () => {
    const db = adminDb();
    await db.from('coupons').delete().eq('created_by', adminId).gte('created_at', startedAt);
    await db.from('content_docs').delete().eq('kind', 'setting');
    if (savedSettings.length) await db.from('content_docs').insert(savedSettings);
    await db.from('admin_audit').delete().in('resource', ['coupon', 'setting']).gte('at', startedAt);
    await clearWriteLimits();
  });

  test('[ADMUI-CPN-001] an open coupon is created with a default expiry; a bad form is explained and cannot be sent; a taken code is refused inline', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/coupons');
    await page.getByRole('button', { name: 'New coupon' }).click();
    const form = page.getByRole('form', { name: 'New coupon' });
    await expect(form.getByLabel(/^Expires/)).not.toHaveValue('');   // 30 days ahead by default
    await form.getByLabel(/^Code/).fill('qaadmui20');
    await expect(form.getByRole('button', { name: 'Create coupon' })).toBeDisabled();
    await expect(form.getByText('Enter the percentage')).toBeVisible();
    await form.getByRole('textbox', { name: /^Percent \(/ }).fill('120');
    await expect(form.getByText(/above 0 and at most 100/)).toBeVisible();
    await form.getByRole('textbox', { name: /^Percent \(/ }).fill('20');
    await form.getByLabel(/^Expires/).fill('');
    await expect(form.getByText('Choose when the coupon expires (required)')).toBeVisible();
    await form.getByLabel(/^Expires/).fill('2099-01-01T10:00');
    await form.getByLabel(/^Most uses/).fill('50');
    await form.getByRole('button', { name: 'Create coupon' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Created' })).toContainText('QAADMUI20', { timeout: 15000 });
    const db = (await adminDb().from('coupons').select('*').eq('code', 'QAADMUI20').single()).data!;
    expect(db).toMatchObject({ kind: 'everyone', max_redemptions: 50, active: true, discount: { type: 'percentage', percent: 20 } });
    await expect(row(page, 'QAADMUI20')).toContainText('20% off');

    await form.getByLabel(/^Code/).fill('QAADMUI20');   // the same code again (case does not matter)
    await form.getByRole('textbox', { name: /^Percent \(/ }).fill('10');
    await form.getByLabel(/^Expires/).fill('2099-01-01T10:00');
    await form.getByRole('button', { name: 'Create coupon' }).click();
    await expect(alertBox(page)).toBeVisible({ timeout: 15000 });
  });

  test('[ADMUI-CPN-002] a selected-students coupon: find a learner, add them, create; then change the discount and the list from the detail page', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/coupons');
    await page.getByRole('button', { name: 'New coupon' }).click();
    const form = page.getByRole('form', { name: 'New coupon' });
    await form.getByLabel(/^Code/).fill('QAADMUI-SEL');
    await form.getByLabel('Who can use it').selectOption('selected');
    await expect(form.getByRole('button', { name: 'Create coupon' })).toBeDisabled();
    await form.getByLabel('Fixed amount off').check();
    await form.getByLabel(/^Amount off in INR/).fill('300');
    await form.getByLabel(/^Find a learner/).fill(EMAIL.edu);
    await form.getByRole('button', { name: 'Search' }).click();
    await page.locator('li', { hasText: EMAIL.edu }).getByRole('button', { name: 'Add' }).click();
    await expect(form.getByLabel(/^Student e-mails/)).toHaveValue(EMAIL.edu);
    await expect(form.getByText('1 student(s) listed.')).toBeVisible();
    await form.getByLabel(/^Student e-mails/).fill(`${EMAIL.edu}\nnot-an-email`);
    await expect(form.getByText(/Not an e-mail: not-an-email/)).toBeVisible();
    await form.getByLabel(/^Student e-mails/).fill(EMAIL.edu);
    await form.getByRole('button', { name: 'Create coupon' }).click();
    await page.getByRole('link', { name: 'QAADMUI-SEL' }).first().click();
    await expect(page.getByRole('heading', { name: 'QAADMUI-SEL', level: 1 })).toBeVisible({ timeout: 30000 });
    await expect(page.getByLabel(/^Student e-mails/)).toHaveValue(EMAIL.edu, { timeout: 15000 });

    const edit = page.getByRole('form', { name: 'Edit coupon' });
    await edit.getByRole('button', { name: 'Save changes' }).click();
    await expect(alertBox(page)).toContainText('Nothing has changed');
    await edit.getByLabel(/^Amount off in INR/).fill('450');
    await edit.getByLabel(/^Student e-mails/).fill(`${EMAIL.edu}\n${EMAIL.mavish}`);
    await edit.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible({ timeout: 15000 });
    const db = (await adminDb().from('coupons').select('discount, user_ids').eq('code', 'QAADMUI-SEL').single()).data!;
    expect(db.discount).toMatchObject({ type: 'fixed', inr: 450 });
    expect(db.user_ids).toHaveLength(2);
    await edit.getByLabel(/^Student e-mails/).fill('nobody-qa-admui@example.com');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    await expect(alertBox(page)).toContainText('signed up');   // the server names the person who has not signed up
  });

  test('[ADMUI-CPN-003] one-time codes are generated and shown once; a bad count is refused; the batch is in the list', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/coupons');
    await page.getByRole('button', { name: 'Generate one-time codes' }).click();
    const form = page.getByRole('form', { name: 'Generate one-time codes' });
    await form.getByLabel(/^How many/).fill('0');
    await form.getByRole('textbox', { name: /^Percent \(/ }).fill('15');
    await expect(form.getByText(/whole number from 1 to 200/)).toBeVisible();
    await expect(form.getByRole('button', { name: 'Generate codes' })).toBeDisabled();
    await form.getByLabel(/^How many/).fill('3');
    await form.getByRole('button', { name: 'Generate codes' }).click();
    const codes = page.getByTestId('generated-codes');
    await expect(codes).toBeVisible({ timeout: 15000 });
    const list = (await codes.innerText()).trim().split('\n');
    expect(list).toHaveLength(3);
    for (const c of list) expect(c).toMatch(/^[A-Z2-9]{10}$/);
    const db = (await adminDb().from('coupons').select('code, kind, max_redemptions, batch_id').in('code', list)).data!;
    expect(db).toHaveLength(3);
    expect(db.every((d) => d.kind === 'single-use' && d.max_redemptions === 1)).toBe(true);
    expect(new Set(db.map((d) => d.batch_id)).size).toBe(1);
    await page.getByLabel('Search by code').fill(list[0]);
    await page.getByRole('form', { name: 'Filter coupons' }).getByRole('button', { name: 'Search' }).click();
    await expect(row(page, list[0])).toContainText('unused');
  });

  test('[ADMUI-CPN-004] deactivate and activate; delete asks first; a used one-time code is read-only', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/coupons/QAADMUI20');
    await expect(page.getByRole('heading', { name: 'QAADMUI20', level: 1 })).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Deactivate' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Deactivated' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('inactive', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Activate' }).click();
    await expect(page.getByText('active', { exact: true })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Delete coupon' }).click();
    await expect(dialog(page)).toContainText('QAADMUI20');
    await dialog(page).getByRole('button', { name: 'Cancel' }).click();
    expect((await adminDb().from('coupons').select('code').eq('code', 'QAADMUI20')).data).toHaveLength(1);
    await page.getByRole('button', { name: 'Delete coupon' }).click();
    await dialog(page).getByRole('button', { name: 'Delete coupon' }).click();
    await expect(page).toHaveURL(/\/admin\/coupons$/);
    expect((await adminDb().from('coupons').select('code').eq('code', 'QAADMUI20')).data).toHaveLength(0);

    const one = (await adminDb().from('coupons').select('code').eq('created_by', adminId).eq('kind', 'single-use').gte('created_at', startedAt).limit(1).single()).data!.code as string;
    await adminDb().from('coupons').update({ redeemed_by: 'user_qa_admui', redeemed_at: new Date().toISOString(), redemptions: 1 }).eq('code', one);
    await page.goto(`/admin/coupons/${one}`);
    await expect(page.getByText(/has been used.*can no longer be changed/)).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('form', { name: 'Edit coupon' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Delete coupon' })).toHaveCount(0);
  });

  test('[ADMUI-SET-001] the four settings: defaults show, values save, bad values and the cap rule are explained, a phone can be cleared', async ({ page }) => {
    await adminDb().from('content_docs').delete().eq('kind', 'setting');
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/settings');
    const daily = page.getByRole('form', { name: /Most e-mails the site sends in one day/ });
    const announce = page.getByRole('form', { name: /Most people one announcement/ });
    const phone = page.getByRole('form', { name: 'Support phone number' });
    await expect(daily.getByLabel('Value')).toHaveValue('200', { timeout: 30000 });
    await expect(daily.getByText('built-in default')).toBeVisible();
    await expect(daily.getByRole('button', { name: 'Save' })).toBeDisabled();   // unchanged

    await daily.getByLabel('Value').fill('900');
    await expect(daily.getByText('Enter a whole number from 1 to 500')).toBeVisible();
    await expect(daily.getByRole('button', { name: 'Save' })).toBeDisabled();
    await daily.getByLabel('Value').fill('40');   // below the announcement limit (50)
    await expect(daily.getByText(/announcement limit cannot be higher/)).toBeVisible();
    await expect(daily.getByRole('button', { name: 'Save' })).toBeDisabled();
    await daily.getByLabel('Value').fill('300');
    await daily.getByRole('button', { name: 'Save' }).click();
    await expect(daily.getByRole('status')).toHaveText('Saved', { timeout: 15000 });
    await expect(daily.getByText('custom value')).toBeVisible();
    expect((await adminDb().from('content_docs').select('doc, version').eq('kind', 'setting').eq('key', 'daily-email-cap').single()).data).toMatchObject({ doc: { value: 300 }, version: 1 });
    await daily.getByLabel('Value').fill('310');   // a second save carries the version
    await daily.getByRole('button', { name: 'Save' }).click();
    await expect(daily.getByRole('status')).toHaveText('Saved', { timeout: 15000 });
    expect((await adminDb().from('content_docs').select('version').eq('kind', 'setting').eq('key', 'daily-email-cap').single()).data!.version).toBe(2);

    await announce.getByLabel('Value').fill('400');
    await expect(announce.getByText('Enter a whole number from 1 to 200')).toBeVisible();
    await announce.getByLabel('Value').fill('60');
    await announce.getByRole('button', { name: 'Save' }).click();
    await expect(announce.getByRole('status')).toHaveText('Saved', { timeout: 15000 });

    await phone.getByLabel('Value').fill('call me');
    await expect(phone.getByText(/phone number such as/)).toBeVisible();
    await phone.getByLabel('Value').fill('+91 98765 43210');
    await phone.getByRole('button', { name: 'Save' }).click();
    await expect(phone.getByRole('status')).toHaveText('Saved', { timeout: 15000 });
    await phone.getByRole('button', { name: 'Clear' }).click();
    await expect(phone.getByLabel('Value')).toHaveValue('');
    await phone.getByRole('button', { name: 'Save' }).click();
    await expect(phone.getByRole('status')).toHaveText('Saved', { timeout: 15000 });
    expect((await adminDb().from('content_docs').select('doc').eq('kind', 'setting').eq('key', 'support-phone').single()).data!.doc).toMatchObject({ value: null });
    await page.reload();
    await expect(page.getByRole('form', { name: /Most e-mails the site sends in one day/ }).getByLabel('Value')).toHaveValue('310', { timeout: 30000 });
  });

  test('[ADMUI-CPN-005] on a phone the coupon and settings screens do not scroll sideways', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await signInAs(page, EMAIL.admin);
    for (const path of ['/admin/coupons', '/admin/settings']) {
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible({ timeout: 30000 });
      const moved = await page.evaluate(() => { window.scrollTo(80, 0); const x = window.scrollX; window.scrollTo(0, 0); return x; });
      expect(moved, `${path} must not scroll sideways`).toBe(0);
    }
    await page.goto('/admin/coupons');
    await page.getByRole('button', { name: 'New coupon' }).click();
    await page.getByLabel('Who can use it').selectOption('selected');
    const moved = await page.evaluate(() => { window.scrollTo(80, 0); const x = window.scrollX; window.scrollTo(0, 0); return x; });
    expect(moved).toBe(0);
  });
});
