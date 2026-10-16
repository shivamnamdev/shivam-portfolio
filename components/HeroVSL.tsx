'use client';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronDown, Star } from 'lucide-react';

interface HeroVSLProps {
  course: any;
}

export default function HeroVSL({ course }: HeroVSLProps) {
  if (!course || !course.vsl) return null;

  // Plan-based courses sell through the pricing cards; single-price courses through the cohort box.
  const enrollTarget = course.pricingPlans?.length ? 'pricing' : 'live-sessions';
  const ctaLabel = course.enrollmentClosed ? 'View Course Details' : (course.vsl.ctaLabel || 'View Course Details');
  const facts: string[] = course.vsl.facts || [course.duration].filter(Boolean);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section className="w-full pt-16 md:pt-24 flex flex-col items-center gap-12 relative z-10" id="hero">

      <div className="w-full max-w-4xl flex flex-col items-center text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-sm text-amber-400 font-bold mb-6">
          <Star size={16} className="fill-amber-500 text-amber-500" /> {course.statusText}
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-5xl md:text-6xl lg:text-7xl font-display font-black tracking-tighter text-white leading-tight mb-6">
          {course.vsl.headlinePart1} <br/>
          <span className="text-amber-500">{course.vsl.headlineHighlight}.</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg md:text-xl text-stone-400 font-medium max-w-3xl leading-relaxed mb-8">
          {course.vsl.subheadline}
        </motion.p>

        {facts.length > 0 && (
          <motion.ul initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="flex flex-wrap justify-center gap-2 mb-10" aria-label="Course facts">
            {facts.map((fact) => (
              <li key={fact} className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-sm font-bold text-stone-300">{fact}</li>
            ))}
          </motion.ul>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <button onClick={() => scrollTo(enrollTarget)} className="w-full sm:w-auto px-8 py-4 rounded-full bg-amber-500 text-black font-black text-lg flex items-center justify-center gap-2 transition-all hover:bg-amber-400 hover:scale-[1.02] group">
            {ctaLabel} <ChevronRight size={22} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <button onClick={() => scrollTo('curriculum')} className="px-6 py-4 text-stone-300 font-bold flex items-center gap-2 hover:text-white transition-colors">
            View Curriculum <ChevronDown size={18} />
          </button>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, duration: 0.6 }} className="w-full max-w-5xl rounded-3xl overflow-hidden border border-white/10 bg-[#0a0a0a]">
        <img src={course.vsl.flyerUrl} alt={`${course.title} overview`} className="w-full h-auto object-cover" />
      </motion.div>
    </section>
  );
}
