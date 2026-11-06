'use client';
import { useState } from 'react';
import { adminFetch } from '../useAdminApi';
import { ghostButtonClass, inputClass } from '../ui';
import { planIdsFrom, type DiscountForm } from '@/lib/adminUi/coupons';

export function DiscountFields({ value, onChange }: { value: DiscountForm; onChange: (v: DiscountForm) => void }) {
  return (
    <fieldset className="rounded-lg border border-white/10 p-3">
      <legend className="px-2 text-sm font-bold text-white">Discount</legend>
      <div role="radiogroup" aria-label="Discount type" className="mb-3 flex gap-4 text-sm">
        {(['percentage', 'fixed'] as const).map((t) => <label key={t} className="flex items-center gap-2"><input type="radio" name="discount-type" checked={value.type === t} onChange={() => onChange({ ...value, type: t })} />{t === 'percentage' ? 'Percentage off' : 'Fixed amount off'}</label>)}
      </div>
      {value.type === 'percentage' ? (
        <label className="block max-w-xs text-xs font-semibold text-stone-400">Percent (above 0, up to 100)<input inputMode="decimal" value={value.percent} onChange={(e) => onChange({ ...value, percent: e.target.value })} className={`${inputClass} mt-1 font-normal`} /></label>
      ) : (
        <div className="grid max-w-md gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-stone-400">Amount off in INR<input inputMode="decimal" value={value.inr} onChange={(e) => onChange({ ...value, inr: e.target.value })} className={`${inputClass} mt-1 font-normal`} /></label>
          <label className="text-xs font-semibold text-stone-400">Amount off in USD<input inputMode="decimal" value={value.usd} onChange={(e) => onChange({ ...value, usd: e.target.value })} className={`${inputClass} mt-1 font-normal`} /></label>
          <p className="text-[11px] text-stone-500 sm:col-span-2">Fill one or both. The server refuses a discount that would leave a price above zero but below the 1-unit payment minimum.</p>
        </div>
      )}
    </fieldset>
  );
}

// Which cohorts and plans a coupon works for. Nothing ticked = every cohort and plan.
export function ScopeFields({ cohorts, selected, onSelected, planIds, onPlanIds }: { cohorts: Array<{ slug: string; title: string }>; selected: string[]; onSelected: (v: string[]) => void; planIds: string; onPlanIds: (v: string) => void }) {
  const invalid = planIdsFrom(planIds).invalid;
  return (
    <fieldset className="rounded-lg border border-white/10 p-3">
      <legend className="px-2 text-sm font-bold text-white">Works for</legend>
      <p className="mb-2 text-xs text-stone-500">Leave everything empty for every cohort and plan.</p>
      <div className="mb-3 flex max-h-40 flex-col gap-1 overflow-y-auto">
        {cohorts.map((c) => <label key={c.slug} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selected.includes(c.slug)} onChange={(e) => onSelected(e.target.checked ? [...selected, c.slug] : selected.filter((s) => s !== c.slug))} />{c.title} <span className="font-mono text-xs text-stone-500">{c.slug}</span></label>)}
        {!cohorts.length && <span className="text-xs text-stone-500">No cohorts yet.</span>}
      </div>
      <label className="block text-xs font-semibold text-stone-400">Only these plan ids (optional, separated by commas)<input value={planIds} onChange={(e) => onPlanIds(e.target.value)} aria-invalid={invalid.length > 0} placeholder="community, personal" className={`${inputClass} mt-1 font-mono text-xs font-normal`} /></label>
    </fieldset>
  );
}

// Finds signed-up learners by name or e-mail and adds the chosen address to the list. Only signed-up users can be on a selected-students coupon.
export function LearnerPicker({ onPick, actionLabel = 'Add' }: { onPick: (email: string) => void; actionLabel?: string }) {
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Array<{ id: string; email: string | null; name: string }> | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  async function search() {
    setBusy(true); setNote(null);
    const r = await adminFetch<{ items: Array<{ id: string; email: string | null; name: string }> }>(`/learners?q=${encodeURIComponent(q.trim())}&limit=10`);
    setBusy(false);
    if (r.ok) { setFound(r.data.items); if (!r.data.items.length) setNote('Nobody found. They must have signed up first.'); } else setNote(r.failure.message);
  }
  return (
    <div className="rounded-lg border border-white/10 p-3">
      <div className="flex gap-2">
        <label className="flex-1 text-xs font-semibold text-stone-400">Find a learner by name or e-mail<input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (q.trim()) void search(); } }} className={`${inputClass} mt-1 font-normal`} /></label>
        <button type="button" disabled={busy || !q.trim()} className={`${ghostButtonClass} self-end`} onClick={() => void search()}>{busy ? 'Searching…' : 'Search'}</button>
      </div>
      {note && <p role="status" className="mt-2 text-xs text-stone-400">{note}</p>}
      {found && found.length > 0 && (
        <ul className="mt-2 divide-y divide-white/5 text-sm">
          {found.map((l) => <li key={l.id} className="flex items-center justify-between gap-2 py-1.5"><span className="min-w-0 truncate">{l.name || '(no name)'} <span className="text-xs text-stone-500">{l.email}</span></span>
            {l.email && <button type="button" className="text-xs font-semibold text-amber-400 hover:text-amber-300" onClick={() => onPick(l.email as string)}>{actionLabel}</button>}</li>)}
        </ul>
      )}
    </div>
  );
}
