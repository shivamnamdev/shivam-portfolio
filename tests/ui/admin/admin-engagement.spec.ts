import { test, expect, type Page } from '@playwright/test';
import { EMAIL } from '../../support/personas';
import { requireSeed } from '../../support/guards';
import { signInAs, clerkUserId } from '../../support/clerk';
import { adminDb } from '../../support/db';
import { clearWriteLimits } from '../../support/adminApi';

// Phase 4d-2: Banners, Notifications and E-mail templates against the QA project. Banners are named qaadmui-..., notifications "QAADMUI ...";
// the three templates are saved before and restored after. No e-mail is ever sent here (the dialog is opened and cancelled).
const alertBox = (page: Page) => page.locator('[role=alert]:not(#__next-route-announcer__)');
const dialog = (page: Page) => page.getByRole('dialog');
const row = (page: Page, text: string) => page.locator('tbody tr', { hasText: text });
const B = 'qaadmui-banner';

test.describe('ADMUI banners, notifications, templates @regression', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async () => { test.setTimeout(150_000); requireSeed(); await clearWriteLimits(); });
  let startedAt = ''; let adminId = ''; let savedTemplates: Record<string, unknown>[] = [];
  test.beforeAll(async () => {
    startedAt = new Date().toISOString();
    adminId = await clerkUserId(EMAIL.admin);
    savedTemplates = (await adminDb().from('content_docs').select('*').eq('kind', 'email_template')).data ?? [];
  });
  test.afterAll(async () => {
    const db = adminDb();
    await db.from('content_docs').delete().eq('kind', 'banner').like('key', 'qaadmui%');
    await db.from('notifications').delete().like('title', 'QAADMUI%');
    await db.from('content_docs').delete().eq('kind', 'email_template');
    if (savedTemplates.length) await db.from('content_docs').insert(savedTemplates);
    await db.from('admin_audit').delete().in('resource', ['banner', 'notification', 'email_template']).gte('at', startedAt);
    await clearWriteLimits();
  });

  test('[ADMUI-BAN-001] a banner is created as a draft (bad input is explained first), explained as not shown, published, then shown to the right viewer', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/banners');
    await page.getByRole('button', { name: 'New banner' }).click();
    const form = page.getByRole('form', { name: 'New banner' });
    await form.getByLabel(/^Slug/).fill(B);
    await form.getByLabel(/^Message/).fill('<b>Big sale</b>');
    await expect(form.getByText(/plain text \(no < or >\)/)).toBeVisible();
    await expect(form.getByRole('button', { name: 'Create draft banner' })).toBeDisabled();
    await form.getByLabel(/^Message/).fill('QA offer: 20% off');
    await form.getByLabel(/^Button label/).fill('Buy now');
    await expect(form.getByText('A button needs both a label and a link (or neither)')).toBeVisible();
    await form.getByLabel(/^Button link/).fill('javascript:alert(1)');
    await expect(form.getByText(/Use an https link or a path on this site/)).toBeVisible();
    await form.getByLabel(/^Button link/).fill('/courses');
    await expect(form.getByTestId('banner-preview')).toContainText('QA offer: 20% off');
    await expect(form.getByTestId('banner-preview')).toContainText('Buy now');
    await form.getByRole('button', { name: 'Create draft banner' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Created draft' })).toContainText(B, { timeout: 15000 });
    expect((await adminDb().from('content_docs').select('status, doc').eq('kind', 'banner').eq('key', B).single()).data).toMatchObject({ status: 'draft', doc: { message: 'QA offer: 20% off', ctaUrl: '/courses', audience: { kind: 'all' } } });

    await row(page, B).getByRole('link', { name: B }).click();
    await expect(page.getByRole('heading', { name: B })).toBeVisible();
    await expect(page.getByTestId('visibility')).toContainText('Not shown: it is draft');
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await dialog(page).getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(page.getByTestId('visibility')).toContainText('Shown to this viewer now', { timeout: 15000 });
    expect((await adminDb().from('content_docs').select('status').eq('kind', 'banner').eq('key', B).single()).data!.status).toBe('published');

    // narrow it to visitors: a signed-in learner no longer sees it, and only the changed field is saved
    await page.getByLabel(/^Who sees it/).selectOption('visitors');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible({ timeout: 15000 });
    await page.getByLabel(/^Check what this viewer sees/).selectOption('learner');
    await expect(page.getByTestId('visibility')).toContainText('Not shown to this kind of viewer');
    await page.getByLabel(/^Check what this viewer sees/).selectOption('visitor');
    await expect(page.getByTestId('visibility')).toContainText('Shown to this viewer now');
    const saved = (await adminDb().from('content_docs').select('version, doc').eq('kind', 'banner').eq('key', B).single()).data!;
    expect(saved.version).toBe(3);   // draft 1, publish 2, this save 3
    expect(saved.doc).toMatchObject({ audience: { kind: 'visitors' }, message: 'QA offer: 20% off' });
  });

  test('[ADMUI-BAN-002] nothing to save is said plainly; a published banner cannot be deleted; after archive and restore it can', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto(`/admin/banners/${B}`);
    await expect(page.getByRole('heading', { name: B })).toBeVisible();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(alertBox(page)).toContainText('Nothing has changed');
    await expect(page.getByRole('button', { name: 'Delete', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Archive' }).click();
    await dialog(page).getByRole('button', { name: 'Archive' }).click();
    await expect(page.getByRole('button', { name: 'Restore as draft' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Restore as draft' }).click();
    await dialog(page).getByRole('button', { name: 'Restore as draft' }).click();
    await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await dialog(page).getByRole('button', { name: 'Delete' }).click();
    await expect(page).toHaveURL(/\/admin\/banners$/, { timeout: 15000 });
    expect((await adminDb().from('content_docs').select('key').eq('kind', 'banner').eq('key', B)).data).toHaveLength(0);
  });

  test('[ADMUI-NTF-001] the e-mail box only exists for types that can e-mail; an admin alert is aimed at admins; a created notification starts unsent', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/notifications');
    await page.getByRole('button', { name: 'New notification' }).click();
    const form = page.getByRole('form', { name: 'New notification' });
    const email = form.getByLabel(/Also allow an e-mail/);
    await expect(email).toBeEnabled();
    await form.getByLabel(/^Type/).selectOption('marketing');
    await expect(email).toBeDisabled();
    await expect(form.getByText(/inbox only/)).toBeVisible();
    await form.getByLabel(/^Type/).selectOption('admin-alert');
    await expect(form.getByLabel(/^Who gets it/)).toHaveValue('admins');
    await form.getByLabel(/^Type/).selectOption('announcement');
    await expect(form.getByLabel(/^Who gets it/)).toHaveValue('all');
    await form.getByLabel(/^Title/).fill('QAADMUI hello');
    await form.getByLabel(/^Message/).fill('A short note for one learner.');
    await form.getByLabel(/^Who gets it/).selectOption('user');
    await form.getByLabel(/^Learner's user id/).fill('not-an-id');
    await expect(form.getByText(/Clerk user id/)).toBeVisible();
    await expect(form.getByRole('button', { name: 'Create notification' })).toBeDisabled();
    await form.getByLabel(/^Learner's user id/).fill(adminId);
    await email.check();
    await form.getByLabel(/^Show from/).fill('2099-01-01T10:00');
    await expect(form.getByText(/cannot be scheduled for later/)).toBeVisible();
    await form.getByLabel(/^Show from/).fill('');
    await form.getByRole('button', { name: 'Create notification' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Created' })).toContainText('Open it to send the e-mail', { timeout: 15000 });
    await expect(row(page, 'QAADMUI hello')).toContainText('Not sent');
    const db = (await adminDb().from('notifications').select('*').eq('title', 'QAADMUI hello').single()).data!;
    expect(db).toMatchObject({ type: 'announcement', channels: ['email', 'inbox'], email_sent_at: null, target: { kind: 'user', userId: adminId } });
  });

  test('[ADMUI-NTF-002] the send dialog shows the count, a sample and both caps; the button waits for the tick; cancelling sends nothing', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/notifications');
    await row(page, 'QAADMUI hello').getByRole('link', { name: 'QAADMUI hello' }).click();
    await expect(page.getByRole('heading', { name: 'QAADMUI hello' })).toBeVisible();
    await page.getByRole('button', { name: 'Send e-mail…' }).click();
    const d = dialog(page);
    await expect(d.getByTestId('recipient-count')).toHaveText('1', { timeout: 15000 });
    await expect(d.getByTestId('recipient-sample').locator('li')).toHaveCount(1);
    await expect(d.getByText('Limit for one announcement')).toBeVisible();
    await expect(d.getByText(/Limit for the whole day/)).toBeVisible();
    const send = d.getByRole('button', { name: 'Send e-mail now' });
    await expect(send).toBeDisabled();
    await d.getByLabel('I checked the recipients').check();
    await expect(send).toBeEnabled();
    await d.getByLabel('I checked the recipients').uncheck();
    await expect(send).toBeDisabled();
    await d.getByRole('button', { name: 'Cancel' }).click();
    await expect(d).toHaveCount(0);
    expect((await adminDb().from('notifications').select('email_sent_at').eq('title', 'QAADMUI hello').single()).data!.email_sent_at).toBeNull();
  });

  test('[ADMUI-NTF-003] a notification is deleted after asking', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/notifications');
    await row(page, 'QAADMUI hello').getByRole('link').click();
    await page.getByRole('button', { name: 'Delete notification' }).click();
    await dialog(page).getByRole('button', { name: 'Delete' }).click();
    await expect(page).toHaveURL(/\/admin\/notifications$/, { timeout: 15000 });
    expect((await adminDb().from('notifications').select('id').eq('title', 'QAADMUI hello')).data).toHaveLength(0);
  });

  test('[ADMUI-TPL-001] a template shows its built-in text and a server preview; an unknown placeholder is explained; a save is versioned', async ({ page }) => {
    await adminDb().from('content_docs').delete().eq('kind', 'email_template');
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/email-templates');
    await expect(row(page, 'welcome')).toContainText('Built-in');
    await row(page, 'welcome').getByRole('link', { name: 'welcome' }).click();
    await expect(page.getByTestId('preview-subject')).toContainText('Welcome to Python for Beginners', { timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Save template' })).toBeDisabled();   // nothing changed yet
    await page.getByLabel('Message').fill('Hello {{orderId}}');
    await expect(alertBox(page)).toContainText('{{orderId}}, which is not available here');
    await expect(page.getByRole('button', { name: 'Save template' })).toBeDisabled();
    await page.getByLabel('Message').fill('Hi ');
    await page.getByRole('button', { name: '{{name}}' }).click();
    await page.getByLabel('Subject').fill('Welcome, {{name}}');
    await expect(page.getByTestId('preview-subject')).toContainText('Welcome, Asha', { timeout: 15000 });
    await expect(page.getByTestId('preview-body')).toContainText('Hi Asha');
    await page.getByRole('button', { name: 'Save template' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Saved text, version 1')).toBeVisible();
    expect((await adminDb().from('content_docs').select('version, doc').eq('kind', 'email_template').eq('key', 'welcome').single()).data).toMatchObject({ version: 1, doc: { subject: 'Welcome, {{name}}', body: 'Hi {{name}}' } });
    await page.getByLabel('Message').fill('Hi {{name}}, see [site](https://example.com).');
    await page.getByRole('button', { name: 'Save template' }).click();
    await expect(page.getByText('Saved text, version 2')).toBeVisible({ timeout: 15000 });
  });

  test('[ADMUI-TPL-002] hostile text in a template stays inert in the preview: no script, no image, no javascript link', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/email-templates/welcome');
    await expect(page.getByTestId('preview-subject')).toBeVisible({ timeout: 15000 });
    await page.getByLabel('Message').fill('<script>window.__pwned=1</script> <img src=x onerror="window.__pwned=1"> [x](javascript:window.__pwned=1) **ok** {{name}}');
    await expect(page.getByTestId('preview-body')).toContainText('<script>', { timeout: 15000 });   // shown as text
    await expect(page.getByTestId('preview-body').locator('script, img, a')).toHaveCount(0);
    await expect(page.getByTestId('preview-body').locator('strong')).toHaveText('ok');
    expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
  });
});
