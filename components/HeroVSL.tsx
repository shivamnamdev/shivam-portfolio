'use client';
import { motion } from 'framer-motion';
import { ChevronRight, Star, MonitorPlay, Trophy } from 'lucide-react';

export default function HeroVSL({ course }: { course: any }) {
  const scrollToPricing = () => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });

  if (!course || !course.vsl) return null;

  return (
    <section className="w-full pt-16 md:pt-28 flex flex-col items-center gap-12 relative z-10" id="hero">
      
      {/* Top Hook Section */}
      <div className="w-full flex flex-col items-center text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-sm text-amber-400 font-bold mb-6 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
          <Star size={16} className="fill-amber-500 text-amber-500" /> {course.statusText}
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-5xl md:text-6xl lg:text-7xl font-display font-black tracking-tighter text-white leading-tight mb-6 drop-shadow-md text-center">
          {course.vsl.headlinePart1} <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600 animate-gradient-x bg-[length:200%_auto]">
            {course.vsl.headlineHighlight}.
          </span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg md:text-xl text-stone-400 font-medium max-w-3xl text-center leading-relaxed mb-10">
          {course.vsl.subheadline}
        </motion.p>
      </div>

      {/* Image & Video Trailer Section */}
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-amber-500/15 blur-[100px] rounded-full pointer-events-none -z-10" />
        
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, duration: 0.6 }} className="relative w-full rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(245,158,11,0.2)] bg-[#0a0a0a]">
          {/* 🚨 Removed the PlayCircle overlay from the static image! */}
          <img src={course.vsl.flyerUrl} alt="Course Overview" className="w-full h-auto object-cover" />
        </motion.div>

        {/* 🚨 VIDEO TRAILER PLACEHOLDER (Commented out for future use) */}
        {/* 
        <div className="w-full aspect-video mt-12 bg-black rounded-3xl border border-white/10 shadow-2xl flex items-center justify-center overflow-hidden">
           <iframe width="100%" height="100%" src="https://www.youtube.com/embed/YOUR_TRAILER_ID?rel=0" frameBorder="0" allowFullScreen></iframe>
        </div>
        */}

        <motion.button onClick={scrollToPricing} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-12 px-10 py-5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black text-xl flex items-center justify-center gap-3 transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(245,158,11,0.4)] group">
          Enroll Now & Learn Python The Right Way <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
        </motion.button>
      </div>
    </section>
  );
}