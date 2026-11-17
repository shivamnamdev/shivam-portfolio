import { test, expect } from '@playwright/test';
import { fetchWithTimeout, REQUEST_TIMEOUT_MS, RequestTimeoutError, TIMEOUT_MESSAGE } from '../../lib/fetchTimeout';

// Unit level: the request time limit (SCP-65). A fake fetch stands in for the network; no server needed.
const never = (_i: string, init?: RequestInit) => new Promise<Response>((_, reject) => { init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))); });
const answers = (body: string, status = 200) => async () => new Response(body, { status });

test.describe('Request time limit @unit', () => {
  test('[FTO-UNIT-001] an answer inside the limit is returned untouched', async () => {
    const res = await fetchWithTimeout('/x', {}, 200, answers('ok'));
    expect(await res.text()).toBe('ok');
  });

  test('[FTO-UNIT-002] a request that never answers is cut off with the timeout error and message', async () => {
    const started = Date.now();
    const err = await fetchWithTimeout('/x', {}, 60, never).catch(e => e);
    expect(err).toBeInstanceOf(RequestTimeoutError);
    expect(err.message).toBe(TIMEOUT_MESSAGE);
    expect(Date.now() - started).toBeLessThan(2000);
  });

  test('[FTO-UNIT-003] another failure (offline, refused) passes through and is not called a timeout', async () => {
    const boom = new TypeError('Failed to fetch');
    const err = await fetchWithTimeout('/x', {}, 200, async () => { throw boom; }).catch(e => e);
    expect(err).toBe(boom);
  });

  test('[FTO-UNIT-004] the request carries the caller options and an abort signal; the default limit is 30 seconds', async () => {
    let seen: RequestInit | undefined;
    await fetchWithTimeout('/x', { method: 'POST', body: '{}' }, 200, async (_i, init) => { seen = init; return new Response('ok'); });
    expect(seen?.method).toBe('POST');
    expect(seen?.body).toBe('{}');
    expect(seen?.signal).toBeInstanceOf(AbortSignal);
    expect(REQUEST_TIMEOUT_MS).toBe(30000);
  });
});
