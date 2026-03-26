'use client';
import { motion } from 'framer-motion';
import { BookOpen, Award } from 'lucide-react';

const education =[
  { inst: "MAEER's Arts, Commerce, and Science College", degree: "Master’s, Computer Software Engineering", dates: "2015 - 2018" },
  { inst: "Berklee College of Music", degree: "Developing Musicianship, Production & Songwriting", dates: "2015" },
  { inst: "S.D. College of Management Studies", degree: "Bachelor’s, Computer Science", dates: "2012 - 2015" }
];

const certs =[
  { name: "Certified Tester Foundation Level (CTFL)", issuer: "ISTQB" },
  { name: "VMware Certified Technical Associate - DCV", issuer: "VMware (2023)" },
  { name: "Infoblox Qualified DDI Associate (DDIA)", issuer: "Infoblox" },
  { name: "Complete Guide to GitHub Copilot for Developers", issuer: "Microsoft Press" }
];

export default function Education() {
  return (
    <section className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12 scroll-mt-32">
      <div className="flex flex-col gap-6">
        <h3 className="text-2xl font-bold text-white flex items-center gap-3"><BookOpen className="text-blue-400" /> Academic Background</h3>
        <div className="space-y-4">
          {education.map((edu, i) => (
            <motion.div key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="p-5 rounded-2xl border border-white/10 bg-white/5">
              <h4 className="font-bold text-white mb-1">{edu.degree}</h4>
              <div className="flex justify-between items-center text-sm text-slate-400">
                <span>{edu.inst}</span>
                <span className="font-mono">{edu.dates}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <h3 className="text-2xl font-bold text-white flex items-center gap-3"><Award className="text-cyan-400" /> Certifications</h3>
        <div className="space-y-4">
          {certs.map((cert, i) => (
            <motion.div key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="p-5 rounded-2xl border border-white/10 bg-white/5">
              <h4 className="font-bold text-white mb-1">{cert.name}</h4>
              <span className="text-sm text-blue-400">{cert.issuer}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}