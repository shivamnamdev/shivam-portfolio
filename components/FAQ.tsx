'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

const faqs =[
  { q: "Do I need prior coding experience?", a: "Not at all. This course is built entirely from scratch. We start with 'What is Python?' and build up to advanced problem-solving." },
  { q: "What if I miss a live session?", a: "Every live session is recorded. You will get lifetime access to the recordings within 24 hours of the class." },
  { q: "Will I get a certificate?", a: "Yes! Upon successfully completing the capstone project, you will receive a verifiable Certificate of Completion." },
  { q: "How are my doubts resolved?", a: "During the live sessions, we have dedicated Q&A time. Plus, you will have access to a private group to ask questions anytime." }
];

export default function FAQ() {
  const[openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="w-full relative z-10 py-20 max-w-3xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-display font-black text-stone-900 mb-4">Frequently Asked Questions</h2>
      </div>

      <div className="flex flex-col gap-4">
        {faqs.map((faq, i) => {
          const isActive = openIndex === i;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="border border-stone-200 rounded-2xl bg-white overflow-hidden shadow-sm">
              <button onClick={() => setOpenIndex(isActive ? null : i)} className="w-full p-6 flex items-center justify-between text-left hover:bg-stone-50 transition-colors">
                <span className="font-bold text-stone-800 text-lg">{faq.q}</span>
                {isActive ? <Minus className="text-amber-500" /> : <Plus className="text-stone-400" />}
              </button>
              <AnimatePresence>
                {isActive && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <p className="p-6 pt-0 text-stone-600 leading-relaxed border-t border-stone-100 mt-2">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}