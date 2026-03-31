'use client';
import { motion } from 'framer-motion';
import { ShieldCheck, Cloud, GitMerge, CheckCircle } from 'lucide-react';

const certs =[
  { name: "ISTQB Foundation Level", org: "International Software Testing Qualifications Board", icon: <ShieldCheck size={28} className="text-amber-400" /> },
  { name: "GitHub Copilot for Developers", org: "Microsoft Press", icon: <GitMerge size={28} className="text-amber-500" /> },
  { name: "VCTA - Data Center Virtualization", org: "VMware", icon: <Cloud size={28} className="text-yellow-400" /> },
  { name: "Infoblox Qualified DDI Associate", org: "Infoblox", icon: <CheckCircle size={28} className="text-orange-400" /> },
];

export default function Certifications() {
  return (
    <section className="w-full relative scroll-mt-32" id="certifications">
      <h3 className="text-3xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200 mb-8 tracking-tight">
        Verified Credentials
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {certs.map((cert, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
            className={`glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:-translate-y-1 transition-transform`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
            <div className="relative z-10 flex flex-col h-full justify-between gap-4">
              <div className="p-3 bg-black/40 rounded-xl w-fit backdrop-blur-md border border-amber-500/20 shadow-lg">
                {cert.icon}
              </div>
              <div>
                <h4 className="font-bold text-white text-lg leading-tight mb-1">{cert.name}</h4>
                <p className="text-sm text-slate-400 font-medium">{cert.org}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}