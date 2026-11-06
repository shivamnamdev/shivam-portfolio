'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { adminFetch, useAdminGet } from '@/components/admin/useAdminApi';
import { DiscountFields, LearnerPicker } from '@/components/admin/coupons/fields';
import { ConfirmDialog, ErrorNote, PageHeader, Spinner, StatusBadge, buttonClass, ghostButtonClass, inputClass } from '@/components/admin/ui';
import { addEmail, couponChanges, couponToEditForm, discountText, editProblems, parseEmails, scopeText, type AppliesTo, type CouponLike, type Discount, type EditForm } from '@/lib/adminUi/coupons';
import type { Failure } from '@/lib/adminUi/client';

type Coupon = Omit<CouponLike, 'users'> & { code: string; state: string; redemptions: number; appliesTo?: AppliesTo; users?: Array<{ id: string; email: string | null; name: string }>; discount: Discount; redeemedAt?: string; reservedUntil?: string; batchId?: string };

export default function CouponDetailPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const loaded = useAdminGet<Coupon>(`/coupons/${encodeURIComponent(code)}`);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const adopt = (c: Coupon) => { setCoupon(c); setForm(couponToEditForm(c)); };
  useEffect(() => { if (loaded.data) adopt(loaded.data); }, [loaded.data]);

  async function patch(body: Record<string, unknown>, message: string) {
    setBusy(true); setFailure(null); setSaved(null);
    const r = await adminFetch<Coupon>(`/coupons/${encodeURIComponent(code)}`, { method: 'PATCH', body });
    setBusy(false);
    if (r.ok) { adopt(r.data); setSaved(message); } else setFailure(r.failure);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!coupon || !form) return;
    const body = couponChanges(coupon, form);
    if (!Object.keys(body).length) { setFailure({ status: 400, code: 'nothing', message: 'Nothing has changed' }); return; }
    await patch(body, 'Saved');
  }
  async function remove() {
    setBusy(true);
    const r = await adminFetch(`/coupons/${encodeURIComponent(code)}`, { method: 'DELETE' });
    setBusy(false); setConfirmDelete(false);
    if (r.ok) router.push('/admin/coupons'); else setFailure(r.failure);
  }

  if (loaded.loading && !coupon) return <Spinner />;
  if (!coupon || !form) return <div><ErrorNote failure={loaded.failure} /><Link href="/admin/coupons" className="text-sm text-amber-400">Back to coupons</Link></div>;
  const used = coupon.state === 'redeemed';
  const problems = editProblems(coupon, form, new Date());
  const people = parseEmails(form.usersText).emails;
  return (
    <div>
      <p className="mb-2 text-sm"><Link href="/admin/coupons" className="text-amber-400 hover:text-amber-300">Coupons</Link> / <span className="font-mono text-stone-400">{coupon.code}</span></p>
      <PageHeader title={coupon.code} subtitle={`${discountText(coupon.discount)} · ${scopeText(coupon.appliesTo)}`} />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusBadge value={coupon.kind} /><StatusBadge value={coupon.state} />
        <span className="text-sm text-stone-400">Used {coupon.redemptions}{coupon.maxRedemptions ? ` of ${coupon.maxRedemptions}` : ''} time(s)</span>
        {coupon.batchId && <span className="font-mono text-xs text-stone-500">batch {coupon.batchId.slice(0, 13)}</span>}
        {!used && <button type="button" disabled={busy} className={ghostButtonClass} onClick={() => void patch({ active: !coupon.active }, coupon.active ? 'Deactivated' : 'Activated')}>{coupon.active ? 'Deactivate' : 'Activate'}</button>}
      </div>
      {used && <p role="status" className="mb-6 rounded-lg bg-purple-500/10 p-3 text-sm text-purple-200">This one-time code has been used{coupon.redeemedAt ? ` (${coupon.redeemedAt.slice(0, 10)})` : ''} and can no longer be changed or deleted.</p>}

      {!used && (
        <form onSubmit={save} aria-label="Edit coupon" className="space-y-4">
          <DiscountFields value={form.discount} onChange={(discount) => setForm({ ...form, discount })} />
          <label className="block max-w-xs text-xs font-semibold text-stone-400">Expires<input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className={`${inputClass} mt-1 font-normal`} /></label>
          {coupon.kind === 'everyone' && <label className="block max-w-xs text-xs font-semibold text-stone-400">Most uses in total (cannot be removed once set)<input inputMode="numeric" value={form.maxRedemptions} onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })} className={`${inputClass} mt-1 font-normal`} /></label>}
          {coupon.kind === 'selected' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-stone-400">Student e-mails (the list is replaced when you save)<textarea rows={5} value={form.usersText} onChange={(e) => setForm({ ...form, usersText: e.target.value })} className={`${inputClass} mt-1 font-mono text-xs font-normal`} /></label>
              <p className="text-xs text-stone-500">{people.length} student(s) listed.</p>
              <LearnerPicker onPick={(email) => setForm((f) => (f ? { ...f, usersText: addEmail(f.usersText, email) } : f))} />
            </div>
          )}
          <p className="text-xs text-stone-500">The code, the kind and where it works cannot be changed here. Create a new coupon for that.</p>
          {problems.length > 0 && <ul role="alert" className="list-disc rounded-lg bg-amber-500/10 p-3 pl-7 text-xs text-amber-200">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={busy || problems.length > 0} className={buttonClass}>{busy ? 'Saving…' : 'Save changes'}</button>
            {saved && <span role="status" className="text-sm text-emerald-300">{saved}</span>}
          </div>
        </form>
      )}
      <div className="mt-3"><ErrorNote failure={failure} /></div>
      {coupon.kind === 'selected' && used === false && coupon.users && <p className="mt-2 text-xs text-stone-500">Listed now: {coupon.users.map((u) => u.name || u.email).join(', ')}</p>}

      {!used && <section className="mt-10 border-t border-white/10 pt-6"><button type="button" className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10" onClick={() => setConfirmDelete(true)}>Delete coupon</button></section>}
      {confirmDelete && <ConfirmDialog title={`Delete ${coupon.code}?`} danger busy={busy} confirmLabel="Delete coupon" onCancel={() => setConfirmDelete(false)} onConfirm={() => void remove()} body={<p>This cannot be undone. A coupon that has already been used cannot be deleted; deactivate it instead.</p>} />}
    </div>
  );
}
