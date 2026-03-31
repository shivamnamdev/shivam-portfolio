'use client';
import { useRef, useState } from 'react';

const SpotlightCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const[position, setPosition] = useState({ x: 0, y: 0 });
  const[opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div ref={divRef} onMouseMove={handleMouseMove} onMouseEnter={() => setOpacity(1)} onMouseLeave={() => setOpacity(0)} className={`relative overflow-hidden rounded-3xl glass-panel p-8 transition-all duration-300 hover:-translate-y-1 ${className}`}>
      <div className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 z-0" style={{ opacity, background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(59,130,246,0.15), transparent 40%)` }} />
      <div className="relative z-10 h-full flex flex-col justify-center">{children}</div>
    </div>
  );
};

export default function Impact() {
  return (
    <section className="w-full relative scroll-mt-32" id="impact">
      <div className="flex flex-col mb-12">
        <h3 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-500 mb-4 tracking-tight">
          Measurable Excellence
        </h3>
        <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">
          Automation isn't just about writing scripts; it's about exponential time savings, bulletproof reliability, and empowering teams.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(200px,auto)]">
        <SpotlightCard className="md:col-span-2 md:row-span-2 group">
          <div className="flex justify-between items-start mb-8">
            <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/5 rounded-xl border border-blue-500/20">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <span className="text-xs font-bold tracking-widest text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">AGENTIC AI</span>
          </div>
          <h4 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500 mb-4 group-hover:scale-[1.02] transition-transform origin-left">30%</h4>
          <p className="text-xl text-slate-300 font-medium leading-relaxed">
            Cut automation development time drastically by driving the adoption of GitHub Copilot and Agentic AI-assisted coding.
          </p>
        </SpotlightCard>

        <SpotlightCard className="md:col-span-1 md:row-span-1 group">
          <h4 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-blue-400 to-blue-600 mb-3 group-hover:from-white group-hover:to-slate-300 transition-all">40%</h4>
          <p className="text-slate-400 text-sm leading-relaxed">Reduction in manual testing effort via highly modular Python + Pytest automation frameworks.</p>
        </SpotlightCard>

        <SpotlightCard className="md:col-span-1 md:row-span-1 group">
          <h4 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-blue-400 to-blue-600 mb-3 group-hover:from-white group-hover:to-slate-300 transition-all">&gt;85%</h4>
          <p className="text-slate-400 text-sm leading-relaxed">API and UI automation coverage achieved by championing industry best practices.</p>
        </SpotlightCard>

        <SpotlightCard className="md:col-span-3 md:row-span-1">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
              <h4 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-3">50% Speed Boost</h4>
              <p className="text-slate-400 text-base max-w-2xl leading-relaxed">
                Improved regression testing speeds by implementing highly concurrent, parallel test execution pipelines integrated directly into CI/CD.
              </p>
            </div>
            <div className="flex -space-x-4 pr-4">
              <div className="w-14 h-14 rounded-full border-2 border-slate-900 bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg flex items-center justify-center animate-pulse"><span className="text-sm font-bold text-white">CI</span></div>
              <div className="w-14 h-14 rounded-full border-2 border-slate-900 bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg flex items-center justify-center animate-pulse delay-75"><span className="text-sm font-bold text-white">CD</span></div>
              <div className="w-14 h-14 rounded-full border-2 border-slate-900 bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg flex items-center justify-center animate-pulse delay-150"><span className="text-sm font-bold text-white">QA</span></div>
            </div>
          </div>
        </SpotlightCard>
      </div>
    </section>
  );
}