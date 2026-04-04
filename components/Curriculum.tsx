'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { ChevronDown, Code2 } from 'lucide-react';

const modules =[
  {
    title: "Module 1: Python & Pytest Foundations",
    lessons:["Setting up the Ultimate Developer Environment", "Advanced Python Concepts for QA", "Pytest Fixtures, Markers, and Parametrization"]
  },
  {
    title: "Module 2: Playwright & Modular Architecture",
    lessons:["Why Playwright beats Selenium in 2026", "Designing Page Object Models (POM) that scale", "Handling Authentication & Intercepting APIs"]
  },
  {
    title: "Module 3: Infrastructure & Parallel Execution",
    lessons:["Integrating tests directly into CI/CD Pipelines", "Running 100+ tests concurrently", "Dockerizing your test environment"]
  },
  {
    title: "Module 4: Agentic AI & GitHub Copilot Mastery",
    lessons:["Prompt Engineering for QA Automation", "Using Copilot to generate test data instantly", "Building an Autonomous Test Generation Agent"]
  }
];

export default function Curriculum() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="w-full relative scroll-mt-32 z-10" id="curriculum">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-stone-900 to-stone-600 mb-4">Course Curriculum</h2>
        <p className="text-stone-500">Everything you need to go from Manual QA to AI Automation Lead.</p>
      </div>

      <div className="flex flex-col gap-4 max-w-4xl mx-auto">
        {modules.map((mod, i) => {
          const isActive = openIndex === i;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={`glass-panel rounded-2xl overflow-hidden transition-all border ${isActive ? 'border-amber-400 bg-amber-50/50' : 'border-stone-200 hover:bg-stone-50/50'}`}>
              <button onClick={() => setOpenIndex(isActive ? null : i)} className="w-full p-6 flex items-center justify-between text-left">
                <h4 className={`text-xl font-bold ${isActive ? 'text-amber-600' : 'text-stone-700'}`}>{mod.title}</h4>
                <motion.div animate={{ rotate: isActive ? 180 : 0 }}><ChevronDown className="text-stone-400"/></motion.div>
              </button>
              <AnimatePresence>
                {isActive && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <ul className="p-6 pt-0 space-y-4 border-t border-stone-200 mt-2">
                      {mod.lessons.map((lesson, idx) => (
                        <li key={idx} className="flex items-center gap-3 text-stone-600">
                          <Code2 size={16} className="text-amber-500 opacity-80" /> {lesson}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </section>
  );
}