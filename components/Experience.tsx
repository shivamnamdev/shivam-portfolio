'use client';
import { motion } from 'framer-motion';

const exp =[
  {
    company: "Neurealm", role: "Technical Lead", dates: "Aug 2025 - Present",
    bullets:[
      "Leading a cross-functional QA automation team to deliver scalable, maintainable test frameworks for enterprise-grade applications.",
      "Driving adoption of GitHub Copilot and agentic AI-assisted coding to cut automation development time by 30%.",
      "Setting QA strategy, defining KPIs, and mentoring engineers to improve test coverage and defect detection rates."
    ]
  },
  {
    company: "Neurealm", role: "Senior Software Engineer", dates: "Jul 2021 - Aug 2025",
    bullets:[
      "Designed and implemented Python + Pytest-based automation frameworks, reducing manual testing by 40% and improving release cycles by 25%.",
      "Led migration of existing Selenium suites to a modular architecture, reducing maintenance effort by 35%.",
      "Introduced Terraform-based test infrastructure for cloud environments.",
      "Championed test automation best practices, increasing API and UI automation coverage to >85%."
    ]
  },
  {
    company: "Neurealm", role: "Software Engineer", dates: "Jun 2019 - Jun 2021",
    bullets:[
      "Developed and maintained Selenium, Protractor, and Pytest automation suites for mission-critical applications.",
      "Implemented parallel test execution pipelines, improving regression testing speed by 50%.",
      "Collaborated with DevOps teams to integrate automated tests into CI/CD pipelines."
    ]
  },
  {
    company: "Neurealm", role: "Contract Software Engineer", dates: "Dec 2018 - May 2019",
    bullets:[
      "Built proof-of-concept automation scripts in Python and Selenium for client demos.",
      "Assisted in optimizing test data generation, reducing test preparation time by 20%."
    ]
  },
  {
    company: "Veritas Technologies LLC", role: "Intern", dates: "Jan 2018 - Jun 2018",
    bullets:[
      "Automated 3 major manual deployment tasks using Shell scripting, reducing deployment time by ~40% and minimizing human error.",
      "Collaborated with senior engineers to integrate automation scripts into existing workflows."
    ]
  }
];

export default function Experience() {
  return (
    <section className="w-full relative scroll-mt-32" id="experience">
      <h3 className="text-3xl font-bold text-white mb-12">Experience</h3>
      <div className="relative border-l border-white/10 ml-3 md:ml-4 space-y-12">
        {exp.map((job, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="relative pl-8 md:pl-12">
            <div className="absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
              <div>
                <h4 className="text-xl font-bold text-white">{job.role}</h4>
                <p className="text-blue-400 font-medium">{job.company}</p>
              </div>
              <span className="text-sm font-mono text-slate-400 px-3 py-1 rounded-full border border-white/10 bg-white/5 w-fit">{job.dates}</span>
            </div>
            <ul className="space-y-3 text-slate-300">
              {job.bullets.map((bullet, idx) => (
                <li key={idx} className="flex gap-3 text-sm leading-relaxed">
                  <span className="text-blue-500 mt-1.5 opacity-50">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </section>
  );
}