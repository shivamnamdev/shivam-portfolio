'use client';
import { XCircle, CheckCircle2 } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';

interface PainPointsProps {
  painPoints?: {
    oldWay: string[];
    newWay: string[];
  };
}

export default function PainPoints({ painPoints }: PainPointsProps) {
  // Fallback to original hardcoded values if no props provided
  const defaultPainPoints = {
    oldWay: [
      'Watching hours of tutorials but unable to write code from scratch.', 
      'Struggling to build strong programming logic.', 
      'Feeling overwhelmed by complex coding jargon and theory.', 
      'Learning syntax but failing to solve real-world problems.'
    ],
    newWay: [
      'Building strong coding logic step-by-step from scratch.', 
      'Writing Python programs confidently and independently.', 
      'Working on real-world capstone projects, not just theory.', 
      'Becoming job-ready for entry-level roles with modern tools.'
    ]
  };

  const displayPoints = painPoints || defaultPainPoints;

  return (
    <section className="w-full relative z-10 my-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        
        {/* The Old Way */}
        <SpotlightCard className="p-8 md:p-10 border-red-500/20 bg-[#121212] group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 blur-[80px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-6 relative z-10">The Self-Taught Struggle</h3>
          <ul className="space-y-5 relative z-10">
            {displayPoints.oldWay.map((point, i) => (
              <li key={i} className="flex gap-4 text-stone-400 font-medium">
                <XCircle className="text-red-500 flex-shrink-0 mt-0.5" size={24} /> 
                <span className="leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        </SpotlightCard>

        {/* The New Way */}
        <SpotlightCard className="p-8 md:p-10 border-amber-500/30 bg-gradient-to-br from-[#0a0a0a] to-[#121212] group shadow-[0_0_30px_rgba(245,158,11,0.1)]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[80px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-6 relative z-10">The Live Cohort Reality</h3>
          <ul className="space-y-5 relative z-10">
            {displayPoints.newWay.map((point, i) => (
              <li key={i} className="flex gap-4 text-stone-300 font-bold">
                <CheckCircle2 className="text-amber-500 flex-shrink-0 mt-0.5" size={24} /> 
                <span className="leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        </SpotlightCard>

      </div>
    </section>
  );
}