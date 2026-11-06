'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { adminFetch, useAdminGet } from '@/components/admin/useAdminApi';
import SendEmailDialog, { type SendResult } from '@/components/admin/engagement/SendEmailDialog';
import { ConfirmDialog, ErrorNote, PageHeader, Spinner, StatusBadge, buttonClass, ghostButtonClass } from '@/components/admin/ui';
import { targetText, type NotificationView } from '@/lib/adminUi/engagement';
import type { Failure } from '@/lib/adminUi/client';

export default function NotificationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const loaded = useAdminGet<NotificationView>(`/notifications/${encodeURIComponent(id)}`);
  const [n, setN] = useState<NotificationView | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  useEffect(() => { if (loaded.data) setN(loaded.data); }, [loaded.data]);
  const closeSend = useCallback(() => setSending(false), []);

  async function remove() {
    setBusy(true);
    const r = await adminFetch(`/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' });
    setBusy(false); setConfirmDelete(false);
    if (r.ok) router.push('/admin/notifications'); else setFailure(r.failure);
  }

  if (loaded.loading && !n) return <Spinner />;
  if (!n) return <div><ErrorNote failure={loaded.failure} /><Link href="/admin/notifications" className="text-sm text-amber-400">Back to notifications</Link></div>;
  const usesEmail = n.channels.includes('email');
  return (
    <div>
      <p className="mb-2 text-sm"><Link href="/admin/notifications" className="text-amber-400 hover:text-amber-300">Notifications</Link> / <span className="text-stone-400">{n.title}</span></p>
      <PageHeader title={n.title} subtitle={`${n.type} · ${targetText(n.target)}`} />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusBadge value={n.status} />
        <span className="text-sm text-stone-400">Shown from {n.publishAt.slice(0, 16).replace('T', ' ')} UTC{n.expiresAt ? `, hidden after ${n.expiresAt.slice(0, 16).replace('T', ' ')} UTC` : ''}</span>
        <span className="text-sm text-stone-400">Read by {n.readCount ?? 0} learner(s)</span>
      </div>
      <section aria-label="Message" className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="whitespace-pre-wrap text-sm text-stone-200">{n.body}</p>
        {n.link && <p className="mt-3 text-xs text-stone-400">Link: <span className="font-mono">{n.link}</span></p>}
      </section>

      <section aria-label="E-mail" className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="mb-2 text-sm font-bold text-white">E-mail</h2>
        {!usesEmail && <p className="text-sm text-stone-400">This notification is inbox only.</p>}
        {usesEmail && n.emailSentAt && <p role="status" className="text-sm text-purple-200">The e-mail was sent on {n.emailSentAt.slice(0, 10)} to {n.emailRecipients ?? 0} people. It is sent once.</p>}
        {usesEmail && !n.emailSentAt && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-stone-300">Not sent yet. You will see who it reaches before anything is sent.</p>
            <button type="button" className={buttonClass} onClick={() => { setResult(null); setSending(true); }}>Send e-mail…</button>
          </div>
        )}
        {result && <p role="status" className="mt-3 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">Sent {result.sent} e-mail(s){result.failed ? `, ${result.failed} failed` : ''}{result.skipped ? `, ${result.skipped} skipped (no address or a repeat)` : ''}.</p>}
      </section>

      <ErrorNote failure={failure} />
      <button type="button" disabled={busy} className={ghostButtonClass} onClick={() => setConfirmDelete(true)}>Delete notification</button>
      {sending && <SendEmailDialog notification={n} onClose={closeSend} onSent={(r) => { setSending(false); setResult(r); setN({ ...r.notification, readCount: n.readCount }); }} />}
      {confirmDelete && <ConfirmDialog title={`Delete "${n.title}"?`} danger busy={busy} confirmLabel="Delete" onCancel={() => setConfirmDelete(false)} onConfirm={remove} body={<p>It disappears from every inbox. An e-mail that was already sent cannot be recalled.</p>} />}
    </div>
  );
}
