'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { dismissKey, formatCountdown, secondsLeft } from '@/lib/catalog/bannerView';

type Placement = 'site-top' | 'courses' | 'course-page' | 'learning' | 'dashboard';
type PageBanner = { slug: string; version: number; message: string; ctaLabel?: string; ctaUrl?: string; style: 'info' | 'urgent' | 'success' | 'warning'; dismissible: boolean; countdownSeconds: number | null };

const STYLE: Record<PageBanner['style'], string> = {
  info: 'border-sky-500/40 bg-sky-500/15 text-sky-100', urgent: 'border-red-500/40 bg-red-500/15 text-red-100',
  success: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100', warning: 'border-amber-500/40 bg-amber-500/15 text-amber-100',
};
const remembered = (b: PageBanner): boolean => { try { return localStorage.getItem(dismissKey(b.slug, b.version)) === '1'; } catch { return false; } };

// The banners the owner published for this placement and this viewer (the server decides who sees what). The message is plain text, shown as text.
export default function Banners({ placement }: { placement: Placement }) {
  const [banners, setBanners] = useState<PageBanner[]>([]);
  const [loadedAt, setLoadedAt] = useState(0);
  const [now, setNow] = useState(0);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const res = await fetch(`/api/banners?placement=${placement}`, { cache: 'no-store' });
        const data = await res.json();
        if (!live || !data.success) return;
        const t = Date.now();
        setLoadedAt(t); setNow(t);
        setHidden(Object.fromEntries((data.banners as PageBanner[]).map((b) => [b.slug, remembered(b)])));
        setBanners(data.banners);
      } catch { /* a banner is never worth an error on the page */ }
    })();
    return () => { live = false; };
  }, [placement]);

  const ticking = banners.some((b) => b.countdownSeconds !== null);
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ticking]);

  const shown = banners.filter((b) => !hidden[b.slug]);
  if (!shown.length) return null;
  const dismiss = (b: PageBanner) => { try { localStorage.setItem(dismissKey(b.slug, b.version), '1'); } catch { /* private mode: it just comes back next time */ } setHidden((h) => ({ ...h, [b.slug]: true })); };
  return (
    <div className={placement === 'site-top' ? 'w-full' : 'mb-6 w-full'} data-testid={`banners-${placement}`}>
      {shown.map((b) => {
        const left = formatCountdown(secondsLeft(b.countdownSeconds, loadedAt, now));
        return (
          <section key={b.slug} aria-label="Announcement" data-testid="site-banner" className={`flex flex-wrap items-center justify-center gap-3 border px-4 py-2.5 text-sm font-semibold ${placement === 'site-top' ? 'border-x-0 border-t-0' : 'rounded-xl'} ${STYLE[b.style]}`}>
            <span>{b.message}{left && <strong data-testid="banner-countdown" className="ml-2 font-mono">{left}</strong>}</span>
            {b.ctaLabel && b.ctaUrl && (b.ctaUrl.startsWith('/')
              ? <Link href={b.ctaUrl} className="rounded-md bg-white/20 px-3 py-1 font-bold hover:bg-white/30">{b.ctaLabel}</Link>
              : <a href={b.ctaUrl} target="_blank" rel="noopener noreferrer" className="rounded-md bg-white/20 px-3 py-1 font-bold hover:bg-white/30">{b.ctaLabel}</a>)}
            {b.dismissible && <button type="button" aria-label={`Dismiss: ${b.message}`} onClick={() => dismiss(b)} className="ml-1 rounded p-0.5 hover:bg-white/20"><X size={16} /></button>}
          </section>
        );
      })}
    </div>
  );
}
