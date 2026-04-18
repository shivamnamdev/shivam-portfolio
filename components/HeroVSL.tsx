'use client';
import { motion } from 'framer-motion';
import { ChevronRight, Star } from 'lucide-react';

// Define the shape of the data we expect to receive
interface HeroVSLProps {
  course: {
    statusText: string;
    vsl?: {
      headlinePart1: string;
      headlineHighlight: string;
      subheadline: string;
      videoCoverUrl: string;
      flyerUrl: string;
    }
  }
}

export default function HeroVSL({ course }: HeroVSLProps) {
  const scrollToCohorts = () => {
    document.getElementById('live-sessions')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fallback in case VSL data is missing
  if (!course.vsl) return null;

  return (
    <section className="w-full pt-16 md:pt-28 flex flex-col lg:flex-row items-center gap-12 relative z-10" id="hero">
      
      <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left">
        {/* Dynamic Status Badge */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-300 bg-amber-50 text-sm text-amber-700 font-bold mb-6 shadow-sm">
          <Star size={16} className="fill-amber-500 text-amber-500" /> {course.statusText}
        </motion.div>

        {/* Dynamic Headline */}
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-5xl md:text-6xl lg:text-7xl font-display font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-stone-900 via-stone-700 to-stone-500 leading-tight mb-6">
          {course.vsl.headlinePart1} <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-500">
            {course.vsl.headlineHighlight}.
          </span>
        </motion.h1>

        {/* Dynamic Subheadline */}
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg md:text-xl text-stone-600 font-medium max-w-xl leading-relaxed mb-10">
          {course.vsl.subheadline}
        </motion.p>

        <motion.button onClick={scrollToCohorts} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="px-8 py-4 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-lg flex items-center justify-center gap-3 transition-all hover:scale-105 hover:shadow-xl shadow-amber-500/30 w-full sm:w-auto group">
          View Course Details <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
        </motion.button>
      </div>

      {/* Dynamic Flyer Image */}
      <div className="w-full lg:w-1/2 flex justify-center lg:justify-end relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-amber-500/15 blur-[100px] rounded-full pointer-events-none -z-10" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, rotate: -2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ delay: 0.4, duration: 0.6, type: "spring" }}
          className="relative w-full max-w-md rounded-3xl overflow-hidden border-8 border-white shadow-2xl transform hover:scale-[1.02] hover:-rotate-1 transition-all duration-300"
        >
          <img src={course.vsl.flyerUrl} alt="Course Overview" className="w-full h-auto object-cover" />
        </motion.div>
      </div>
    </section>
  );
}