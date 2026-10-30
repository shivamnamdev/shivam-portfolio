import { expect, type Page, type Route } from '@playwright/test';
import { QA_FIXTURE_SLUG, activeCourses } from '../../data/courses';
import { signInAs } from './clerk';

// Helpers for the PRD 03 (Course Discovery & Pricing UI) automation. Payment calls are mocked in the browser so
// no real order, payment or enrolment is created unless a test says so explicitly.

export const fixtureCourse = () => activeCourses.find(c => c.slug === QA_FIXTURE_SLUG);
export const FIXTURE_PATH = `/courses/${QA_FIXTURE_SLUG}`;

export const ui = {
  finalPrice: (page: Page) => page.locator('span.text-5xl').first(),
  struckPrice: (page: Page) => page.locator('span.line-through').first(),
  couponInput: (page: Page) => page.getByPlaceholder('Enter code'),
  applyButton: (page: Page) => page.getByRole('button', { name: 'Apply', exact: true }),
  inr: (page: Page) => page.getByRole('button', { name: '🇮🇳 India' }),
  usd: (page: Page) => page.getByRole('button', { name: 'International' }),
  buyNow: (page: Page, cur: 'INR' | 'USD' = 'INR') => page.getByRole('button', { name: new RegExp(`Buy Now \\(${cur}\\)`) }),
  enrollFree: (page: Page) => page.getByRole('button', { name: /Enroll for Free/ }),
  enrolled: (page: Page) => page.getByRole('button', { name: /You are Enrolled! Go to Dashboard/ }),
  successModal: (page: Page) => page.getByRole('heading', { name: 'Welcome Aboard!' }),
};

// alert() blocks the page: accept every dialog and remember what it said.
export function trackDialogs(page: Page): string[] {
  const seen: string[] = [];
  page.on('dialog', d => { seen.push(d.message()); d.accept().catch(() => {}); });
  return seen;
}

export function trackPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  return errors;
}

// Opens the fixture sales page; signed in as `email` when given (coupons need a signed-in user).
export async function openFixture(page: Page, email: string | null, path: string = FIXTURE_PATH): Promise<void> {
  if (email) await signInAs(page, email);
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await expect(ui.inr(page)).toBeVisible();
}

export async function applyCode(page: Page, code: string): Promise<void> {
  await ui.couponInput(page).fill(code);
  await ui.applyButton(page).click();
}

export type GatewayMock = {
  orderBodies: any[]; freeBodies: any[]; verifyBodies: any[];
  /** what the page handed to `new Razorpay(options)` and how many times `.open()` ran */
  rzp: () => Promise<{ opened: number; options: any } | null>;
  paySuccess: () => Promise<void>;
  payFail: () => Promise<void>;
};

type MockOpts = {
  order?: 'ok' | 'fail' | 'slow' | 'abort';
  verify?: 'ok' | 'fail';
  free?: 'ok' | 'fail' | 'slow' | 'abort';
  delayMs?: number;
};

const RAZORPAY_STUB = `
window.__rzp = { opened: 0, options: null, handlers: {} };
window.Razorpay = function (options) {
  window.__rzp.options = options;
  this.on = function (name, fn) { window.__rzp.handlers[name] = fn; };
  this.open = function () { window.__rzp.opened += 1; };
};`;

export async function mockGateway(page: Page, opts: MockOpts = {}): Promise<GatewayMock> {
  const m: GatewayMock = {
    orderBodies: [], freeBodies: [], verifyBodies: [],
    rzp: () => page.evaluate(() => (window as any).__rzp ?? null),
    paySuccess: () => page.evaluate(() => (window as any).__rzp.options.handler({
      razorpay_order_id: 'order_mock', razorpay_payment_id: 'pay_mock', razorpay_signature: 'sig_mock',
    })),
    payFail: () => page.evaluate(() => (window as any).__rzp.handlers['payment.failed']({ error: { description: 'mock failure' } })),
  };
  const delay = opts.delayMs ?? 700;
  const json = (route: Route, status: number, body: unknown) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  await page.route('https://checkout.razorpay.com/**', route =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: RAZORPAY_STUB }));

  await page.route('**/api/create-order', async route => {
    m.orderBodies.push(route.request().postDataJSON());
    if (opts.order === 'abort') return route.abort('failed');
    if (opts.order === 'slow') await new Promise(r => setTimeout(r, delay));
    if (opts.order === 'fail') return json(route, 500, { success: false, error: 'Order creation failed (mock)' });
    const body = route.request().postDataJSON();
    return json(route, 200, { success: true, order: { id: 'order_mock', amount: 1000, currency: body.currency } });
  });
  await page.route('**/api/verify-payment', async route => {
    m.verifyBodies.push(route.request().postDataJSON());
    if (opts.verify === 'fail') return json(route, 400, { success: false, error: 'Invalid payment signature' });
    return json(route, 200, { success: true });
  });
  await page.route('**/api/enroll-free', async route => {
    m.freeBodies.push(route.request().postDataJSON());
    if (opts.free === 'abort') return route.abort('failed');
    if (opts.free === 'slow') await new Promise(r => setTimeout(r, delay));
    if (opts.free === 'fail') return json(route, 500, { success: false, error: 'Failed to process enrollment' });
    return json(route, 200, { success: true, message: 'Enrolled for free successfully!' });
  });
  return m;
}

// Milliseconds from a click until the browser has painted two frames, measured inside the page (no test-runner latency).
export async function clickToPaintMs(page: Page, buttonText: string): Promise<number> {
  return page.evaluate(async (text: string) => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.includes(text)) as HTMLButtonElement;
    const t0 = performance.now();
    btn.click();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return performance.now() - t0;
  }, buttonText);
}
