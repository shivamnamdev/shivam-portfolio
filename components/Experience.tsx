'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { ChevronDown, Code2 } from 'lucide-react';

const exp =[
  {
    company: "Neurealm", role: "Technical Lead", dates: "August 2025 - Present (8 months)",
    bullets:[
      "Leading a cross-functional QA automation team to deliver scalable, maintainable test frameworks for enterprise-grade applications.",
      "Driving adoption of GitHub Copilot and agentic AI-assisted coding to cut automation development time by 30%.",
      "Setting QA strategy, defining KPIs, and mentoring engineers to improve test coverage and defect detection rates."
    ]
  },
  {
    company: "Neurealm", role: "Senior Software Engineer", dates: "July 2021 - August 2025 (4 years 2 months)",
    bullets:[
      "Designed and implemented Python + Pytest-based automation frameworks, reducing manual testing by 40% and improving release cycles by 25%.",
      "Led migration of existing Selenium suites to a modular architecture, reducing maintenance effort by 35%.",
      "Introduced Terraform-based test infrastructure for cloud environments.",
      "Championed test automation best practices, increasing API and UI automation coverage to >85%."
    ]
  },
  {
    company: "Neurealm", role: "Software Engineer", dates: "June 2019 - June 2021 (2 years 1 month)",
    bullets:[
      "Developed and maintained Selenium, Protractor, and Pytest automation suites for mission-critical applications.",
      "Implemented parallel test execution pipelines, improving regression testing speed by 50%.",
      "Collaborated with DevOps teams to integrate automated tests into CI/CD pipelines."
    ]
  },
  {
    company: "Neurealm", role: "Contract Software Engineer", dates: "December 2018 - May 2019 (6 months)",
    bullets:[
      "Built proof-of-concept automation scripts in Python and Selenium for client demos.",
      "Assisted in optimizing test data generation, reducing test preparation time by 20%."
    ]
  },
  {
    company: "Veritas Technologies LLC", role: "Intern", dates: "January 2018 - June 2018 (6 months)",
    bullets:[
      "Automated 3 major manual deployment tasks using Shell scripting.",
      "Collaborated with senior engineers to integrate automation scripts into existing workflows."
    ]
  }
];

export default function Experience() {
  const[openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="w-full relative" id="experience">
      <div className="flex items-center gap-4 mb-8">
        <h3 className="text-2xl font-bold text-white">Experience</h3>
        <div className="h-px bg-white/10 flex-grow" />
      </div>
      <div className="flex flex-col gap-4 relative">
        <div className="absolute left-6 top-6 bottom-6 w-px bg-white/10 hidden md:block" />
        {exp.map((job, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="glass-panel rounded-2xl md:ml-12 overflow-hidden">
            <button onClick={() => setOpenIndex(openIndex === i ? null : i)} className="w-full p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left hover:bg-white/5 transition-colors">
              <div>
                <h4 className="text-xl font-bold text-white">{job.role}</h4>
                <span className="text-blue-400 font-medium">{job.company}</span>
              </div>
              <div className="flex items-center gap-4 text-slate-400 text-sm">
                <span>{job.dates}</span>
                <motion.div animate={{ rotate: openIndex === i ? 180 : 0 }}><ChevronDown size={20}/></motion.div>
              </div>
            </button>
            <AnimatePresence>
              {openIndex === i && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <ul className="p-6 pt-0 space-y-3 text-slate-300 border-t border-white/5">
                    {job.bullets.map((bullet, idx) => (
                      <li key={idx} className="flex gap-3 text-sm md:text-base">
                        <Code2 size={18} className="text-blue-500 flex-shrink-0 mt-1" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </section>
  );
}