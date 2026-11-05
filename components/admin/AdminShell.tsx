'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, ShieldAlert, ArrowLeftRight } from 'lucide-react';
import { NAV, NAV_GROUPS, isActive } from '@/lib/adminUi/nav';

// The admin chrome: sidebar (collapsible on phones), the portal toggle and who is signed in. Rendered only inside the server-guarded layout,
// so it is never sent to anyone who is not the admin. Entries for later slices are shown but disabled, so the whole map is visible.
export default function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const [open, setOpen] = useState(false);
  const nav = (
    <nav aria-label="Admin sections" className="flex flex-col gap-5">
      {NAV_GROUPS.map((group) => (
        <div key={group}>
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-stone-500">{group}</p>
          <ul className="flex flex-col gap-0.5">
            {NAV.filter((n) => n.group === group).map((n) => {
              const active = isActive(pathname, n.href);
              if (!n.ready) return <li key={n.href}><span aria-disabled="true" title={`Coming in slice ${n.slice}`} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-stone-600 cursor-not-allowed">{n.label}<span className="text-[10px] font-mono">{n.slice}</span></span></li>;
              return (
                <li key={n.href}>
                  <Link href={n.href} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined} {...(n.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                    className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? 'bg-amber-500/15 text-amber-400' : 'text-stone-300 hover:bg-white/5 hover:text-white'}`}>{n.label}</Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-stone-200 md:flex">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 md:hidden">
        <span className="flex items-center gap-2 font-bold text-white"><ShieldAlert size={18} className="text-amber-500" />Admin</span>
        <button type="button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)} className="rounded-lg p-2 text-stone-300 hover:bg-white/10">{open ? <X size={20} /> : <Menu size={20} />}</button>
      </header>
      <aside className={`${open ? 'block' : 'hidden'} border-b border-white/10 p-4 md:sticky md:top-0 md:block md:h-screen md:w-64 md:shrink-0 md:overflow-y-auto md:border-b-0 md:border-r`}>
        <div className="mb-6 hidden items-center gap-2 px-3 md:flex"><ShieldAlert size={20} className="text-amber-500" /><span className="font-display text-lg font-bold text-white">Admin portal</span></div>
        {nav}
        <div className="mt-6 border-t border-white/10 pt-4">
          <Link href="/learning" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-stone-300 hover:bg-white/5 hover:text-white"><ArrowLeftRight size={14} />Switch to learner portal</Link>
          <p className="mt-3 break-all px-3 text-[11px] text-stone-500">Signed in as {email}</p>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
