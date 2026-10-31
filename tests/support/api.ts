import { devices, type APIRequestContext, type Browser, type BrowserContext } from '@playwright/test';
import crypto from 'crypto';
import { signInAs } from './clerk';

// Helpers for the API PRDs (09 to 13). A signed-in API call is made with the browser context's request object after a
// real Clerk ticket sign-in, so the server sees exactly what it sees for a learner: a session cookie.

export const API_UA = 'shivam-academy-api-tests';   // a non-browser User-Agent avoids the Clerk dev interstitial for visitor calls

export type Session = { request: APIRequestContext; context: BrowserContext; close: () => Promise<void> };

export async function sessionFor(browser: Browser, email: string): Promise<Session> {
  // a browser User-Agent is set on purpose: a file-level test.use({ userAgent }) would otherwise be inherited and Clerk answers 401 to non-browser agents
  const context = await browser.newContext({ userAgent: devices['Desktop Chrome'].userAgent, baseURL: `http://localhost:${process.env.PORT ?? '3000'}` });
  const page = await context.newPage();
  await signInAs(page, email);
  return { request: context.request, context, close: () => context.close() };
}

export const hasRazorpayTestKeys = (): boolean => !!process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_') && !!process.env.RAZORPAY_KEY_SECRET;
export const razorpaySignature = (orderId: string, paymentId: string, secret = process.env.RAZORPAY_KEY_SECRET!): string =>
  crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
export const paymentIdFor = (orderId: string) => 'pay_QA' + orderId.slice(-8);
