'use client';
import { useEffect, useRef } from 'react';
import { failureText, fieldErrorLines, type Failure } from '@/lib/adminUi/client';

// Small shared parts of the admin screens. Plain Tailwind (dark theme); no business rules live here.

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="font-display text-2xl font-bold text-white">{title}</h1>{subtitle && <p className="mt-1 text-sm text-stone-400">{subtitle}</p>}</div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

const BADGE: Record<string, string> = {
  draft: 'bg-stone-500/20 text-stone-300', published: 'bg-emerald-500/20 text-emerald-300', archived: 'bg-stone-700/40 text-stone-400',
  unused: 'bg-emerald-500/20 text-emerald-300', reserved: 'bg-sky-500/20 text-sky-300', redeemed: 'bg-purple-500/20 text-purple-300', expired: 'bg-red-500/20 text-red-300', voided: 'bg-stone-700/40 text-stone-400', inactive: 'bg-stone-700/40 text-stone-400', everyone: 'bg-sky-500/20 text-sky-300', selected: 'bg-purple-500/20 text-purple-300', 'single-use': 'bg-amber-500/20 text-amber-300',
  admin: 'bg-amber-500/20 text-amber-300', staff: 'bg-sky-500/20 text-sky-300', active: 'bg-emerald-500/20 text-emerald-300', revoked: 'bg-red-500/20 text-red-300',
};
export function StatusBadge({ value }: { value: string }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[value] ?? 'bg-stone-500/20 text-stone-300'}`}>{value}</span>;
}

// Shows what the server said: the message, then one line per field. role=alert so a screen reader announces it.
export function ErrorNote({ failure }: { failure: Failure | null }) {
  if (!failure) return null;
  const lines = fieldErrorLines(failure);
  return (
    <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
      <p className="font-semibold">{failureText(failure)}</p>
      {lines.length > 0 && <ul className="mt-1 list-disc pl-5">{lines.map((l) => <li key={l}>{l}</li>)}</ul>}
    </div>
  );
}

export const Spinner = ({ label = 'Loading' }: { label?: string }) => <p role="status" className="py-6 text-center text-sm text-stone-400">{label}…</p>;

export type Column<T> = { header: string; cell: (row: T) => React.ReactNode; className?: string };
export function DataTable<T>({ columns, rows, rowKey, empty }: { columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string; empty: string }) {
  if (!rows.length) return <p className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-stone-400">{empty}</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/5 text-xs uppercase tracking-wide text-stone-400"><tr>{columns.map((c) => <th key={c.header} scope="col" className="px-4 py-3 font-semibold">{c.header}</th>)}</tr></thead>
        <tbody className="divide-y divide-white/5">{rows.map((r) => <tr key={rowKey(r)} className="hover:bg-white/[0.03]">{columns.map((c) => <td key={c.header} className={`px-4 py-3 align-top ${c.className ?? ''}`}>{c.cell(r)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

// A confirmation that names the thing being changed. Escape and the Cancel button close it; focus goes to Cancel first so Enter never confirms by accident.
export function ConfirmDialog({ title, body, confirmLabel, danger, busy, onConfirm, onCancel }: { title: string; body: React.ReactNode; confirmLabel: string; danger?: boolean; busy?: boolean; onConfirm: () => void; onCancel: () => void }) {
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancel.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onCancel]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111] p-6 shadow-2xl">
        <h2 id="confirm-title" className="text-lg font-bold text-white">{title}</h2>
        <div className="mt-2 text-sm text-stone-300">{body}</div>
        <div className="mt-6 flex justify-end gap-2">
          <button ref={cancel} type="button" onClick={onCancel} className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-stone-200 hover:bg-white/10">Cancel</button>
          <button type="button" disabled={busy} onClick={onConfirm} className={`rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50 ${danger ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-amber-500 text-black hover:bg-amber-400'}`}>{busy ? 'Working…' : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export const inputClass = 'w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-stone-500 focus:border-amber-500 focus:outline-none';
export const buttonClass = 'rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-black hover:bg-amber-400 disabled:opacity-50';
export const ghostButtonClass = 'rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-stone-200 hover:bg-white/10 disabled:opacity-50';
