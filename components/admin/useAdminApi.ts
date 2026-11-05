'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { failureAction, networkFailure, parseEnvelope, type ApiResult, type Failure } from '@/lib/adminUi/client';

// The one way a screen talks to the admin API: same origin, the admin's session cookie, the standard envelope. A 401 sends the admin to sign in again.
const BASE = '/api/admin/v1';

export async function adminFetch<T>(path: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: init.method ?? 'GET', credentials: 'same-origin',
      headers: { ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch { return { ok: false, failure: networkFailure() }; }
  const text = await res.text();
  let body: unknown = null;
  try { body = JSON.parse(text); } catch { /* not JSON: parseEnvelope reports a bad answer */ }
  const result = parseEnvelope<T>(res.status, body);
  if (!result.ok && failureAction(result.failure) === 'sign-in') window.location.assign('/');
  return result;
}

// Loads a GET once (and again on reload()). `data` stays on the last good answer while a reload runs.
export function useAdminGet<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const latest = useRef(0);
  const load = useCallback(async () => {
    if (path === null) return;
    const mine = ++latest.current;
    setLoading(true);
    const r = await adminFetch<T>(path);
    if (mine !== latest.current) return;   // an older request finishing late must not overwrite a newer one
    if (r.ok) { setData(r.data); setFailure(null); } else setFailure(r.failure);
    setLoading(false);
  }, [path]);
  useEffect(() => { void load(); }, [load]);
  return { data, failure, loading, reload: load };
}

// A paged list: the first page, "load more" along the cursor, and a reload. Changing `path` (filters) starts again from the first page.
export function useAdminList<T>(path: string) {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [loading, setLoading] = useState(true);
  const latest = useRef(0);
  const fetchPage = useCallback(async (from: string | null) => {
    const mine = ++latest.current;
    setLoading(true);
    const sep = path.includes('?') ? '&' : '?';
    const r = await adminFetch<{ items: T[]; nextCursor: string | null }>(from ? `${path}${sep}cursor=${encodeURIComponent(from)}` : path);
    if (mine !== latest.current) return;
    if (r.ok) { setItems((prev) => (from ? [...prev, ...r.data.items] : r.data.items)); setCursor(r.data.nextCursor); setFailure(null); } else setFailure(r.failure);
    setLoading(false);
  }, [path]);
  useEffect(() => { void fetchPage(null); }, [fetchPage]);
  return { items, hasMore: cursor !== null, failure, loading, loadMore: () => (cursor ? fetchPage(cursor) : Promise.resolve()), reload: () => fetchPage(null) };
}
