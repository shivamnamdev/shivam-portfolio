'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function LeadMagnet() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const[isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    
    // 🚨 PASTE YOUR WEB3FORMS ACCESS KEY HERE:
    formData.append("access_key", "YOUR_ACCESS_KEY_HERE"); 

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setIsSuccess(true);
        (e.target as HTMLFormElement).reset(); // Clear the input
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="w-full relative z-10 py-12 px-4 max-w-5xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="glass-panel p-8 md:p-12 rounded-3xl border border-stone-200 bg-stone-900 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-amber-500/20 blur-[100px] pointer-events-none" />
        
        {isSuccess ? (
          <div className="relative z-10 flex flex-col items-center justify-center text-center py-6 animate-in fade-in zoom-in duration-500">
            <CheckCircle2 size={48} className="text-amber-400 mb-4" />
            <h3 className="text-3xl font-display font-black text-white mb-2">You're on the list!</h3>
            <p className="text-stone-300">
              Check your inbox shortly. I'll send the Python Cheat Sheet directly to your email.
            </p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
            <div className="w-full md:w-1/2 text-center md:text-left">
              <h3 className="text-3xl font-display font-black text-white mb-3">Missed the Cohort?</h3>
              <p className="text-stone-300 mb-6">
                Drop your email below to get my <strong className="text-amber-400">Free Python Logic-Building Cheat Sheet</strong> and get priority access when Cohort 2 opens.
              </p>
            </div>
            
            <div className="w-full md:w-1/2 flex flex-col gap-3">
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                
                {/* 🚨 THE FIX: Hidden Subject Line specifically for the Lead Magnet */}
                <input type="hidden" name="subject" value="🚨 NEW LEAD: Python Cheat Sheet Request" />
                {/* Prevent Spam */}
                <input type="checkbox" name="botcheck" className="hidden" style={{ display: 'none' }} />

                <input 
                  type="email" 
                  name="email"
                  placeholder="Enter your best email address" 
                  className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-stone-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                  required
                />
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-4 rounded-xl bg-amber-500 text-stone-900 font-bold flex items-center justify-center gap-2 hover:bg-amber-400 transition-colors whitespace-nowrap disabled:opacity-70"
                >
                  {isSubmitting ? "Sending..." : <><Download size={18} /> Get Cheat Sheet</>}
                </button>
              </form>
              <p className="text-xs text-stone-500 text-center sm:text-left mt-2">
                No spam. Unsubscribe anytime.
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </section>
  );
}