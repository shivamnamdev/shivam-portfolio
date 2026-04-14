'use client';
import { motion } from 'framer-motion';
import { Download, ArrowRight } from 'lucide-react';

export default function LeadMagnet() {
  return (
    <section className="w-full relative z-10 py-12 px-4 max-w-5xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="glass-panel p-8 md:p-12 rounded-3xl border border-stone-200 bg-stone-900 shadow-2xl relative overflow-hidden"
      >
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-amber-500/20 blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="w-full md:w-1/2 text-center md:text-left">
            <h3 className="text-3xl font-display font-black text-white mb-3">Missed the Cohort?</h3>
            <p className="text-stone-300 mb-6">
              Drop your email below to get my <strong className="text-amber-400">Free Python Logic-Building Cheat Sheet</strong> and get priority access when Cohort 2 opens.
            </p>
          </div>
          
          <div className="w-full md:w-1/2 flex flex-col gap-3">
            <form className="flex flex-col sm:flex-row gap-3" onSubmit={(e) => e.preventDefault()}>
              <input 
                type="email" 
                placeholder="Enter your best email address" 
                className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-stone-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                required
              />
              <button 
                type="submit"
                className="px-6 py-4 rounded-xl bg-amber-500 text-stone-900 font-bold flex items-center justify-center gap-2 hover:bg-amber-400 transition-colors whitespace-nowrap"
              >
                Get Cheat Sheet <ArrowRight size={18} />
              </button>
            </form>
            <p className="text-xs text-stone-500 text-center sm:text-left mt-2">
              No spam. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}