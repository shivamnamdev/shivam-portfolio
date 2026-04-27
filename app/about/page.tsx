'use client';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Shield, Music, Terminal } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="relative min-h-screen flex flex-col bg-stone-50">
      <Navbar />
      <main className="flex-grow flex flex-col items-center max-w-5xl mx-auto px-6 py-20 w-full">
        
        {/* Header */}
        <div className="text-center mb-20 relative z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-amber-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />
          <h1 className="text-5xl md:text-7xl font-display font-black text-stone-900 mb-6">
            The Journey to <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-400">Mastery.</span>
          </h1>
          <p className="text-xl text-stone-600 max-w-2xl mx-auto">
            I didn't start in a tech lab. I learned how to master complex systems through martial arts and music long before I wrote my first line of code.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative border-l-2 border-amber-200 ml-4 md:ml-0 md:pl-0 space-y-16 w-full max-w-3xl">
          
          {/* Phase 1: Karate */}
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="relative pl-10 md:pl-16">
            <div className="absolute -left-[25px] top-2 w-12 h-12 rounded-full bg-amber-100 border-4 border-white flex items-center justify-center shadow-md">
              <Shield className="text-amber-600" size={20} />
            </div>
            <h3 className="text-2xl font-black text-stone-900 mb-2">The Dojo: Building Discipline</h3>
            <p className="text-amber-600 font-bold text-sm mb-4 uppercase tracking-widest">Age 17</p>
            <p className="text-stone-600 leading-relaxed glass-panel p-6 rounded-2xl border border-stone-200">
              Selected to represent at the Asian and World Karate Championships. The sparring mats taught me resilience, immense discipline, and the sheer power of a bulletproof mindset. I learned early on that excellence requires showing up every single day.
            </p>
          </motion.div>

          {/* Phase 2: Music */}
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="relative pl-10 md:pl-16">
            <div className="absolute -left-[25px] top-2 w-12 h-12 rounded-full bg-amber-100 border-4 border-white flex items-center justify-center shadow-md">
              <Music className="text-amber-600" size={20} />
            </div>
            <h3 className="text-2xl font-black text-stone-900 mb-2">The Symphony: Mastering the Craft</h3>
            <p className="text-amber-600 font-bold text-sm mb-4 uppercase tracking-widest">Berklee & ABRSM</p>
            <p className="text-stone-600 leading-relaxed glass-panel p-6 rounded-2xl border border-stone-200">
              I traded the mats for a piano keyboard. Studying the rigorous ABRSM syllabus and music production at Berklee taught me how to break down incredibly complex structures into simple, repeatable patterns—the exact skill required for programming.
            </p>
          </motion.div>

          {/* Phase 3: Code */}
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="relative pl-10 md:pl-16">
            <div className="absolute -left-[25px] top-2 w-12 h-12 rounded-full bg-amber-500 border-4 border-white flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Terminal className="text-white" size={20} />
            </div>
            <h3 className="text-2xl font-black text-stone-900 mb-2">The Code: Architectural Leadership</h3>
            <p className="text-amber-600 font-bold text-sm mb-4 uppercase tracking-widest">7+ Years in Tech</p>
            <p className="text-stone-600 leading-relaxed glass-panel p-6 rounded-2xl border border-stone-200">
              Bringing that same focus to technology, I now lead QA teams. I design scalable, bulletproof automation frameworks using Python, Pytest, and Agentic AI. My mission now is to teach others how to stop guessing and start engineering with confidence.
            </p>
          </motion.div>

        </div>
      </main>
      <Footer />
    </div>
  );
}