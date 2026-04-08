'use client';
import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';
import { testimonials } from '@/data/testimonials';

export default function Testimonials() {
  if (!testimonials || testimonials.length === 0) return null;

  return (
    <section className="w-full relative z-10 py-20 border-t border-stone-200 bg-stone-50/50">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-stone-900 to-stone-600 mb-4">Student Success Stories</h2>
        <p className="text-stone-500">Don't just take my word for it. Here's what others have experienced.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto px-4">
        {testimonials.map((test, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
            className="glass-panel p-8 rounded-3xl border border-stone-200 bg-white relative shadow-sm hover:shadow-md transition-shadow"
          >
            <Quote size={40} className="text-amber-500/20 absolute top-6 right-6" />
            <p className="text-stone-600 italic mb-6 relative z-10">"{test.text}"</p>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xl">
                {test.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-stone-900">{test.name}</h4>
                <p className="text-xs text-stone-500">{test.role}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}