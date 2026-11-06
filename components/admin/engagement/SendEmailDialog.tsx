'use client';
import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '@/components/admin/useAdminApi';
import { ConfirmDialog, ErrorNote, Spinner } from '@/components/admin/ui';
import { canConfirmSend, sendBlocker, targetText, type NotificationView, type Target } from '@/lib/adminUi/engagement';
import type { Failure } from '@/lib/adminUi/client';

type Recipients = { target: Target; count: number; sample: Array<{ name: string; email: string | null }>; sampleSize: number };
type Setting = { key: string; value: number | string | null };
export type SendResult = { sent: number; failed: number; skipped: number; notification: NotificationView };

// The explicit e-mail send. It asks the server for the recipient count and a sample of at most 5, shows both caps, and enables the button only
// after "I checked the recipients". The server repeats every check and sends once (owner only); this dialog never holds the whole list.
export default function SendEmailDialog({ notification, onClose, onSent }: { notification: NotificationView; onClose: () => void; onSent: (r: SendResult) => void }) {
  const [rec, setRec] = useState<Recipients | null>(null);
  const [caps, setCaps] = useState<{ announcement: number; daily: number } | null>(null);
  const [loadFailure, setLoadFailure] = useState<Failure | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const cancel = useCallback(() => { if (!busy) onClose(); }, [busy, onClose]);

  useEffect(() => {
    let live = true;
    void (async () => {
      const [r, s] = await Promise.all([adminFetch<Recipients>(`/notifications/${notification.id}/recipients`), adminFetch<{ items: Setting[] }>('/settings')]);
      if (!live) return;
      if (!r.ok) { setLoadFailure(r.failure); return; }
      if (!s.ok) { setLoadFailure(s.failure); return; }
      const num = (k: string) => Number(s.data.items.find((i) => i.key === k)?.value);
      setRec(r.data); setCaps({ announcement: num('announcement-email-cap'), daily: num('daily-email-cap') });
    })();
    return () => { live = false; };
  }, [notification.id]);

  async function send() {
    setBusy(true); setFailure(null);
    const r = await adminFetch<SendResult>(`/notifications/${notification.id}/send-email`, { method: 'POST' });
    setBusy(false);
    if (r.ok) onSent(r.data); else setFailure(r.failure);
  }
  const ready = rec && caps;
  const blocker = ready ? sendBlocker(notification, rec.count, caps.announcement) : 'Loading the recipients…';
  return (
    <ConfirmDialog title={`E-mail "${notification.title}"?`} confirmLabel="Send e-mail now" busy={busy} confirmDisabled={!ready || !canConfirmSend(checked, blocker)} onCancel={cancel} onConfirm={send} body={
      <div className="space-y-3">
        {!ready && !loadFailure && <Spinner label="Loading the recipients" />}
        <ErrorNote failure={loadFailure} />
        {ready && (
          <>
            <p>This sends <strong>one e-mail to each person right now</strong>. It can be sent only once and cannot be undone.</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg bg-white/5 p-3 text-xs">
              <dt className="text-stone-400">Target</dt><dd>{targetText(rec.target)}</dd>
              <dt className="text-stone-400">People reached</dt><dd data-testid="recipient-count"><strong>{rec.count}</strong></dd>
              <dt className="text-stone-400">Limit for one announcement</dt><dd>{caps.announcement}</dd>
              <dt className="text-stone-400">Limit for the whole day</dt><dd>{caps.daily} (the contact form uses it too)</dd>
            </dl>
            {rec.sample.length > 0
              ? <div><p className="text-xs text-stone-400">A sample of {Math.min(rec.sample.length, rec.sampleSize)} recipients:</p><ul data-testid="recipient-sample" className="mt-1 list-disc pl-5 text-xs">{rec.sample.map((p, i) => <li key={i}>{p.name || 'No name'} ({p.email ?? 'no e-mail'})</li>)}</ul></div>
              : <p className="text-xs text-stone-400">{rec.target.kind === 'all' ? 'Everyone who has signed up receives it; no sample is listed for this target.' : 'No sample is available for this target.'}</p>}
            {blocker && <p role="alert" className="rounded-lg bg-amber-500/10 p-2 text-xs text-amber-200">{blocker}</p>}
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={checked} disabled={!!blocker} onChange={(e) => setChecked(e.target.checked)} className="mt-1" /> I checked the recipients</label>
          </>
        )}
        <ErrorNote failure={failure} />
      </div>
    } />
  );
}
