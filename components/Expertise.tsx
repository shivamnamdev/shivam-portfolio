'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { ChevronDown, Code2 } from 'lucide-react';

const exp =[
  {
    company: "Neurealm", role: "Technical Lead", dates: "August 2025 - Present",
    bullets:[
      "Leading a cross-functional QA automation team to deliver scalable, maintainable test frameworks for enterprise-grade applications.",
      "Driving adoption of GitHub Copilot and agentic AI-assisted coding to cut automation development time by 30%.",
      "Setting QA strategy, defining KPIs, and mentoring engineers to improve test coverage and defect detection rates."
    ]
  },
  {
    company: "Neurealm", role: "Senior Software Engineer", dates: "July 2021 - August 2025",
    bullets:[
      "Designed and implemented Python + Pytest-based automation frameworks, reducing manual testing by 40% and improving release cycles by 25%.",
      "Led migration of existing Selenium suites to a modular architecture, reducing maintenance effort by 35%.",
      "Introduced Terraform-based test infrastructure for cloud environments.",
      "Championed test automation best practices, increasing API and UI automation coverage to >85%."
    ]
  },
  {
    company: "Neurealm", role: "Software Engineer", dates: "June 2019 - June 2021",
    bullets:[
      "Developed and maintained Selenium, Protractor, and Pytest automation suites for mission-critical applications.",
      "Implemented parallel test execution pipelines, improving regression testing speed by 50%.",
      "Collaborated with DevOps teams to integrate automated tests into CI/CD pipelines."
    ]
  },
  {
    company: "Neurealm", role: "Contract Software Engineer", dates: "December 2018 - May 2019",
    bullets:[
      "Built proof-of-concept automation scripts in Python and Selenium for client demos.",
      "Assisted in optimizing test data generation, reducing test preparation time by 20%."
    ]
  },
  {
    company: "Veritas Technologies LLC", role: "Intern", dates: "January 2018 - June 2018",
    bullets:[
      "Automated 3 major manual deployment tasks using Shell scripting.",
      "Collaborated with senior engineers to integrate automation scripts into existing workflows."
    ]
  }
];

export default function Experience() {
  const[openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="w-full relative scroll-mt-32" id="experience">
      <div className="flex flex-col mb-12">
        <h3 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500 mb-4 tracking-tight">
          Experience
        </h3>
      </div>
      
      <div className="flex flex-col gap-6 relative">
        <div className="absolute left-6 top-6 bottom-6 w-px bg-gradient-to-b from-blue-500/50 via-white/10 to-transparent hidden md:block" />
        
        {exp.map((job, i) => {
          const isActive = openIndex === i;
          return (
            <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} 
              className={`glass-panel rounded-3xl md:ml-12 overflow-hidden transition-all duration-500 ${isActive ? 'border-l-4 border-l-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.15)] bg-white/[0.08]' : 'hover:bg-white/[0.06]'}`}
            >
              <button onClick={() => setOpenIndex(isActive ? null : i)} className="w-full p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
                <div>
                  <h4 className={`text-xl md:text-2xl font-bold transition-colors ${isActive ? 'text-white' : 'text-slate-300'}`}>{job.role}</h4>
                  <span className="text-blue-400 font-semibold tracking-wide text-sm uppercase mt-1 block">{job.company}</span>
                </div>
                <div className="flex items-center gap-4 text-slate-400 text-sm font-mono bg-black/20 px-4 py-2 rounded-full border border-white/5">
                  <span>{job.dates}</span>
                  <motion.div animate={{ rotate: isActive ? 180 : 0 }} transition={{ duration: 0.3 }}><ChevronDown size={18}/></motion.div>
                </div>
              </button>
              
              <AnimatePresence>
                {isActive && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: "easeInOut" }} className="overflow-hidden">
                    <ul className="p-6 md:p-8 pt-0 space-y-4 text-slate-300 border-t border-white/5 mt-2">
                      {job.bullets.map((bullet, idx) => (
                        <motion.li key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }} className="flex gap-4 text-base leading-relaxed">
                          <Code2 size={20} className="text-blue-500 flex-shrink-0 mt-0.5 opacity-80" />
                          <span>{bullet}</span>
                        </motion.li>
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