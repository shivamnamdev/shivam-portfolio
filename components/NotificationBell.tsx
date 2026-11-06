'use client';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Bell, Calendar, Code, Sparkles } from 'lucide-react';
import { timeAgo } from '@/lib/adminUi/client';

type Item = { id: string; type: string; title: string; body: string; link: string | null; publishAt: string; read: boolean; dateText?: string };
const READ_COUNT_KEY = 'shivam_academy_read_count';   // only used with the old hand-written list (source "files")

const iconFor = (type: string) => {
  switch (type) {
    case 'feature': case 'marketing': return <Sparkles size={16} className="text-purple-400" />;
    case 'event': case 'reminder': return <Calendar size={16} className="text-blue-400" />;
    case 'submission': case 'progress': return <Code size={16} className="text-green-400" />;
    case 'enrollment': case 'transactional': return <Sparkles size={16} className="text-amber-400" />;
    default: return <AlertCircle size={16} className="text-stone-400" />;
  }
};
const tint = (type: string) => (['feature', 'marketing'].includes(type) ? 'bg-purple-500/20' : ['event', 'reminder'].includes(type) ? 'bg-blue-500/20' : 'bg-amber-500/20');

// The bell in the navigation: the learner's notifications from the server, each with its own read state (or the old list with a count kept in the browser).
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [source, setSource] = useState<'files' | 'database'>('files');
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outside = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, []);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const res = await fetch('/api/learning/notifications', { cache: 'no-store' });
        const data = await res.json();
        if (!live) return;
        if (data.success) {
          setItems(data.items); setSource(data.source);
          setUnread(data.source === 'files' ? Math.max(0, data.items.length - parseInt(localStorage.getItem(READ_COUNT_KEY) || '0')) : data.unread);
        }
      } catch { /* the bell simply stays empty */ }
      if (live) setMounted(true);
    })();
    return () => { live = false; };
  }, []);

  async function markRead(ids?: string[]) {
    if (source === 'files') { localStorage.setItem(READ_COUNT_KEY, String(items.length)); setUnread(0); return; }
    try {
      const res = await fetch('/api/learning/notifications/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ids ? { ids } : {}) });
      const data = await res.json();
      if (!data.success) return;
      setItems((all) => all.map((i) => (!ids || ids.includes(i.id) ? { ...i, read: true } : i)));
      setUnread(data.unread);
    } catch { /* it will show as unread until the next try */ }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} aria-label="Notifications" className="relative p-2 text-stone-400 hover:text-amber-500 hover:bg-white/10 rounded-full transition-all">
        <Bell size={20} />
        {mounted && unread > 0 && <span data-testid="bell-dot" className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-[#0a0a0a] rounded-full"></span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
            className="absolute right-0 mt-3 w-[300px] md:w-80 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50 origin-top-right"
          >
            <div className="bg-[#0a0a0a] border-b border-white/5 px-5 py-3 flex justify-between items-center">
              <h3 className="font-bold text-white">Notifications</h3>
              <span data-testid="bell-count" className="text-xs font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">{mounted ? unread : 0} New</span>
            </div>
            <div className="max-h-[350px] overflow-y-auto">
              {items.length === 0 && <p className="p-5 text-sm text-stone-400">You are all caught up.</p>}
              {items.map((n) => (
                <Link key={n.id} href={n.link || '#'} data-testid="bell-item" data-read={n.read ? 'true' : 'false'} onClick={() => { setOpen(false); if (source === 'database' && !n.read) void markRead([n.id]); }} className={`block p-5 border-b border-white/5 hover:bg-white/5 transition-colors ${source === 'database' && n.read ? 'opacity-60' : ''}`}>
                  <div className="flex gap-3 items-start">
                    <div className={`mt-0.5 p-2 rounded-full flex-shrink-0 ${tint(n.type)}`}>{iconFor(n.type)}</div>
                    <div>
                      <h4 className="text-sm font-bold text-white leading-tight mb-1">{n.title}</h4>
                      <p className="text-xs text-stone-400 mb-2 leading-relaxed whitespace-pre-line">{n.body}</p>
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">{n.dateText ?? timeAgo(n.publishAt, new Date())}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="p-3 bg-[#0a0a0a] border-t border-white/5 text-center">
              <button onClick={() => { void markRead(); setOpen(false); }} className="text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors">Mark all as read</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
