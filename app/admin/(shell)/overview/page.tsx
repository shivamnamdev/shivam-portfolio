'use client';
import Link from 'next/link';
import { useAdminGet } from '@/components/admin/useAdminApi';
import { DataTable, ErrorNote, PageHeader, Spinner } from '@/components/admin/ui';
import { timeAgo } from '@/lib/adminUi/client';

type Report<R> = { rows: R[]; total: number; truncated: boolean };
type AuditItem = { id: number; at: string; actor: string; action: string; resource: string; resourceId: string };

function Card({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-white">{value}</p>
      {note && <p className="mt-1 text-xs text-stone-500">{note}</p>}
    </div>
  );
}

// Counts only (the reports API never returns a person) plus the latest changes. Each card loads on its own, so one failing report does not blank the page.
export default function OverviewPage() {
  const cohorts = useAdminGet<Report<{ cohortSlug: string; enrolments: number }>>('/reports/enrolments-per-cohort');
  const signups = useAdminGet<Report<{ date: string; count: number }>>('/reports/signups-per-day?days=7');
  const coupons = useAdminGet<Report<{ code: string; redemptions: number }>>('/reports/coupon-usage');
  const audit = useAdminGet<{ items: AuditItem[] }>('/audit?limit=8');
  const now = new Date();
  return (
    <div>
      <PageHeader title="Overview" subtitle="What is happening across the academy. Counts only; no learner details are shown here." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card label="Enrolments" value={cohorts.data?.total ?? '…'} note={cohorts.data?.truncated ? 'Counted up to a safe limit' : undefined} />
        <Card label="Cohorts with learners" value={cohorts.data?.rows.length ?? '…'} />
        <Card label="New sign-ups, 7 days" value={signups.data?.total ?? '…'} note={signups.data?.truncated ? 'Counted up to a safe limit' : undefined} />
        <Card label="Coupon redemptions" value={coupons.data?.total ?? '…'} />
      </div>
      <div className="mt-4 space-y-2">{[cohorts, signups, coupons, audit].map((r, i) => <ErrorNote key={i} failure={r.failure} />)}</div>

      <section className="mt-8" aria-labelledby="by-cohort">
        <h2 id="by-cohort" className="mb-3 text-lg font-bold text-white">Enrolments per cohort</h2>
        {cohorts.loading && !cohorts.data ? <Spinner /> : (
          <DataTable rows={cohorts.data?.rows ?? []} rowKey={(r) => r.cohortSlug} empty="No enrolments yet."
            columns={[{ header: 'Cohort', cell: (r) => <span className="font-mono text-xs">{r.cohortSlug}</span> }, { header: 'Enrolments', cell: (r) => r.enrolments, className: 'text-right' }]} />
        )}
      </section>

      <section className="mt-8" aria-labelledby="recent">
        <div className="mb-3 flex items-center justify-between"><h2 id="recent" className="text-lg font-bold text-white">Latest changes</h2><Link href="/admin/audit" className="text-sm font-semibold text-amber-400 hover:text-amber-300">Open the audit log</Link></div>
        {audit.loading && !audit.data ? <Spinner /> : (
          <DataTable rows={audit.data?.items ?? []} rowKey={(r) => String(r.id)} empty="Nothing has been changed through the admin API yet."
            columns={[
              { header: 'When', cell: (r) => <span title={r.at}>{timeAgo(r.at, now)}</span> },
              { header: 'Who', cell: (r) => <span className="break-all text-xs">{r.actor}</span> },
              { header: 'What', cell: (r) => `${r.action} ${r.resource}` },
              { header: 'Item', cell: (r) => <span className="break-all font-mono text-xs">{r.resourceId}</span> },
            ]} />
        )}
      </section>
    </div>
  );
}
