'use client';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

export default function Pricing() {
  return (
    <section className="w-full relative scroll-mt-32 z-10" id="pricing">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-500 mb-4">Secure Your Spot</h2>
        <p className="text-stone-500">Lock in early bird pricing before the official launch.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {/* Basic */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass-panel p-8 rounded-3xl border border-stone-200 flex flex-col">
          <h3 className="text-xl font-bold text-stone-600 mb-2">Self-Paced</h3>
          <div className="text-4xl font-black text-stone-900 mb-6">$149</div>
          <ul className="space-y-4 mb-8 flex-grow text-sm text-stone-600">
            <li className="flex gap-2"><CheckCircle2 size={18} className="text-amber-500 flex-shrink-0" /> Full Video Curriculum</li>
            <li className="flex gap-2"><CheckCircle2 size={18} className="text-amber-500 flex-shrink-0" /> Lifetime Access</li>
            <li className="flex gap-2"><CheckCircle2 size={18} className="text-amber-500 flex-shrink-0" /> Certificate of Completion</li>
          </ul>
          <button className="w-full py-3 rounded-full border border-stone-300 text-stone-700 font-bold hover:bg-stone-100 transition-colors">Join Waitlist</button>
        </motion.div>

        {/* Pro (Highlighted) */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="glass-panel p-8 rounded-3xl border-2 border-amber-400 bg-amber-50 flex flex-col relative transform md:-translate-y-4 shadow-xl shadow-amber-500/10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-500 text-white font-bold px-4 py-1 rounded-full text-xs tracking-widest uppercase">Most Popular</div>
          <h3 className="text-xl font-bold text-amber-600 mb-2">Pro Engineer</h3>
          <div className="text-4xl font-black text-stone-900 mb-6">$299</div>
          <ul className="space-y-4 mb-8 flex-grow text-sm text-stone-700">
            <li className="flex gap-2"><CheckCircle2 size={18} className="text-amber-500 flex-shrink-0" /> Everything in Self-Paced</li>
            <li className="flex gap-2"><CheckCircle2 size={18} className="text-amber-500 flex-shrink-0" /> Private Discord Community</li>
            <li className="flex gap-2"><CheckCircle2 size={18} className="text-amber-500 flex-shrink-0" /> Plug-and-Play Source Code</li>
            <li className="flex gap-2"><CheckCircle2 size={18} className="text-amber-500 flex-shrink-0" /> Agentic AI Prompt Library</li>
          </ul>
          <button className="w-full py-3 rounded-full bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors shadow-lg">Pre-Order Now</button>
        </motion.div>

        {/* Elite */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="glass-panel p-8 rounded-3xl border border-stone-200 flex flex-col">
          <h3 className="text-xl font-bold text-stone-600 mb-2">1-on-1 Mentorship</h3>
          <div className="text-4xl font-black text-stone-900 mb-6">$999</div>
          <ul className="space-y-4 mb-8 flex-grow text-sm text-stone-600">
            <li className="flex gap-2"><CheckCircle2 size={18} className="text-amber-500 flex-shrink-0" /> Everything in Pro</li>
            <li className="flex gap-2"><CheckCircle2 size={18} className="text-amber-500 flex-shrink-0" /> Resume & LinkedIn Review</li>
            <li className="flex gap-2"><CheckCircle2 size={18} className="text-amber-500 flex-shrink-0" /> 2x 60-min Pair Programming Calls</li>
          </ul>
          <button className="w-full py-3 rounded-full border border-stone-300 text-stone-700 font-bold hover:bg-stone-100 transition-colors">Apply Now</button>
        </motion.div>
      </div>
    </section>
  );
}