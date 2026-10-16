'use client';
import { motion } from 'framer-motion';

export default function InstructorStory() {
  return (
    <section className="w-full max-w-4xl mx-auto py-24 relative z-10 text-center md:text-left">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-display font-black text-white mb-6 uppercase tracking-wide">
          Meet Your Instructor
        </h2>
        <p className="text-2xl md:text-3xl font-bold text-stone-300 leading-snug max-w-3xl mx-auto">
          Discipline, Craft, and Code aren't three different skills.<br/>
          <span className="text-amber-500 border-b-4 border-amber-500 pb-1">They're one pattern — I just teach it now.</span>
        </p>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-12 mb-20">
        <div className="w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden border-4 border-white/10 shadow-[0_0_40px_rgba(245,158,11,0.2)] shrink-0">
          <img src="/shivam.png" alt="Shivam Namdev" className="w-full h-full object-cover" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-white mb-4">Hi, I'm Shivam 👋</h3>
          <p className="text-stone-400 text-lg leading-relaxed mb-6">
            If you're new here, let me take you through three chapters of my life that taught me the exact same lesson, three completely different ways.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-[#121212] p-4 rounded-xl border border-white/5 text-center">
              <h4 className="text-2xl font-black text-amber-500">50+</h4>
              <p className="text-xs text-stone-500 font-bold uppercase mt-1">Students Mentored</p>
            </div>
            <div className="bg-[#121212] p-4 rounded-xl border border-white/5 text-center">
              <h4 className="text-2xl font-black text-amber-500">3</h4>
              <p className="text-xs text-stone-500 font-bold uppercase mt-1">Industry Certifications</p>
            </div>
            <div className="bg-[#121212] p-4 rounded-xl border border-white/5 text-center col-span-2 md:col-span-1">
              <h4 className="text-2xl font-black text-amber-500">1</h4>
              <p className="text-xs text-stone-500 font-bold uppercase mt-1">Core Pattern</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-12 mb-20">
        {/* 🚨 THE FIX: Replaced 'glass-panel' with pure dark mode styling! */}
        <div className="p-8 rounded-2xl bg-[#121212] border border-white/10 border-l-4 border-l-amber-500 relative shadow-xl">
          <h4 className="text-xl font-bold text-white mb-2">🥋 The Dojo — Building Discipline</h4>
          <span className="absolute top-8 right-8 text-xs font-black bg-white/10 text-stone-400 px-3 py-1 rounded-full uppercase tracking-widest">Age 17</span>
          <p className="text-stone-400 leading-relaxed mt-4">Selected to represent at the Asian and World Karate Championships. The sparring mats taught me resilience, immense discipline, and the sheer power of a bulletproof mindset. I learned early on that excellence requires showing up every single day.</p>
        </div>

        <div className="p-8 rounded-2xl bg-[#121212] border border-white/10 border-l-4 border-l-blue-500 relative shadow-xl">
          <h4 className="text-xl font-bold text-white mb-2">🎹 The Symphony — Mastering the Craft</h4>
          <span className="absolute top-8 right-8 text-xs font-black bg-white/10 text-stone-400 px-3 py-1 rounded-full uppercase tracking-widest">Berklee & ABRSM</span>
          <p className="text-stone-400 leading-relaxed mt-4">I traded the mats for a piano keyboard. Studying the rigorous ABRSM syllabus and music production at Berklee taught me how to break down incredibly complex structures into simple, repeatable patterns — the exact skill required for programming.</p>
        </div>

        <div className="p-8 rounded-2xl bg-[#121212] border border-white/10 border-l-4 border-l-green-500 relative shadow-xl">
          <h4 className="text-xl font-bold text-white mb-2">💻 The Code — Architectural Leadership</h4>
          <span className="absolute top-8 right-8 text-xs font-black bg-white/10 text-stone-400 px-3 py-1 rounded-full uppercase tracking-widest">7+ Years Tech</span>
          <p className="text-stone-400 leading-relaxed mt-4">Bringing that same focus to technology, I now lead teams. I design scalable, bulletproof frameworks using my knowledge of Python, Pytest, and Agentic AI. My mission now is to teach others how to stop guessing and start engineering with confidence.</p>
        </div>
      </div>

      <div className="text-center md:text-left border-t border-white/10 pt-12">
        <p className="text-lg text-stone-300 leading-relaxed mb-6">
          But here's what I think about most, looking back across all three: <br/><br/>
          Discipline, structure, and craft are the same skill wearing different clothes. Karate taught me discipline. Music taught me how to turn complexity into simple, repeatable patterns. Tech taught me how to package both into something someone else could actually learn from.
        </p>
        <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
          <p className="text-amber-500 font-bold text-xl italic mb-4">
            "No one handed me that pattern — I had to live it three separate times to see it. So I built a way of teaching that hands it to you immediately, instead of making you discover it the slow way, like I did. Let's go. 🚀"
          </p>
          <p className="text-white font-black uppercase tracking-widest">— Shivam Namdev</p>
          <p className="text-stone-500 text-sm font-bold">Instructor & Mentor</p>
        </div>
      </div>

      {/* The Journey Strip */}
      <div className="mt-20 text-center">
        <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-6">THE JOURNEY SO FAR</p>
        <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 text-sm md:text-base font-bold text-stone-300">
          <span className="whitespace-nowrap">🥋 The Dojo <span className="text-stone-600 font-normal">→ Discipline</span></span>
          <span className="hidden md:inline text-amber-500">➔</span>
          <span className="whitespace-nowrap">🎹 The Symphony <span className="text-stone-600 font-normal">→ Craft</span></span>
          <span className="hidden md:inline text-amber-500">➔</span>
          <span className="whitespace-nowrap">💻 The Code <span className="text-stone-600 font-normal">→ Architecture</span></span>
          <span className="hidden md:inline text-amber-500">➔</span>
          <span className="whitespace-nowrap text-black bg-amber-500 px-4 py-1.5 rounded-full shadow-lg">🎓 Now <span className="text-amber-900 font-bold">→ Teaching the Pattern</span></span>
        </div>
      </div>
    </section>
  );
}