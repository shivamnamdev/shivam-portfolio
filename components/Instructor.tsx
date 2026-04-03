'use client';
import { motion } from 'framer-motion';
import { Shield, Music, Terminal, Award, CheckCircle2 } from 'lucide-react';

export default function Instructor() {
  return (
    <section className="w-full relative scroll-mt-32 z-10" id="instructor">
      <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
        
        {/* Left: Image & Badges */}
        <div className="relative flex justify-center lg:justify-start">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            className="relative w-80 h-[450px] rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(245,158,11,0.15)] z-10 bg-white/5"
          >
            <img src="/shivam.png" alt="Shivam Namdev" className="w-full h-full object-cover opacity-90 mix-blend-luminosity hover:mix-blend-normal transition-all duration-700" onError={(e) => e.currentTarget.style.display = 'none'} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-transparent to-transparent" />
          </motion.div>

          {/* Floating Authority Badge */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
            className="absolute bottom-10 -left-6 md:-left-12 glass-panel p-4 rounded-2xl border-l-4 border-l-amber-500 flex items-center gap-4 z-20"
          >
            <div className="p-3 bg-amber-500/20 rounded-full">
              <Award className="text-amber-400" size={24} />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight">QA Lead</p>
              <p className="text-amber-500/80 text-sm font-medium">7+ Years Experience</p>
            </div>
          </motion.div>
        </div>

        {/* Right: The Story */}
        <div className="flex flex-col gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-2">
              Meet Your Instructor
            </h2>
            <p className="text-xl text-amber-400 font-medium">Shivam Namdev</p>
          </motion.div>

          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-slate-300 leading-relaxed text-lg">
            I didn’t start my journey in a tech lab or at a coding bootcamp. My understanding of discipline and mastery comes from a completely different world.
          </motion.p>

          <div className="space-y-6 mt-4">
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="flex gap-4">
              <Shield className="text-amber-500 flex-shrink-0 mt-1" size={28} />
              <div>
                <h4 className="text-white font-bold mb-1">The Dojo (Discipline)</h4>
                <p className="text-slate-400 text-sm leading-relaxed">At 17, I was selected to play in the Asian and World Karate Championships. I learned resilience and the power of a bulletproof mindset.</p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="flex gap-4">
              <Music className="text-amber-500 flex-shrink-0 mt-1" size={28} />
              <div>
                <h4 className="text-white font-bold mb-1">The Symphony (Practice)</h4>
                <p className="text-slate-400 text-sm leading-relaxed">I traded sparring mats for a piano, composing music under the rigorous ABRSM syllabus. It taught me how to master complex systems through repetition.</p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }} className="flex gap-4">
              <Terminal className="text-amber-500 flex-shrink-0 mt-1" size={28} />
              <div>
                <h4 className="text-white font-bold mb-1">The Code (Execution)</h4>
                <p className="text-slate-400 text-sm leading-relaxed">Today, I bring that exact same focus to technology. As a Lead QA, I design scalable, reliable frameworks and pioneer the use of Agentic AI in testing.</p>
              </div>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.5 }} className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-slate-300 text-sm italic border-l-4 border-l-amber-500">
            "In life, as in software, excellence is a habit, not a one-time act. I built this course to pass that habit on to you."
          </motion.div>
        </div>
        
      </div>
    </section>
  );
}