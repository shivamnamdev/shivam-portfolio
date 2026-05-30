'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Shield, Music, Code2, Award, Briefcase, Mail, ChevronRight, Download, MapPin, Sparkles, Cpu, GitMerge, FileCode2, Layers } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard'; 

export default function PortfolioPage() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour12: true, hour: 'numeric', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-amber-500/30 font-sans pb-32">
      
      {/* Background Cyber Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.15]"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)'
        }}
      />

      {/* FLOATING MAC-STYLE DOCK */}
      <motion.nav 
        initial={{ y: 100, opacity: 0, x: '-50%' }} animate={{ y: 0, opacity: 1, x: '-50%' }} transition={{ delay: 0.5, duration: 0.8 }}
        className="fixed bottom-8 left-1/2 z-50 flex items-center gap-2 px-3 py-2 rounded-full bg-[#121212]/90 backdrop-blur-xl border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.8)]"
      >
        <button onClick={() => scrollTo('hero')} className="p-3 rounded-full text-stone-400 hover:text-amber-500 hover:bg-white/5 transition-all group relative"><Terminal size={20}/><span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-xs font-bold px-2 py-1 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">Home</span></button>
        <button onClick={() => scrollTo('experience')} className="p-3 rounded-full text-stone-400 hover:text-amber-500 hover:bg-white/5 transition-all group relative"><Briefcase size={20}/><span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-xs font-bold px-2 py-1 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">Experience</span></button>
        <button onClick={() => scrollTo('contact')} className="p-3 rounded-full text-stone-400 hover:text-amber-500 hover:bg-white/5 transition-all group relative"><Mail size={20}/><span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-xs font-bold px-2 py-1 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">Contact</span></button>
        <div className="w-px h-6 bg-white/10 mx-2"></div>
        <button onClick={() => window.open('/python-syllabus.pdf', '_blank')} className="px-5 py-2.5 rounded-full bg-amber-500 text-black font-black text-sm hover:scale-105 transition-transform flex items-center gap-2">Resume <Download size={14}/></button>
      </motion.nav>

      {/* 🚨 THE MASSIVE, DENSE BENTO GRID */}
      <main className="relative z-10 max-w-[1200px] mx-auto px-4 pt-12 md:pt-20">
        
        <div id="hero" className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-5 auto-rows-[180px] md:auto-rows-[220px]">
          
          {/* BENTO 1: Main Intro (Spans 4 columns) */}
          <SpotlightCard className="col-span-1 md:col-span-4 row-span-2 p-8 md:p-12 flex flex-col justify-between bg-gradient-to-br from-[#111] to-black">
            <div className="flex justify-between items-start">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-xs text-amber-500 font-bold uppercase tracking-widest">
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span></span>
                Available for Roles
              </div>
              <Code2 className="text-stone-700" size={32} />
            </div>
            
            <div>
              <h1 className="text-5xl md:text-7xl font-display font-black tracking-tighter text-white leading-[1.1] mb-4">
                Shivam <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Namdev.</span>
              </h1>
              <p className="text-lg md:text-xl text-stone-400 font-medium max-w-2xl leading-relaxed">
                QA Lead & Agentic AI Specialist. I design scalable, reliable Test Automation Frameworks and eliminate fragile testing pipelines.
              </p>
            </div>
          </SpotlightCard>

          {/* BENTO 2: Profile Picture / Vibe (Spans 2 columns) */}
          <SpotlightCard className="col-span-1 md:col-span-2 row-span-2 p-0 relative group">
            <img src="/shivam.png" alt="Shivam" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500 grayscale hover:grayscale-0" onError={(e) => e.currentTarget.style.display='none'} />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <div className="flex items-center gap-2 text-white font-bold text-lg"><Briefcase className="text-amber-500" size={18}/> 7+ Years Exp.</div>
            </div>
          </SpotlightCard>

          {/* BENTO 3: Location / Time Zone */}
          <SpotlightCard className="col-span-1 md:col-span-2 row-span-1 p-6 flex flex-col justify-between relative overflow-hidden bg-[#0a0a0a]">
            <MapPin className="absolute -right-4 -bottom-4 text-white/5" size={120} />
            <div>
              <p className="text-xs text-stone-500 font-bold uppercase tracking-widest mb-1">Base of Operations</p>
              <h3 className="text-xl font-bold text-white">Pune, India</h3>
            </div>
            <div>
              <p className="text-3xl font-black text-amber-500 font-mono">{time || "IST"}</p>
              <p className="text-xs text-stone-400 font-mono mt-1">Ready for global collaboration</p>
            </div>
          </SpotlightCard>

          {/* BENTO 4: The Unique Story (Martial Arts -> Music -> Code) */}
          <SpotlightCard className="col-span-1 md:col-span-2 row-span-1 p-6 flex flex-col justify-between bg-gradient-to-r from-stone-900 to-[#0a0a0a]">
            <div className="flex justify-between items-center">
              <p className="text-xs text-stone-500 font-bold uppercase tracking-widest">The Journey</p>
              <div className="flex gap-2">
                <Shield size={16} className="text-stone-400" />
                <Music size={16} className="text-stone-400" />
              </div>
            </div>
            <p className="text-stone-300 text-sm font-medium leading-relaxed">
              From the World Karate Championships to Berklee Music Production, and now Enterprise Tech. <strong className="text-white">Excellence is a habit, not a one-time act.</strong>
            </p>
          </SpotlightCard>

          {/* BENTO 5: Tech Stack Wall */}
          <SpotlightCard className="col-span-1 md:col-span-2 row-span-1 p-6 overflow-hidden flex flex-col justify-center bg-[#0a0a0a]">
             <p className="text-xs text-stone-500 font-bold uppercase tracking-widest mb-4">Tech Arsenal</p>
             <div className="flex flex-wrap gap-2">
               {['Python', 'Pytest', 'Playwright', 'Selenium', 'Terraform', 'Copilot', 'CI/CD'].map((skill, i) => (
                 <span key={i} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-stone-300">
                   {skill}
                 </span>
               ))}
             </div>
          </SpotlightCard>

          {/* BENTO 6: Measurable Impact / Metrics (Spans Full Width) */}
          <SpotlightCard className="col-span-1 md:col-span-4 lg:col-span-6 row-span-1 p-0 flex flex-col justify-center bg-amber-500/5 border-amber-500/20">
            <div className="flex overflow-hidden py-4">
              {/* Marquee Animation (Ensure animate-marquee is in tailwind.config) */}
              <div className="flex animate-marquee whitespace-nowrap min-w-full">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-12 px-6">
                    <div className="flex items-center gap-3"><Cpu size={32} className="text-amber-500"/><span className="text-2xl font-black text-white">-30% Dev Time <span className="text-stone-500 text-lg font-medium">via Copilot AI</span></span></div>
                    <div className="flex items-center gap-3"><Layers size={32} className="text-amber-500"/><span className="text-2xl font-black text-white">-40% Manual <span className="text-stone-500 text-lg font-medium">Testing Effort</span></span></div>
                    <div className="flex items-center gap-3"><GitMerge size={32} className="text-amber-500"/><span className="text-2xl font-black text-white">+50% Speed <span className="text-stone-500 text-lg font-medium">in Regression</span></span></div>
                    <div className="flex items-center gap-3"><FileCode2 size={32} className="text-amber-500"/><span className="text-2xl font-black text-white">>85% Coverage <span className="text-stone-500 text-lg font-medium">API & UI</span></span></div>
                  </div>
                ))}
              </div>
            </div>
          </SpotlightCard>

        </div>

        {/* 🚨 THE COMPACT EXPERIENCE TIMELINE */}
        <section id="experience" className="w-full mt-24">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-black text-white">Experience</h2>
            <div className="h-px bg-white/10 flex-grow ml-8"></div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Job 1 */}
            <SpotlightCard className="p-8 bg-[#0a0a0a]">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">Technical Lead</h3>
                  <p className="text-amber-500 font-bold text-sm">Neurealm</p>
                </div>
                <span className="text-xs font-mono text-stone-500 bg-white/5 px-2 py-1 rounded">Aug 2025 - Present</span>
              </div>
              <ul className="space-y-2 text-stone-400 text-sm">
                <li className="flex gap-2"><span>▹</span> Leading a cross-functional QA automation team for enterprise apps.</li>
                <li className="flex gap-2"><span>▹</span> Driving adoption of GitHub Copilot and agentic AI-assisted coding.</li>
                <li className="flex gap-2"><span>▹</span> Setting QA strategy and mentoring engineers to improve defect detection.</li>
              </ul>
            </SpotlightCard>

            {/* Job 2 */}
            <SpotlightCard className="p-8 bg-[#0a0a0a]">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">Senior Software Eng.</h3>
                  <p className="text-amber-500 font-bold text-sm">Neurealm</p>
                </div>
                <span className="text-xs font-mono text-stone-500 bg-white/5 px-2 py-1 rounded">Jul 2021 - Aug 2025</span>
              </div>
              <ul className="space-y-2 text-stone-400 text-sm">
                <li className="flex gap-2"><span>▹</span> Designed Python + Pytest frameworks, reducing manual testing by 40%.</li>
                <li className="flex gap-2"><span>▹</span> Led migration of existing Selenium suites to modular architecture.</li>
                <li className="flex gap-2"><span>▹</span> Introduced Terraform-based test infrastructure for cloud environments.</li>
              </ul>
            </SpotlightCard>

            {/* Job 3 */}
            <SpotlightCard className="p-8 bg-[#0a0a0a]">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">Software Engineer</h3>
                  <p className="text-stone-400 font-bold text-sm">Neurealm</p>
                </div>
                <span className="text-xs font-mono text-stone-500 bg-white/5 px-2 py-1 rounded">Dec 2018 - Jun 2021</span>
              </div>
              <p className="text-stone-400 text-sm">Developed Selenium, Protractor, and Pytest automation suites for mission-critical applications. Implemented parallel test execution pipelines, improving speed by 50%.</p>
            </SpotlightCard>

            {/* Job 4 */}
            <SpotlightCard className="p-8 bg-[#0a0a0a]">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">Intern</h3>
                  <p className="text-stone-400 font-bold text-sm">Veritas Technologies</p>
                </div>
                <span className="text-xs font-mono text-stone-500 bg-white/5 px-2 py-1 rounded">Jan 2018 - Jun 2018</span>
              </div>
              <p className="text-stone-400 text-sm">Automated 3 major manual deployment tasks using Shell scripting, reducing deployment time by ~40% and minimizing human error.</p>
            </SpotlightCard>
          </div>
        </section>

        {/* 🚨 CONTACT / CERTIFICATIONS */}
        <section id="contact" className="w-full mt-24 grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <SpotlightCard className="col-span-1 lg:col-span-1 p-8 bg-[#0a0a0a]">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Award className="text-amber-500" /> Certifications</h3>
            <div className="space-y-4">
              {[
                { name: "Certified Tester Foundation Level (CTFL)", org: "ISTQB" },
                { name: "VMware Certified Technical Associate - DCV", org: "VMware (2023)" },
                { name: "Qualified DDI Associate (DDIA)", org: "Infoblox" },
                { name: "Complete Guide to GitHub Copilot", org: "Microsoft Press" }
              ].map((cert, i) => (
                <div key={i} className="pb-4 border-b border-white/5 last:border-0 last:pb-0">
                  <h4 className="text-stone-200 font-bold text-sm">{cert.name}</h4>
                  <p className="text-stone-500 text-xs font-mono mt-1">{cert.org}</p>
                </div>
              ))}
            </div>
          </SpotlightCard>

          <SpotlightCard className="col-span-1 lg:col-span-2 p-8 md:p-12 bg-gradient-to-br from-[#121212] to-black">
            <h2 className="text-3xl md:text-4xl font-display font-black text-white mb-2">Ready to <span className="text-amber-500">Collaborate?</span></h2>
            <p className="text-stone-400 mb-8">Whether you need enterprise automation architecture or a private consultation, my inbox is open.</p>
            
            {/* Form posts to your custom email API! */}
            <form action="https://shivamnamdev.com/api/send-email" method="POST" className="flex flex-col gap-4 relative z-10">
              <input type="hidden" name="subject" value="New Inquiry from Portfolio Website!" />
              <div className="flex flex-col sm:flex-row gap-4">
                <input type="text" name="name" required placeholder="Your Name" className="w-full px-5 py-4 rounded-xl border border-white/10 bg-black text-white focus:outline-none focus:border-amber-500 transition-all font-sans" />
                <input type="email" name="email" required placeholder="Your Email" className="w-full px-5 py-4 rounded-xl border border-white/10 bg-black text-white focus:outline-none focus:border-amber-500 transition-all font-sans" />
              </div>
              <textarea name="message" required rows={4} placeholder="How can I help you?" className="w-full px-5 py-4 rounded-xl border border-white/10 bg-black text-white focus:outline-none focus:border-amber-500 transition-all resize-none font-sans" />
              <button type="submit" className="w-full py-4 rounded-xl bg-amber-500 text-black font-black text-lg flex items-center justify-center gap-2 hover:bg-amber-400 transition-colors mt-2">
                Send Transmission <Mail size={18} />
              </button>
            </form>
          </SpotlightCard>

        </section>

      </main>
    </div>
  );
}