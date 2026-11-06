'use client';
import { inputClass } from '@/components/admin/ui';
import { AUDIENCE_KINDS, AUDIENCE_LABEL, PLACEMENTS, PLACEMENT_LABEL, PURPOSES, STYLES, countdownText, type BannerForm } from '@/lib/adminUi/engagement';

const label = 'text-xs font-semibold text-stone-400';
const STYLE_CLASS: Record<(typeof STYLES)[number], string> = {
  info: 'border-sky-500/40 bg-sky-500/15 text-sky-100', urgent: 'border-red-500/40 bg-red-500/15 text-red-100',
  success: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100', warning: 'border-amber-500/40 bg-amber-500/15 text-amber-100',
};

// A look-alike of the banner as learners will see it (colours and layout are the admin's own; the learner portal draws the real one in phase 5).
export function BannerPreview({ form, now }: { form: BannerForm; now: Date }) {
  const countdown = countdownText(form.countdownTo ? new Date(form.countdownTo).toISOString() : undefined, now);
  return (
    <div data-testid="banner-preview" className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${STYLE_CLASS[form.style]}`}>
      <span>{form.message.trim() || 'Your message appears here'}{countdown && <strong className="ml-2">{countdown}</strong>}</span>
      <span className="flex items-center gap-2">
        {form.ctaLabel.trim() && <span className="rounded-md bg-white/20 px-3 py-1 font-semibold">{form.ctaLabel.trim()}</span>}
        {form.dismissible && <span aria-hidden="true" className="text-lg leading-none">×</span>}
      </span>
    </div>
  );
}

export function BannerFields({ form, onChange, creating, cohorts }: { form: BannerForm; onChange: (f: BannerForm) => void; creating: boolean; cohorts: Array<{ slug: string; title: string }> }) {
  const set = <K extends keyof BannerForm>(k: K, v: BannerForm[K]) => onChange({ ...form, [k]: v });
  return (
    <div className="space-y-4">
      {creating && <label className={`block max-w-md ${label}`}>Slug (the banner's name; cannot be changed later)<input value={form.slug} maxLength={100} onChange={(e) => set('slug', e.target.value)} className={`${inputClass} mt-1 font-mono font-normal`} /></label>}
      <label className={`block ${label}`}>Message (one line of plain text, up to 280 characters)<input value={form.message} maxLength={300} onChange={(e) => set('message', e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>
      <div className="grid gap-3 md:grid-cols-3">
        <label className={label}>Purpose<select value={form.purpose} onChange={(e) => set('purpose', e.target.value as BannerForm['purpose'])} className={`${inputClass} mt-1 font-normal`}>{PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
        <label className={label}>Where it shows<select value={form.placement} onChange={(e) => set('placement', e.target.value as BannerForm['placement'])} className={`${inputClass} mt-1 font-normal`}>{PLACEMENTS.map((p) => <option key={p} value={p}>{PLACEMENT_LABEL[p]}</option>)}</select></label>
        <label className={label}>Colour<select value={form.style} onChange={(e) => set('style', e.target.value as BannerForm['style'])} className={`${inputClass} mt-1 font-normal`}>{STYLES.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className={label}>Button label (optional)<input value={form.ctaLabel} maxLength={50} onChange={(e) => set('ctaLabel', e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>
        <label className={label}>Button link (https, or a path such as /courses)<input value={form.ctaUrl} maxLength={500} onChange={(e) => set('ctaUrl', e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className={label}>Who sees it
          <select value={form.audienceKind} onChange={(e) => onChange({ ...form, audienceKind: e.target.value as BannerForm['audienceKind'], audienceValue: '' })} className={`${inputClass} mt-1 font-normal`}>
            {AUDIENCE_KINDS.map((k) => <option key={k} value={k}>{AUDIENCE_LABEL[k]}</option>)}</select></label>
        {form.audienceKind === 'cohort' && (
          <label className={label}>Cohort<select value={form.audienceValue} onChange={(e) => set('audienceValue', e.target.value)} className={`${inputClass} mt-1 font-normal`}>
            <option value="">Choose a cohort</option>{cohorts.map((c) => <option key={c.slug} value={c.slug}>{c.title} ({c.slug})</option>)}</select></label>
        )}
        {form.audienceKind === 'plan' && <label className={label}>Plan id<input value={form.audienceValue} maxLength={100} onChange={(e) => set('audienceValue', e.target.value)} className={`${inputClass} mt-1 font-mono font-normal`} /></label>}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <label className={label}>Starts (optional)<input type="datetime-local" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>
        <label className={label}>Ends (optional)<input type="datetime-local" value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>
        <label className={label}>Countdown to (optional)<input type="datetime-local" value={form.countdownTo} onChange={(e) => set('countdownTo', e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>
      </div>
      <div className="flex flex-wrap items-end gap-6">
        <label className={`${label} max-w-[10rem]`}>Priority (0 to 100)<input inputMode="numeric" value={form.priority} onChange={(e) => set('priority', e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>
        <label className="flex items-center gap-2 text-sm text-stone-300"><input type="checkbox" checked={form.dismissible} onChange={(e) => set('dismissible', e.target.checked)} /> Visitors can dismiss it</label>
        <label className="flex items-center gap-2 text-sm text-stone-300"><input type="checkbox" checked={form.allowMultiple} onChange={(e) => set('allowMultiple', e.target.checked)} /> May show together with other banners</label>
      </div>
    </div>
  );
}
