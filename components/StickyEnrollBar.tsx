'use client';
import { useEffect, useState } from 'react';

// Mobile-only bottom bar that keeps the enroll action one tap away. Hidden while the hero
// or the enrollment section itself is on screen, so it never duplicates a visible CTA.
export default function StickyEnrollBar({ targetId, priceLabel, ctaLabel = 'Enroll Now' }: { targetId: string; priceLabel?: string; ctaLabel?: string }) {
  const [heroVisible, setHeroVisible] = useState(true);
  const [targetVisible, setTargetVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById('hero');
    const target = document.getElementById(targetId);
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === hero) setHeroVisible(entry.isIntersecting);
        if (entry.target === target) setTargetVisible(entry.isIntersecting);
      }
    });
    if (hero) observer.observe(hero);
    if (target) observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  if (heroVisible || targetVisible) return null;

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-[#0a0a0a]/95 backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
      {priceLabel && <p className="text-sm text-stone-300"><span className="block text-[10px] uppercase tracking-widest text-stone-500 font-bold">Starting at</span><span className="font-black text-white text-lg">{priceLabel}</span></p>}
      <button onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' })} className="flex-1 max-w-[60%] py-3 rounded-full bg-amber-500 text-black font-black">
        {ctaLabel}
      </button>
    </div>
  );
}
