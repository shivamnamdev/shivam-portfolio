'use client';
import { useState } from 'react';
import { useAdminGet } from '@/components/admin/useAdminApi';
import { DataTable, ErrorNote, PageHeader, Spinner, inputClass } from '@/components/admin/ui';
import { SIGNUP_WINDOWS, barWidths } from '@/lib/adminUi/people';

type Rows<T> = { rows: T[]; total: number; truncated: boolean; generatedAt: string };
const Bar = ({ pct }: { pct: number }) => <div className="h-2 w-full rounded bg-white/10"><div className="h-2 rounded bg-amber-500" style={{ width: `${pct}%` }} /></div>;
const Card = ({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) => <section className="mb-8 rounded-xl border border-white/10 bg-white/[0.03] p-4"><h2 className="text-sm font-bold text-white">{title}</h2>{note && <p className="mb-3 text-xs text-stone-500">{note}</p>}{children}</section>;

function PerCohort() {
  const r = useAdminGet<Rows<{ cohortSlug: string; enrolments: number }>>('/reports/enrolments-per-cohort');
  const bars = barWidths((r.data?.rows ?? []).map((x) => x.enrolments));
  return (
    <Card title="Enrolments per cohort" note="Counts only; no person appears here.">
      <ErrorNote failure={r.failure} />
      {r.loading && !r.data ? <Spinner /> : <>
        <DataTable rows={(r.data?.rows ?? []).map((x, i) => ({ ...x, pct: bars[i] }))} rowKey={(x) => x.cohortSlug} empty="No enrolments yet."
          columns={[{ header: 'Cohort', cell: (x) => <span className="font-mono text-xs">{x.cohortSlug}</span> }, { header: 'Enrolments', cell: (x) => x.enrolments }, { header: '', className: 'w-1/3', cell: (x) => <Bar pct={x.pct} /> }]} />
        {r.data && <p className="mt-2 text-xs text-stone-500">Total {r.data.total}{r.data.truncated ? ' (cut at 20,000 rows)' : ''}.</p>}
      </>}
    </Card>
  );
}
function Signups() {
  const [days, setDays] = useState<number>(30);
  const r = useAdminGet<Rows<{ date: string; count: number }>>(`/reports/signups-per-day?days=${days}`);
  const rows = r.data?.rows ?? [];
  const bars = barWidths(rows.map((x) => x.count));
  return (
    <Card title="New sign-ups per day" note="Days are UTC. Taken from the sign-in provider; at most the newest 2,500 people are counted.">
      <label className="mb-3 block max-w-[10rem] text-xs font-semibold text-stone-400">Window<select value={days} onChange={(e) => setDays(Number(e.target.value))} className={`${inputClass} mt-1 font-normal`}>{SIGNUP_WINDOWS.map((d) => <option key={d} value={d}>Last {d} days</option>)}</select></label>
      <ErrorNote failure={r.failure} />
      {r.loading && !r.data ? <Spinner /> : <>
        <div data-testid="signup-bars" className="flex h-24 items-end gap-px" role="img" aria-label={`Sign-ups per day, last ${days} days, ${r.data?.total ?? 0} in total`}>
          {rows.map((x, i) => <div key={x.date} title={`${x.date}: ${x.count}`} className="flex-1 rounded-t bg-amber-500/80" style={{ height: `${Math.max(bars[i], x.count ? 3 : 1)}%`, opacity: x.count ? 1 : 0.25 }} />)}
        </div>
        {r.data && <p className="mt-2 text-xs text-stone-500">{r.data.total} sign-up(s) in {days} days{r.data.truncated ? '; the list was cut, so older days may be low' : ''}.</p>}
      </>}
    </Card>
  );
}
function Coupons() {
  const r = useAdminGet<Rows<{ code: string; kind: string; redemptions: number; maxRedemptions: number | null; active: boolean; expiresAt: string; expired: boolean }>>('/reports/coupon-usage');
  return (
    <Card title="Coupon usage" note="How often each coupon was used, most used first.">
      <ErrorNote failure={r.failure} />
      {r.loading && !r.data ? <Spinner /> : <>
        <DataTable rows={r.data?.rows ?? []} rowKey={(x) => x.code} empty="No coupons yet."
          columns={[{ header: 'Code', cell: (x) => <span className="font-mono text-xs">{x.code}</span> }, { header: 'Kind', cell: (x) => x.kind }, { header: 'Used', cell: (x) => (x.maxRedemptions ? `${x.redemptions} of ${x.maxRedemptions}` : String(x.redemptions)) },
            { header: 'State', cell: (x) => (x.expired ? 'expired' : x.active ? 'active' : 'inactive') }, { header: 'Expires', cell: (x) => x.expiresAt.slice(0, 10) }]} />
        {r.data && <p className="mt-2 text-xs text-stone-500">{r.data.total} use(s) in total{r.data.truncated ? ' (first 1,000 coupons)' : ''}.</p>}
      </>}
    </Card>
  );
}

export default function ReportsPage() {
  return (
    <div>
      <PageHeader title="Reports" subtitle="Counts only. Names and e-mail addresses are never part of a report; the CSV downloads are on the Enrolments page." />
      <PerCohort /><Signups /><Coupons />
    </div>
  );
}
