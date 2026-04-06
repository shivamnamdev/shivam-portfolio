'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { CheckCircle2, ChevronDown, Phone, Gift, Calendar, Code2 } from 'lucide-react';
import { activeCourses } from '@/data/courses';

export default function ActiveCohorts() {
  // We can track which accordion module is open per course. 
  // For simplicity, we just track the open module index.
  const [openModule, setOpenModule] = useState<number | null>(0);

  if (!activeCourses || activeCourses.length === 0) return null;

  return (
    <section className="w-full relative z-10 py-12" id="live-sessions">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-stone-900 to-stone-600 mb-4">Live Cohorts & Sessions</h2>
        <p className="text-stone-500">Join the live interactive sessions and transform your skills.</p>
      </div>

      <div className="flex flex-col gap-12 max-w-6xl mx-auto">
        {activeCourses.map((course) => (
          <div key={course.id} className="glass-panel rounded-3xl p-6 md:p-10 border-2 border-amber-400 bg-amber-50 shadow-xl shadow-amber-500/10 grid grid-cols-1 lg:grid-cols-2 gap-12 relative overflow-hidden">
            
            {/* Left Column: Offer Details */}
            <div className="flex flex-col relative z-10">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="px-4 py-1 bg-red-500 text-white font-bold rounded-full text-sm animate-pulse shadow-md">{course.statusText}</span>
                <span className="px-4 py-1 bg-amber-500 text-white font-bold rounded-full text-sm shadow-md">{course.demoOffer}</span>
              </div>
              
              <h3 className="text-3xl md:text-4xl font-black text-stone-900 mb-4">{course.title}</h3>
              
              <div className="flex items-center gap-2 text-stone-600 font-medium mb-6">
                <Calendar size={18} className="text-amber-500" />
                <span>{course.duration}</span>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm mb-6">
                <div className="flex items-end gap-3 mb-2">
                  <span className="text-5xl font-black text-stone-900">{course.pricing.currentPrice}</span>
                  <span className="text-xl text-stone-400 line-through font-bold mb-1">{course.pricing.originalPrice}</span>
                </div>
                <p className="text-amber-600 font-bold text-sm tracking-wide uppercase">{course.pricing.savingsText}</p>
                
                {/* Dynamic WhatsApp Link */}
                <a href={`https://wa.me/91${course.contactPhone}?text=Hi%20Shivam,%20I%20want%20to%20enroll%20in%20the%20${encodeURIComponent(course.title)}!`} target="_blank" rel="noreferrer" 
                   className="mt-6 w-full py-4 rounded-xl bg-green-500 text-white font-black text-lg flex items-center justify-center gap-2 hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20">
                  <Phone size={20} /> Join Now via WhatsApp
                </a>
                <p className="text-center text-stone-500 text-xs mt-3">Or call directly: +91 {course.contactPhone}</p>
              </div>

              {/* Outcomes & Bonuses */}
              <div className="space-y-6">
                <div>
                  <h4 className="font-bold text-stone-800 mb-3 text-lg">What You Will Achieve:</h4>
                  <ul className="space-y-2">
                    {course.outcomes.map((outcome, idx) => (
                      <li key={idx} className="flex gap-3 text-stone-600 text-sm font-medium">
                        <CheckCircle2 size={18} className="text-amber-500 flex-shrink-0" /> {outcome}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="p-4 bg-amber-100/50 rounded-xl border border-amber-200">
                  <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2"><Gift size={18}/> Special Bonuses included:</h4>
                  <ul className="space-y-2">
                    {course.bonuses.map((bonus, idx) => (
                      <li key={idx} className="flex gap-2 text-stone-700 text-sm">
                        <span className="text-amber-600">✔</span> {bonus}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Right Column: Dynamic Curriculum Accordion */}
            <div className="flex flex-col z-10">
              <h4 className="font-display font-black text-2xl text-stone-900 mb-6 border-b border-stone-200 pb-4">Program Curriculum</h4>
              <div className="flex flex-col gap-3">
                {course.modules.map((mod, i) => {
                  const isActive = openModule === i;
                  return (
                    <div key={i} className={`rounded-2xl overflow-hidden transition-all border bg-white ${isActive ? 'border-amber-400 shadow-md' : 'border-stone-200 hover:border-amber-300'}`}>
                      <button onClick={() => setOpenModule(isActive ? null : i)} className="w-full p-4 md:p-5 flex items-center justify-between text-left">
                        <h5 className={`font-bold ${isActive ? 'text-amber-600' : 'text-stone-700'}`}>{mod.title}</h5>
                        <motion.div animate={{ rotate: isActive ? 180 : 0 }}><ChevronDown className="text-stone-400"/></motion.div>
                      </button>
                      <AnimatePresence>
                        {isActive && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <ul className="p-4 md:p-5 pt-0 space-y-3 border-t border-stone-100 mt-2 bg-stone-50">
                              {mod.topics.map((topic, idx) => (
                                <li key={idx} className="flex items-start gap-3 text-stone-600 text-sm">
                                  <Code2 size={16} className="text-amber-500 opacity-80 mt-0.5 flex-shrink-0" /> {topic}
                                </li>
                              ))}
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