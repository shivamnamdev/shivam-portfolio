import { expect, type Page } from '@playwright/test';

const API = 'https://api.clerk.com/v1';

// Test-only helpers. They talk to the Clerk Backend API with CLERK_SECRET_KEY and refuse any key that
// is not a development/test key, so they can never act on the production instance.
function secretKey(): string {
  const key = process.env.CLERK_SECRET_KEY?.trim();
  if (!key) throw new Error('CLERK_SECRET_KEY is required for the sign-in helpers');
  if (!key.startsWith('sk_test_')) throw new Error('Refusing to use a non-test Clerk secret key in automation');
  return key;
}

async function clerkApi(path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secretKey()}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Clerk API ${init.method ?? 'GET'} ${path} -> ${res.status}: ${await res.text()}`);
  return res.json();
}

export const canSignIn = (): boolean => !!process.env.CLERK_SECRET_KEY?.trim().startsWith('sk_test_');

const idCache = new Map<string, string>();
export async function clerkUserId(email: string): Promise<string> {
  const cached = idCache.get(email);
  if (cached) return cached;
  const users = await clerkApi(`/users?limit=1&email_address=${encodeURIComponent(email)}`);
  if (!Array.isArray(users) || users.length === 0) throw new Error(`No Clerk user with email ${email} in this instance`);
  idCache.set(email, users[0].id);
  return users[0].id;
}

// Signs the page in as the given account without touching Google: mint a one-time sign-in token (Backend API)
// and redeem it through Clerk's ticket strategy in the browser, then reload so middleware sees the session.
export async function mintSignInToken(email: string): Promise<string> {
  const userId = await clerkUserId(email);
  const { token } = await clerkApi('/sign_in_tokens', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, expires_in_seconds: 120 }),
  });
  return token as string;
}

// Signs in through Clerk's hosted sign-in page, the way a visitor who hit a protected URL does: the page URL
// carries redirect_url, and the one-time ticket completes authentication there.
export async function signInThroughHostedRedirect(page: Page, protectedPath: string, email: string): Promise<void> {
  await page.goto(protectedPath, { waitUntil: 'domcontentloaded' });
  await page.waitForURL(/accounts\.dev\/sign-in/, { timeout: 25000 });
  const url = new URL(page.url());
  url.searchParams.set('__clerk_ticket', await mintSignInToken(email));
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
}

export async function signInAs(page: Page, email: string): Promise<void> {
  const token = await mintSignInToken(email);
  await page.goto('/');
  // Dev instances reload the page once or twice on first load (dev-browser handshake): let that settle first.
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => (window as any).Clerk?.loaded, undefined, { timeout: 30000 });
  // setActive() triggers a navigation, which destroys this evaluate context: start it without awaiting it,
  // then wait for the session cookie instead.
  const status = await page.evaluate(async (ticket: string) => {
    const clerk = (window as any).Clerk;
    const attempt = await clerk.client.signIn.create({ strategy: 'ticket', ticket });
    setTimeout(() => clerk.setActive({ session: attempt.createdSessionId }), 0);
    return attempt.status as string;
  }, token);
  expect(status).toBe('complete');
  await expect.poll(async () => (await page.context().cookies()).some(c => c.name === '__session' && !!c.value),
    { timeout: 20000, message: 'Clerk __session cookie must be set after redeeming the sign-in token' }).toBe(true);
  // WebKit reports the first goto as interrupted when Clerk's own post-sign-in navigation lands at the same time: retry once.
  await page.goto('/').catch(async () => { await page.waitForLoadState('load'); await page.goto('/'); });
  // viewport-agnostic: the Dashboard link is desktop-only, the account button shows on every viewport
  await expect(page.locator('.cl-userButtonTrigger').first()).toBeVisible({ timeout: 20000 });
}

export async function signOutViaClerk(page: Page): Promise<void> {
  await page.evaluate(async () => { await (window as any).Clerk.signOut(); });
}
