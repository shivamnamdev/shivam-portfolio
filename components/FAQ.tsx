'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';

const faqs =[
  { q: "Do I need prior coding experience?", a: "Not at all. This course is built entirely from scratch. We start with 'What is Python?' and build up to advanced problem-solving." },
  { q: "What if I miss a live session?", a: "Every live session is recorded. You will get lifetime access to the recordings within 24 hours of the class." },
  { q: "Will I get a certificate?", a: "Yes! Upon successfully completing the capstone project, you will receive a verifiable Certificate of Completion." },
  { q: "How are my doubts resolved?", a: "During the live sessions, we have dedicated Q&A time. Plus, you will have access to a private group to ask questions anytime." }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="w-full relative z-10 py-20 max-w-3xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-display font-black text-white mb-4 drop-shadow-md">Frequently Asked Questions</h2>
        <p className="text-stone-400 text-lg">Everything you need to know before joining.</p>
      </div>

      <div className="flex flex-col gap-4">
        {faqs.map((faq, i) => {
          const isActive = openIndex === i;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <SpotlightCard interactive className={`transition-all duration-300 ${isActive ? 'border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'border-white/10'}`}>
                <button 
                  onClick={() => setOpenIndex(isActive ? null : i)} 
                  className="w-full p-6 md:p-8 flex items-center justify-between text-left transition-colors"
                >
                  <span className={`font-bold text-lg md:text-xl transition-colors ${isActive ? 'text-amber-500' : 'text-stone-300'}`}>
                    {faq.q}
                  </span>
                  {isActive ? <Minus className="text-amber-500 flex-shrink-0" /> : <Plus className="text-stone-500 flex-shrink-0" />}
                </button>
                
                <AnimatePresence>
                  {isActive && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <p className="p-6 md:p-8 pt-0 text-stone-400 leading-relaxed border-t border-white/5 mt-2 bg-[#0a0a0a]">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </SpotlightCard>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}