'use client';
import { useId, useState } from 'react';
import { ghostButtonClass, inputClass } from './ui';
import { emptyPlan, parseMoney, pricingHints, type Plan, type Price, type Pricing } from '@/lib/adminUi/forms';

// A money box keeps what is being typed as text, and only reports a value when it is a valid number (empty = not set).
function Money({ label, value, onChange, optional }: { label: string; value: number | undefined; onChange: (v: number | undefined) => void; optional?: boolean }) {
  const [text, setText] = useState(value === undefined ? '' : String(value));
  const errorId = useId();
  const parsed = parseMoney(text);
  return (
    <div>
      <label className="text-xs font-semibold text-stone-400">{label}
        <input inputMode="decimal" value={text} aria-invalid={parsed === null} aria-describedby={parsed === null ? errorId : undefined} placeholder={optional ? 'not set' : '0'}
          onChange={(e) => { setText(e.target.value); const p = parseMoney(e.target.value); if (p === null) return; onChange(p); }}
          className={`${inputClass} mt-1 font-normal ${parsed === null ? 'border-red-500' : ''}`} />
      </label>
      {parsed === null && <p id={errorId} className="mt-1 text-[11px] text-red-400">Use a number such as 1999 or 19.99</p>}
    </div>
  );
}
const priceOf = (amount: number | undefined, original: number | undefined): Price => ({ amount: amount ?? 0, ...(original !== undefined ? { original } : {}) });

// Single price (INR, optional USD) or plans (up to 6, INR). Hints mirror the server's rules; the server has the last word when you save.
export default function PricingEditor({ value, onChange }: { value: Pricing; onChange: (p: Pricing) => void }) {
  const hints = pricingHints(value);
  const setPlan = (i: number, patch: Partial<Plan>) => { if (value.kind === 'plans') onChange({ ...value, plans: value.plans.map((p, j) => (j === i ? { ...p, ...patch } : p)) }); };
  return (
    <fieldset className="rounded-xl border border-white/10 p-4">
      <legend className="px-2 text-sm font-bold text-white">Pricing</legend>
      <div role="radiogroup" aria-label="Price model" className="mb-4 flex gap-4 text-sm">
        {(['single', 'plans'] as const).map((k) => (
          <label key={k} className="flex items-center gap-2"><input type="radio" name="price-model" checked={value.kind === k}
            onChange={() => onChange(k === 'single' ? { kind: 'single', inr: { amount: 0 } } : { kind: 'plans', currency: 'INR', plans: [emptyPlan(1)] })} />{k === 'single' ? 'One price' : 'Plans'}</label>
        ))}
      </div>
      {value.kind === 'single' ? (
        <div className="grid gap-3 sm:grid-cols-4">
          <Money label="Price (INR)" value={value.inr.amount} onChange={(v) => onChange({ ...value, inr: priceOf(v, value.inr.original) })} />
          <Money optional label="Original (INR)" value={value.inr.original} onChange={(v) => onChange({ ...value, inr: priceOf(value.inr.amount, v) })} />
          <Money optional label="Price (USD)" value={value.usd?.amount} onChange={(v) => onChange({ ...value, usd: v === undefined ? undefined : priceOf(v, value.usd?.original) })} />
          <Money optional label="Original (USD)" value={value.usd?.original} onChange={(v) => onChange({ ...value, usd: value.usd ? priceOf(value.usd.amount, v) : undefined })} />
        </div>
      ) : (
        <div className="space-y-4">
          {value.plans.map((p, i) => (
            <div key={i} className="rounded-lg border border-white/10 p-3">
              <div className="grid gap-3 sm:grid-cols-4">
                <label className="text-xs font-semibold text-stone-400">Plan id<input value={p.id} onChange={(e) => setPlan(i, { id: e.target.value })} className={`${inputClass} mt-1 font-mono font-normal`} /></label>
                <label className="text-xs font-semibold text-stone-400">Name<input value={p.name} maxLength={60} onChange={(e) => setPlan(i, { name: e.target.value })} className={`${inputClass} mt-1 font-normal`} /></label>
                <Money label="Price (INR)" value={p.price.amount} onChange={(v) => setPlan(i, { price: priceOf(v, p.price.original) })} />
                <Money optional label="Original (INR)" value={p.price.original} onChange={(v) => setPlan(i, { price: priceOf(p.price.amount, v) })} />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-stone-400">Subtitle<input value={p.subtitle ?? ''} maxLength={200} onChange={(e) => setPlan(i, { subtitle: e.target.value || undefined })} className={`${inputClass} mt-1 font-normal`} /></label>
                <label className="text-xs font-semibold text-stone-400">Features (one per line, up to 12)
                  <textarea rows={3} value={p.features.join('\n')} onChange={(e) => setPlan(i, { features: e.target.value.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 12) })} className={`${inputClass} mt-1 font-normal`} /></label>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-stone-300"><input type="checkbox" checked={!!p.popular} onChange={(e) => setPlan(i, { popular: e.target.checked || undefined })} />Mark as most popular</label>
                {value.plans.length > 1 && <button type="button" className="text-xs font-semibold text-red-400 hover:text-red-300" onClick={() => onChange({ ...value, plans: value.plans.filter((_, j) => j !== i) })}>Remove plan</button>}
              </div>
            </div>
          ))}
          {value.plans.length < 6 && <button type="button" className={ghostButtonClass} onClick={() => onChange({ ...value, plans: [...value.plans, emptyPlan(value.plans.length + 1)] })}>Add a plan</button>}
        </div>
      )}
      {hints.length > 0 && <ul role="alert" className="mt-4 list-disc rounded-lg bg-amber-500/10 p-3 pl-7 text-xs text-amber-200">{hints.map((h) => <li key={h}>{h}</li>)}</ul>}
      <p className="mt-3 text-xs text-stone-500">An amount of zero makes the course free. Any other amount must be at least 1 in its currency.</p>
    </fieldset>
  );
}
