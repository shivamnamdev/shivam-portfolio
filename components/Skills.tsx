'use client';
import { motion } from 'framer-motion';

const skillCategories =[
  {
    title: "Test Automation",
    skills: ["Python", "Pytest", "Playwright", "Selenium", "Protractor"]
  },
  {
    title: "AI Tools & Workflows",
    skills:["GitHub Copilot", "Agentic AI", "Prompt Engineering"]
  },
  {
    title: "DevOps & Infrastructure",
    skills: ["Shell Scripting", "Terraform", "CI/CD Pipelines", "Parallel Execution"]
  },
  {
    title: "Methodologies & Leadership",
    skills:["QA Strategy", "Cross-functional Leadership", "KPI Definition", "Modular Architecture"]
  }
];

export default function Skills() {
  return (
    <section className="w-full relative scroll-mt-32">
      <h3 className="text-3xl font-bold text-white mb-8">Technical Skills</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {skillCategories.map((cat, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
            <h4 className="text-slate-300 font-medium mb-4">{cat.title}</h4>
            <div className="flex flex-wrap gap-2">
              {cat.skills.map(skill => (
                <span key={skill} className="px-3 py-1.5 rounded-md border border-white/10 bg-white/5 text-sm text-slate-300 hover:bg-blue-500/20 hover:text-blue-300 hover:border-blue-500/30 transition-colors cursor-default">
                  {skill}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}