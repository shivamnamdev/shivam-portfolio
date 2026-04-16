'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { CheckCircle2, ChevronDown, Phone, Gift, Calendar, Code2, Download } from 'lucide-react';
import { activeCourses } from '@/data/courses';

export default function ActiveCohorts() {
  const [openModule, setOpenModule] = useState<number | null>(0);
  if (!activeCourses || activeCourses.length === 0) return null;

  return (
    <section className="w-full relative z-10 py-12" id="live-sessions">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-4">Live Cohorts & Sessions</h2>
        <p className="text-slate-400">Join the live interactive sessions and transform your skills.</p>
      </div>

      <div className="flex flex-col gap-12 max-w-6xl mx-auto">
        {activeCourses.map((course) => (
          <div key={course.id} className="glass-panel rounded-3xl p-6 md:p-10 border border-white/10 shadow-[0_0_30px_rgba(245,158,11,0.1)] grid grid-cols-1 lg:grid-cols-2 gap-12 relative overflow-hidden">
            <div className="flex flex-col relative z-10">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="px-4 py-1 bg-red-500/20 border border-red-500/50 text-red-400 font-bold rounded-full text-sm animate-pulse shadow-md">{course.statusText}</span>
                <span className="px-4 py-1 bg-amber-500/20 border border-amber-500/50 text-amber-400 font-bold rounded-full text-sm shadow-md">{course.demoOffer}</span>
              </div>
              <h3 className="text-3xl md:text-4xl font-black text-white mb-4">{course.title}</h3>
              <div className="flex items-center gap-2 text-slate-400 font-medium mb-6">
                <Calendar size={18} className="text-amber-500" /><span>{course.duration}</span>
              </div>
              <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-sm mb-6">
                <div className="flex items-end gap-3 mb-2">
                  <span className="text-5xl font-black text-white">{course.pricing?.currentPrice}</span>
                  <span className="text-xl text-slate-500 line-through font-bold mb-1">{course.pricing?.originalPrice}</span>
                </div>
                <p className="text-amber-500 font-bold text-sm tracking-wide uppercase">{course.pricing?.savingsText}</p>
                <div className="mt-6 flex flex-col gap-3">
                  <a href={`https://wa.me/91${course.contactPhone}?text=Hi%20Shivam...`} target="_blank" rel="noreferrer" className="w-full py-4 rounded-xl bg-[#25D366] text-white font-black text-lg flex items-center justify-center gap-2 hover:bg-[#20bd5a] transition-colors shadow-lg shadow-[#25D366]/20"><Phone size={20} /> Join Waitlist via WhatsApp</a>
                  <a href="/python-syllabus.pdf" download className="w-full py-4 rounded-xl border border-white/20 bg-white/5 text-slate-300 font-bold text-lg flex items-center justify-center gap-2 hover:bg-white/10 hover:border-amber-500 hover:text-amber-400 transition-all"><Download size={20} /> Download Full Syllabus (PDF)</a>
                </div>
                <p className="text-center text-slate-500 text-xs mt-3">Next batch dates to be announced soon.</p>
              </div>
              <div className="space-y-6">
                <div>
                  <h4 className="font-bold text-slate-200 mb-3 text-lg">What You Will Achieve:</h4>
                  <ul className="space-y-2">
                    {course.outcomes?.map((outcome, idx) => <li key={idx} className="flex gap-3 text-slate-400 text-sm font-medium"><CheckCircle2 size={18} className="text-amber-500 flex-shrink-0" /> {outcome}</li>)}
                  </ul>
                </div>
                <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <h4 className="font-bold text-amber-400 mb-2 flex items-center gap-2"><Gift size={18}/> Special Bonuses included:</h4>
                  <ul className="space-y-2">
                    {course.bonuses?.map((bonus, idx) => <li key={idx} className="flex gap-2 text-slate-300 text-sm"><span className="text-amber-500">✔</span> {bonus}</li>)}
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex flex-col z-10">
              <h4 className="font-display font-black text-2xl text-white mb-6 border-b border-white/10 pb-4">Program Curriculum</h4>
              
              {/* THE DARK FIERY FLYER - Blends perfectly now! */}
              <div className="mb-8 rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_30px_rgba(245,158,11,0.15)] transform hover:scale-[1.01] transition-transform duration-300 bg-black">
                <img src="/curriculum-flyer.jpg" alt="Curriculum Overview" className="w-full h-auto opacity-90 hover:opacity-100 transition-opacity" />
              </div>

              <div className="flex flex-col gap-3">
                {course.modules?.map((mod, i) => {
                  const isActive = openModule === i;
                  return (
                    <div key={i} className={`rounded-2xl overflow-hidden transition-all border bg-white/5 ${isActive ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-white/10 hover:border-amber-500/50'}`}>
                      <button onClick={() => setOpenModule(isActive ? null : i)} className="w-full p-4 md:p-5 flex items-center justify-between text-left">
                        <h5 className={`font-bold ${isActive ? 'text-amber-400' : 'text-slate-300'}`}>{mod.title}</h5>
                        <motion.div animate={{ rotate: isActive ? 180 : 0 }}><ChevronDown className="text-slate-500"/></motion.div>
                      </button>
                      <AnimatePresence>
                        {isActive && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <ul className="p-4 md:p-5 pt-0 space-y-3 border-t border-white/10 mt-2 bg-black/20">
                              {mod.topics.map((topic, idx) => <li key={idx} className="flex items-start gap-3 text-slate-400 text-sm"><Code2 size={16} className="text-amber-500 opacity-80 mt-0.5 flex-shrink-0" /> {topic}</li>)}
                            </ul>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}