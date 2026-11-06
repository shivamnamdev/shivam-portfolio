'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { adminFetch } from '@/components/admin/useAdminApi';
import { ErrorNote, Spinner, buttonClass, ghostButtonClass } from '@/components/admin/ui';
import { codeSizeText, learnerLine, submittedText, type SubmissionItem } from '@/lib/adminUi/progressView';
import type { Failure } from '@/lib/adminUi/client';

type WithCode = SubmissionItem & { submittedCode: string };

// Shows one learner's submitted code. The code is fetched only now (a list never holds it) and drawn as text in a read-only box: never as HTML.
export default function CodeDialog({ submission, onClose }: { submission: SubmissionItem; onClose: () => void }) {
  const [data, setData] = useState<WithCode | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [copied, setCopied] = useState(false);
  const close = useRef<HTMLButtonElement>(null);
  const stop = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    let live = true;
    void adminFetch<WithCode>(`/submissions/${encodeURIComponent(submission.id)}`).then((r) => { if (!live) return; if (r.ok) setData(r.data); else setFailure(r.failure); });
    return () => { live = false; };
  }, [submission.id]);
  useEffect(() => {
    close.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') stop(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [stop]);

  async function copy() { if (!data) return; try { await navigator.clipboard.writeText(data.submittedCode); setCopied(true); } catch { setCopied(false); } }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="code-title" className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-white/10 bg-[#111] p-6 shadow-2xl">
        <h2 id="code-title" className="text-lg font-bold text-white">{submission.lessonTitle}</h2>
        <p className="mt-1 text-xs text-stone-400">{learnerLine(submission)} · {submission.cohortSlug} · {submittedText(submission.completedAt)} · {codeSizeText(submission.codeLength)}</p>
        <div className="mt-4 min-h-0 flex-1 overflow-auto">
          {!data && !failure && <Spinner label="Loading the code" />}
          <ErrorNote failure={failure} />
          {data && (data.submittedCode
            ? <pre data-testid="submitted-code" tabIndex={0} className="whitespace-pre-wrap break-words rounded-lg bg-black/60 p-4 font-mono text-xs text-stone-100">{data.submittedCode}</pre>
            : <p className="text-sm text-stone-400">This submission has no code.</p>)}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          {data?.submittedCode && <button type="button" className={ghostButtonClass} onClick={() => void copy()}>{copied ? 'Copied' : 'Copy code'}</button>}
          <button ref={close} type="button" className={buttonClass} onClick={stop}>Close</button>
        </div>
      </div>
    </div>
  );
}
