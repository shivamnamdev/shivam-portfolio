'use client';
import { motion } from 'framer-motion';
import { User, ClipboardCheck, Code2, MessageCircleQuestion, PlaySquare, Award } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';

interface DifferentiatorProps {
  course: any;
}

export default function Differentiators({ course }: DifferentiatorProps) {
  // If the course doesn't have differentiators data, hide this section
  if (!course?.differentiators) return null;

  // Helper function to map the string from the database to the correct Lucide icon
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'mentorship': return <User size={32} className="text-amber-500" />;
      case 'accountability': return <ClipboardCheck size={32} className="text-blue-400" />;
      case 'visualiser': return <Code2 size={32} className="text-purple-400" />;
      case 'support': return <MessageCircleQuestion size={32} className="text-emerald-400" />;
      case 'recordings': return <PlaySquare size={32} className="text-red-400" />;
      case 'certificate': return <Award size={32} className="text-yellow-400" />;
      default: return <Award size={32} className="text-amber-500" />;
    }
  };

  return (
    <section className="w-full relative z-10 my-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center p-3 bg-amber-500/10 rounded-full border border-amber-500/20 mb-6 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
          <Award className="text-amber-500" size={32} />
        </div>
        <h2 className="text-3xl md:text-5xl font-display font-black text-white mb-4 uppercase tracking-wide">
          What Makes This Cohort <span className="text-amber-500">Different?</span>
        </h2>
        <p className="text-stone-400 text-lg max-w-2xl mx-auto uppercase tracking-widest font-bold">
          Read, Understand, Debug & Build Python Programs Independently
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {course.differentiators.map((diff: any, index: number) => (
          <motion.div 
            key={index}
            initial={{ opacity: 0, y: 20 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true }} 
            transition={{ delay: index * 0.1 }}
          >
            <SpotlightCard className="p-8 h-full flex flex-col items-center text-center bg-[#121212] hover:border-amber-500/50 transition-colors duration-300 group">
              <div className="mb-6 transform group-hover:scale-110 transition-transform duration-300">
                {getIcon(diff.icon)}
              </div>
              <h3 className="text-lg font-black text-amber-500 mb-3 tracking-widest uppercase">
                {diff.title}
              </h3>
              <p className="text-stone-300 font-medium leading-relaxed">
                {diff.description}
              </p>
            </SpotlightCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}