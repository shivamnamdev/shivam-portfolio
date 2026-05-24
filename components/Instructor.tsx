'use client';
import { motion } from 'framer-motion';
import { Shield, Music, Terminal, Award } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';

export default function Instructor() {
  return (
    <section className="w-full relative scroll-mt-32 z-10 my-20" id="instructor">
      <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
        
        {/* Left: Image & Badges */}
        <div className="relative flex justify-center lg:justify-start">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            className="relative w-80 h-[450px] rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(245,158,11,0.15)] z-10 bg-[#0a0a0a]"
          >
            <img src="/shivam.png" alt="Shivam Namdev" className="w-full h-full object-cover opacity-90 mix-blend-luminosity hover:mix-blend-normal transition-all duration-700" onError={(e) => e.currentTarget.style.display = 'none'} />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
          </motion.div>

          {/* Floating Authority Badge */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
            className="absolute bottom-10 -left-6 md:-left-12 bg-[#121212]/90 backdrop-blur-md p-4 rounded-2xl border border-white/10 border-l-4 border-l-amber-500 flex items-center gap-4 z-20 shadow-2xl"
          >
            <div className="p-3 bg-amber-500/20 rounded-full border border-amber-500/30">
              <Award className="text-amber-400" size={24} />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight">QA Lead</p>
              <p className="text-amber-500 text-sm font-medium">7+ Years Experience</p>
            </div>
          </motion.div>
        </div>

        {/* Right: The Story */}
        <div className="flex flex-col gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-4xl md:text-5xl font-display font-black text-white mb-2">
              Meet Your Instructor
            </h2>
            <p className="text-xl text-amber-500 font-bold tracking-wide">Shivam Namdev</p>
          </motion.div>

          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-stone-400 leading-relaxed text-lg">
            I didn’t start my journey in a tech lab or at a coding bootcamp. My understanding of discipline and mastery comes from a completely different world.
          </motion.p>

          <div className="space-y-8 mt-4">
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="flex gap-4">
              <Shield className="text-amber-500 flex-shrink-0 mt-1" size={32} />
              <div>
                <h4 className="text-white font-bold mb-1 text-lg">The Dojo (Discipline)</h4>
                <p className="text-stone-400 text-sm leading-relaxed">At 17, I was selected to play in the Asian and World Karate Championships. I learned resilience and the power of a bulletproof mindset.</p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="flex gap-4">
              <Music className="text-amber-500 flex-shrink-0 mt-1" size={32} />
              <div>
                <h4 className="text-white font-bold mb-1 text-lg">The Symphony (Practice)</h4>
                <p className="text-stone-400 text-sm leading-relaxed">I traded sparring mats for a piano, composing music under the rigorous ABRSM syllabus. It taught me how to master complex systems through repetition.</p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }} className="flex gap-4">
              <Terminal className="text-amber-500 flex-shrink-0 mt-1" size={32} />
              <div>
                <h4 className="text-white font-bold mb-1 text-lg">The Code (Execution)</h4>
                <p className="text-stone-400 text-sm leading-relaxed">Today, I bring that exact same focus to technology. As a Lead QA, I design scalable frameworks and pioneer the use of Agentic AI.</p>
              </div>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.5 }} className="mt-4">
            <SpotlightCard className="p-6 border-l-4 border-l-amber-500 bg-[#121212]">
              <p className="text-stone-300 text-sm italic font-medium leading-relaxed">
                "In life, as in software, excellence is a habit, not a one-time act. I built this course to pass that habit on to you."
              </p>
            </SpotlightCard>
          </motion.div>

        </div>
        
      </div>
    </section>
  );
}