// lib/fetchTimeout.ts
// A fetch that gives up after a time limit, so a request that never answers cannot leave a button on "Processing..." for ever (SCP-65).

export const REQUEST_TIMEOUT_MS = 30_000;
export const TIMEOUT_MESSAGE = "The request took too long. Please check your connection and try again.";

export class RequestTimeoutError extends Error {
  constructor() { super(TIMEOUT_MESSAGE); this.name = "RequestTimeoutError"; }
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

// Aborts the request after `ms` and rejects with RequestTimeoutError; any other failure passes through unchanged.
export async function fetchWithTimeout(input: string, init: RequestInit = {}, ms: number = REQUEST_TIMEOUT_MS, fetchImpl: FetchLike = (i, o) => fetch(i, o)): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, ms);
  try {
    return await fetchImpl(input, { ...init, signal: controller.signal });
  } catch (e) {
    if (timedOut) throw new RequestTimeoutError();
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
