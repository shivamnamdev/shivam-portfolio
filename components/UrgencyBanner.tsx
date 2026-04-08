'use client';
import { useState, useEffect } from 'react';
import { Timer, ArrowRight } from 'lucide-react';

export default function UrgencyBanner() {
  const [timeLeft, setTimeLeft] = useState({ hours: 47, minutes: 59, seconds: 59 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  },[]);

  return (
    <div className="w-full bg-amber-500 text-stone-900 py-2.5 px-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 z-50 relative shadow-md">
      <div className="flex items-center gap-2 font-bold text-sm">
        <Timer size={18} className="animate-pulse" />
        <span>EARLY BIRD OFFER ENDS IN:</span>
      </div>
      <div className="flex items-center gap-2 font-black font-mono text-lg">
        <span className="bg-white/30 px-2 py-0.5 rounded">{String(timeLeft.hours).padStart(2, '0')}</span> :
        <span className="bg-white/30 px-2 py-0.5 rounded">{String(timeLeft.minutes).padStart(2, '0')}</span> :
        <span className="bg-white/30 px-2 py-0.5 rounded">{String(timeLeft.seconds).padStart(2, '0')}</span>
      </div>
      <button 
        onClick={() => document.getElementById('live-sessions')?.scrollIntoView({ behavior: 'smooth' })}
        className="hidden md:flex items-center gap-1 text-sm font-bold bg-stone-900 text-white px-4 py-1 rounded-full hover:bg-stone-800 transition-colors"
      >
        Claim ₹599 Pricing <ArrowRight size={14} />
      </button>
    </div>
  );
}