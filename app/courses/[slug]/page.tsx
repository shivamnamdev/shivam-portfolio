'use client';
import { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { activeCourses } from '@/data/courses';
import { activeCoupons } from '@/data/coupons';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayCircle, CheckCircle2, MonitorPlay, Infinity, Trophy, ChevronDown, Tag, CreditCard, Loader2, Globe, ShieldCheck, Code2, Award, ChevronRight, Quote } from 'lucide-react';
import HeroVSL from "@/components/HeroVSL"; 
import PainPoints from "@/components/PainPoints";
import Differentiators from "@/components/Differentiators";
import InstructorStory from "@/components/InstructorStory";
import CoursePricing from "@/components/CoursePricing";
import FAQ from "@/components/FAQ";
import WhatsAppWidget from "@/components/WhatsAppWidget";
import SpotlightCard from '@/components/SpotlightCard';

export default function CourseSalesPage({ params }: { params: { slug: string } }) {
  
  const course = activeCourses.find((c) => c.slug === params.slug);
  const router = useRouter();
  const { isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();

  const [openModule, setOpenModule] = useState<number | null>(0);

  if (!course) {
    return <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">Course not found.</div>;
  }

  // Auto-remove "Batch" from the title for the certificate
  const cleanTitle = course.title.replace(/\s*\(Batch\s*\d+\)/i, '').trim();

  return (
    <div className="relative min-h-screen bg-[#050505] overflow-hidden font-sans">
      <div className="absolute inset-0 bg-grid-pattern z-0 opacity-20 pointer-events-none" />
      <Navbar />
      
      <main className="flex flex-col items-center max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pb-10 space-y-16 relative z-10">
        
        <HeroVSL course={course} /> 
        <InstructorStory />
        <PainPoints />
        <Differentiators course={course} />

        {/* CURRICULUM SECTION */}
        <section className="w-full max-w-4xl mx-auto mt-20" id="curriculum">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-display font-black text-white mb-4">Program Curriculum</h2>
            <p className="text-stone-400">Everything you will master in this cohort.</p>
          </div>
          <div className="space-y-4">
            {course.modules?.map((mod: any, i: number) => {
              const isActive = openModule === i;
              return (
                <div key={i} className={`rounded-xl overflow-hidden transition-all border ${isActive ? 'bg-[#121212] border-amber-500/50' : 'bg-transparent border-white/10 hover:border-white/30'}`}>
                  <button onClick={() => setOpenModule(isActive ? null : i)} className="w-full p-5 flex items-center justify-between text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      {mod.week && <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 bg-white/5 px-2 py-1 rounded border border-white/5">{mod.week}</span>}
                      <h5 className={`font-bold ${isActive ? 'text-amber-500' : 'text-stone-300'}`}>{mod.title}</h5>
                    </div>
                    <motion.div animate={{ rotate: isActive ? 180 : 0 }}><ChevronDown className="text-stone-500 shrink-0 ml-2"/></motion.div>
                  </button>
                  <AnimatePresence>
                    {isActive && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <ul className="p-5 pt-0 space-y-3 border-t border-white/5 mt-2 bg-[#0a0a0a]">
                          {mod.topics.map((topic: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-3 text-stone-400 text-sm">
                              <PlayCircle size={16} className="text-amber-500 shrink-0 mt-0.5" /> {topic}
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
        </section>

        {/* 🚨 THE FIX: VISUAL CERTIFICATE SECTION (Updated to Match PDF!) */}
        <section className="w-full max-w-4xl mx-auto py-20 text-center">
          <h2 className="text-4xl font-display font-black text-white mb-10 drop-shadow-md">Earn Your Certificate</h2>
          
          <div className="w-full aspect-[1.4] bg-[#121212] rounded-md p-2 shadow-[0_0_50px_rgba(245,158,11,0.2)] flex flex-col border border-white/10 select-none">
            <div className="flex-1 border-[3px] border-amber-500 p-1 flex flex-col">
              <div className="flex-1 border border-amber-400 flex flex-col items-center justify-center p-4 md:p-8">
                
                <h3 className="text-2xl md:text-4xl font-bold text-white mb-4 tracking-wide">CERTIFICATE OF COMPLETION</h3>
                <p className="text-stone-400 italic mb-6">This prestigious credential is proudly presented to</p>
                
                <h2 className="text-3xl md:text-5xl font-black text-amber-500 mb-6 uppercase tracking-wider">YOUR NAME HERE</h2>
                
                <p className="text-stone-300 text-sm md:text-base mb-2">for successfully completing the curriculum and passing all technical requirements in:</p>
                <p className="text-white font-bold text-xl md:text-2xl mb-8">{cleanTitle}</p>
                
                <p className="text-stone-400 italic text-sm mb-auto px-4">demonstrating the ability to read, understand, debug, and build Python programs independently.</p>
                
                <div className="w-full flex justify-between items-end mt-auto px-4 md:px-10">
                  <div className="text-left text-[10px] md:text-xs font-mono text-amber-400">
                    ISSUED: 27 SEPT 2026<br/>
                    VERIFICATION ID: SA-87S50UDZ
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-lg md:text-xl text-white border-b border-stone-500 pb-1 mb-1">Shivam Namdev</h3>
                    <p className="text-[10px] md:text-xs text-stone-500">Python Mentor & Software Professional</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        <CoursePricing course={course} />

        {/* TESTIMONIALS */}
        {course.courseTestimonials && course.courseTestimonials.length > 0 && (
          <section className="w-full relative z-10 py-10 max-w-6xl mx-auto">
            <div className="text-center mb-12"><h2 className="text-4xl font-display font-black text-white mb-4">What Our Learners Say</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {course.courseTestimonials.map((test: any, i: number) => (
                <SpotlightCard key={i} className="p-8 bg-[#121212]">
                  <Quote size={40} className="text-amber-500/20 absolute top-6 right-6" />
                  <p className="text-stone-400 italic mb-8 relative z-10 leading-relaxed">"{test.text}"</p>
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-xl shadow-sm">{test.name.charAt(0)}</div>
                    <div><h4 className="font-bold text-white text-lg">{test.name}</h4><p className="text-xs text-stone-500">Verified Learner</p></div>
                  </div>
                </SpotlightCard>
              ))}
            </div>
          </section>
        )}
        
        <FAQ />
      </main>
      
      <Footer />
      <WhatsAppWidget />
    </div>
  );
}