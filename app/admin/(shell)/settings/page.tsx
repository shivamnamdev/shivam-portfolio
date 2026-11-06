'use client';
import { useEffect, useState } from 'react';
import { adminFetch, useAdminGet } from '@/components/admin/useAdminApi';
import { ErrorNote, PageHeader, Spinner, StatusBadge, buttonClass, ghostButtonClass, inputClass } from '@/components/admin/ui';
import { SETTING_META, capsProblem, displayValue, parseSetting, type SettingKey } from '@/lib/adminUi/settings';
import { ifMatchHeader, type Failure } from '@/lib/adminUi/client';

type Setting = { key: SettingKey; value: number | string | null; default: number | string | null; source: 'default' | 'custom'; description: string; version: number | null; updatedAt: string | null };

function Row({ meta, setting, all, onSaved }: { meta: (typeof SETTING_META)[number]; setting: Setting; all: Setting[]; onSaved: (s: Setting) => void }) {
  const [text, setText] = useState(setting.value === null ? '' : String(setting.value));
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [done, setDone] = useState(false);
  useEffect(() => { setText(setting.value === null ? '' : String(setting.value)); }, [setting.value, setting.version]);
  const parsed = parseSetting(meta.key, text);
  const unchanged = parsed.ok && parsed.value === setting.value;
  const cap = (k: SettingKey) => Number(all.find((s) => s.key === k)?.value);
  const crossProblem = parsed.ok && typeof parsed.value === 'number' && (meta.key === 'announcement-email-cap' ? capsProblem(parsed.value, cap('daily-email-cap')) : meta.key === 'daily-email-cap' ? capsProblem(cap('announcement-email-cap'), parsed.value) : null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed.ok) return;
    setBusy(true); setFailure(null); setDone(false);
    const r = await adminFetch<Setting>(`/settings/${meta.key}`, { method: 'PUT', body: { value: parsed.value }, headers: setting.version === null ? undefined : ifMatchHeader(setting.version) });
    setBusy(false);
    if (r.ok) { onSaved(r.data); setDone(true); } else setFailure(r.failure);
  }
  return (
    <form onSubmit={save} aria-label={meta.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2"><h2 className="text-sm font-bold text-white">{meta.label}</h2><StatusBadge value={setting.source === 'custom' ? 'published' : 'draft'} /><span className="text-xs text-stone-500">{setting.source === 'custom' ? 'custom value' : 'built-in default'}</span></div>
      <p className="mb-3 text-xs text-stone-500">{meta.hint} Default: {displayValue(setting.default)}.</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[14rem] flex-1 text-xs font-semibold text-stone-400">Value<input value={text} inputMode={meta.kind === 'number' ? 'numeric' : undefined} aria-invalid={!parsed.ok} onChange={(e) => { setText(e.target.value); setDone(false); }} className={`${inputClass} mt-1 font-normal ${parsed.ok ? '' : 'border-red-500'}`} /></label>
        <button type="submit" disabled={busy || !parsed.ok || unchanged || !!crossProblem} className={buttonClass}>{busy ? 'Saving…' : 'Save'}</button>
        {meta.clearable && setting.value !== null && <button type="button" disabled={busy} className={ghostButtonClass} onClick={() => setText('')}>Clear</button>}
        {done && <span role="status" className="text-sm text-emerald-300">Saved</span>}
      </div>
      {!parsed.ok && <p className="mt-2 text-xs text-red-300">{parsed.message}</p>}
      {crossProblem && <p role="alert" className="mt-2 text-xs text-amber-300">{crossProblem}</p>}
      <div className="mt-2"><ErrorNote failure={failure} /></div>
    </form>
  );
}

export default function SettingsPage() {
  const loaded = useAdminGet<{ items: Setting[] }>('/settings');
  const [items, setItems] = useState<Setting[]>([]);
  useEffect(() => { if (loaded.data) setItems(loaded.data.items); }, [loaded.data]);
  if (loaded.loading && !loaded.data) return <Spinner />;
  return (
    <div>
      <PageHeader title="Settings" subtitle="Four site-wide settings. A value you never saved uses the built-in default." />
      <div className="mb-4"><ErrorNote failure={loaded.failure} />{loaded.failure && <button type="button" className={`${ghostButtonClass} mt-2`} onClick={() => void loaded.reload()}>Reload</button>}</div>
      <div className="space-y-4">
        {SETTING_META.map((m) => { const s = items.find((x) => x.key === m.key); return s ? <Row key={m.key} meta={m} setting={s} all={items} onSaved={(n) => setItems((all) => all.map((x) => (x.key === n.key ? n : x)))} /> : null; })}
      </div>
    </div>
  );
}
