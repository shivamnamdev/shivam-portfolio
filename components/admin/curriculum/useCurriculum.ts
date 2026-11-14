'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { adminFetch } from '../useAdminApi';
import { ifMatchHeader, type Failure } from '@/lib/adminUi/client';
import type { Module } from '@/lib/adminUi/curriculum';

export type CurriculumData = {
  cohort: string; status: string; version: number; modules: Module[]; published: Module[] | null; publishedAt?: string;
  hasUnpublishedChanges: boolean; counts: { modules: number; lessons: number }; updatedAt: string; updatedBy: string;
  examGrader: boolean; examLessonId: string | null;   // can the portal mark an exam for this course (a grader exists in code), and which lesson is it
};

// Every curriculum call answers with the whole updated curriculum, so the screen never edits its own copy: each action is one server call and the
// answer replaces the state. A failure leaves the last good copy on screen and is shown next to the thing that was attempted.
export function useCurriculum(cohort: string) {
  const [data, setData] = useState<CurriculumData | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const base = `/curriculum/${encodeURIComponent(cohort)}`;
  const latest = useRef<CurriculumData | null>(null);   // the newest copy, so two calls in one handler (save a lesson, then mark the exam) use the right version
  latest.current = data;

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
    const current = latest.current;
    if (!current) return { status: 0, code: 'not_loaded', message: 'The curriculum is not loaded yet' };
    setBusy(true); setFailure(null);
    const r = await adminFetch<CurriculumData>(`${base}${sub}`, { method, body, headers: ifMatchHeader(current.version) });
    setBusy(false);
    if (r.ok) { latest.current = r.data; setData(r.data); return null; }
    if (!quiet) setFailure(r.failure);
    return r.failure;
  }
  return { data, failure, setFailure, loading, busy, act, reload: load };
}
