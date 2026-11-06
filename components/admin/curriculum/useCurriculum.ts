'use client';
import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../useAdminApi';
import { ifMatchHeader, type Failure } from '@/lib/adminUi/client';
import type { Module } from '@/lib/adminUi/curriculum';

export type CurriculumData = {
  cohort: string; status: string; version: number; modules: Module[]; published: Module[] | null; publishedAt?: string;
  hasUnpublishedChanges: boolean; counts: { modules: number; lessons: number }; updatedAt: string; updatedBy: string;
};

// Every curriculum call answers with the whole updated curriculum, so the screen never edits its own copy: each action is one server call and the
// answer replaces the state. A failure leaves the last good copy on screen and is shown next to the thing that was attempted.
export function useCurriculum(cohort: string) {
  const [data, setData] = useState<CurriculumData | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const base = `/curriculum/${encodeURIComponent(cohort)}`;

  const load = useCallback(async () => {
    setLoading(true);
    const r = await adminFetch<CurriculumData>(base);
    if (r.ok) { setData(r.data); setFailure(null); } else setFailure(r.failure);
    setLoading(false);
  }, [base]);
  useEffect(() => { void load(); }, [load]);

  // `sub` is the path below the cohort ("/modules", "/lessons/abc"). Returns null when the server accepted the change, otherwise the failure
  // (which is also shown at the top of the screen unless `quiet`, used when the caller shows it next to its own form).
  async function act(sub: string, method: 'POST' | 'PATCH' | 'DELETE' | 'PUT', body?: unknown, quiet = false): Promise<Failure | null> {
    if (!data) return { status: 0, code: 'not_loaded', message: 'The curriculum is not loaded yet' };
    setBusy(true); setFailure(null);
    const r = await adminFetch<CurriculumData>(`${base}${sub}`, { method, body, headers: ifMatchHeader(data.version) });
    setBusy(false);
    if (r.ok) { setData(r.data); return null; }
    if (!quiet) setFailure(r.failure);
    return r.failure;
  }
  return { data, failure, setFailure, loading, busy, act, reload: load };
}
