'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Shield, Music, Code2, Award, Briefcase, Mail, ChevronRight, Github, ExternalLink, Download, MapPin, Sparkles, Cpu, GitMerge, FileCode2, Layers, Cloud, Container } from 'lucide-react';
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
        className="fixed bottom-8 left-1/2 z-50 flex items-center gap-2 md:gap-4 px-4 py-3 rounded-full bg-[#121212]/90 backdrop-blur-xl border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.8)]"
      >
        <button onClick={() => scrollTo('hero')} className="p-3 rounded-full text-stone-400 hover:text-amber-500 hover:bg-white/5 transition-all group relative"><Terminal size={20}/><span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-xs font-bold px-2 py-1 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">Home</span></button>
        <button onClick={() => scrollTo('experience')} className="p-3 rounded-full text-stone-400 hover:text-amber-500 hover:bg-white/5 transition-all group relative"><Briefcase size={20}/><span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-xs font-bold px-2 py-1 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">Experience</span></button>
        <button onClick={() => scrollTo('contact')} className="p-3 rounded-full text-stone-400 hover:text-amber-500 hover:bg-white/5 transition-all group relative"><Mail size={20}/><span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-xs font-bold px-2 py-1 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">Contact</span></button>
        <div className="w-px h-6 bg-white/10 mx-2"></div>
        {/* 🚨 THE FIX: Changed to download the actual resume! */}
        <a href="/shivam-namdev-resume.pdf" download className="px-5 py-2.5 rounded-full bg-amber-500 text-black font-black text-sm hover:scale-105 transition-transform flex items-center gap-2">Resume <Download size={14}/></a>
      </motion.nav>

      {/* 🚨 THE MASSIVE, DENSE BENTO GRID */}
      <main className="relative z-10 max-w-[1200px] mx-auto px-4 pt-12 md:pt-20">
        
        <div id="hero" className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-5 auto-rows-[180px] md:auto-rows-[220px]">
          
          {/* BENTO 1: Main Intro */}
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
                Lead QA Engineer with 6.5+ years of experience in backend, microservices, and cloud-native applications. I build automated testing suites for REST APIs and containerized environments.
              </p>
            </div>
          </SpotlightCard>

          {/* BENTO 2: Profile Picture */}
          <SpotlightCard className="col-span-1 md:col-span-2 row-span-2 p-0 relative group">
            <img src="/shivam.png" alt="Shivam" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500 grayscale hover:grayscale-0" onError={(e) => e.currentTarget.style.display='none'} />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-white font-bold text-lg"><Briefcase className="text-amber-500" size={18}/> 6.5+ Years Exp.</div>
              <div className="flex items-center gap-2 text-stone-300 font-medium text-sm"><Award className="text-amber-500" size={16}/> ISTQB Certified QA</div>
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

          {/* BENTO 4: The Tech Architect */}
          <SpotlightCard className="col-span-1 md:col-span-2 row-span-1 p-6 flex flex-col justify-between bg-gradient-to-r from-stone-900 to-[#0a0a0a]">
            <div className="flex justify-between items-center">
              <p className="text-xs text-stone-500 font-bold uppercase tracking-widest">Core Philosophy</p>
              <div className="flex gap-2">
                <Cloud size={16} className="text-stone-400" />
                <Terminal size={16} className="text-stone-400" />
              </div>
            </div>
            <p className="text-stone-300 text-sm font-medium leading-relaxed">
              Proven expertise in API-driven systems, networking concepts (TCP/IP, DNS), and CI/CD pipelines across <strong className="text-white">AWS, Azure, and GCP.</strong>
            </p>
          </SpotlightCard>

          {/* BENTO 5: Containerization & Cloud */}
          <SpotlightCard className="col-span-1 md:col-span-2 row-span-1 p-6 overflow-hidden flex flex-col justify-center bg-[#0a0a0a]">
             <p className="text-xs text-stone-500 font-bold uppercase tracking-widest mb-4">Infrastructure & Scale</p>
             <div className="flex flex-wrap gap-2">
               {['Docker', 'Kubernetes', 'Jenkins', 'GitHub Actions', 'GitLab CI/CD'].map((skill, i) => (
                 <span key={i} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-stone-300">
                   {skill}
                 </span>
               ))}
             </div>
          </SpotlightCard>

          {/* BENTO 6: Measurable Impact / Metrics (Updated with Real Resume Numbers!) */}
          <SpotlightCard className="col-span-1 md:col-span-4 lg:col-span-6 row-span-1 p-0 flex flex-col justify-center bg-amber-500/5 border-amber-500/20">
            <div className="flex overflow-hidden py-4">
              <div className="flex animate-marquee whitespace-nowrap min-w-full">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-12 px-6">
                    <div className="flex items-center gap-3"><Layers size={32} className="text-amber-500"/><span className="text-2xl font-black text-white">+35% Test <span className="text-stone-500 text-lg font-medium">Coverage</span></span></div>
                    <div className="flex items-center gap-3"><Cpu size={32} className="text-amber-500"/><span className="text-2xl font-black text-white">-60% Manual <span className="text-stone-500 text-lg font-medium">Regression Efforts</span></span></div>
                    <div className="flex items-center gap-3"><Shield size={32} className="text-amber-500"/><span className="text-2xl font-black text-white">100+ Critical <span className="text-stone-500 text-lg font-medium">Issues Triaged</span></span></div>
                    <div className="flex items-center gap-3"><FileCode2 size={32} className="text-amber-500"/><span className="text-2xl font-black text-white">AWS & GCP <span className="text-stone-500 text-lg font-medium">Cloud Deployments</span></span></div>
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
            
            <SpotlightCard className="p-8 bg-[#0a0a0a]">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">Lead QA Engineer</h3>
                  <p className="text-amber-500 font-bold text-sm">Neurealm</p>
                </div>
                <span className="text-xs font-mono text-stone-500 bg-white/5 px-2 py-1 rounded">Aug 2025 - Present</span>
              </div>
              <ul className="space-y-2 text-stone-400 text-sm">
                <li className="flex gap-2"><span>▹</span> Defined QA strategy, led cross-team quality initiatives, and ensured consistent quality governance.</li>
                <li className="flex gap-2"><span>▹</span> Conducted technical interviews and drove onboarding plans for new hires.</li>
                <li className="flex gap-2"><span>▹</span> Mentored engineers to maintain high standards of test automation.</li>
              </ul>
            </SpotlightCard>

            <SpotlightCard className="p-8 bg-[#0a0a0a]">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">Senior QA Engineer</h3>
                  <p className="text-amber-500 font-bold text-sm">Neurealm</p>
                </div>
                <span className="text-xs font-mono text-stone-500 bg-white/5 px-2 py-1 rounded">Jul 2021 - Aug 2025</span>
              </div>
              <ul className="space-y-2 text-stone-400 text-sm">
                <li className="flex gap-2"><span>▹</span> Maintained automation framework ownership and CI/CD integration across multiple projects.</li>
                <li className="flex gap-2"><span>▹</span> Held release-level quality accountability for backend and cloud-native applications.</li>
                <li className="flex gap-2"><span>▹</span> Enhanced test data management within Docker/Kubernetes environments.</li>
              </ul>
            </SpotlightCard>

            <SpotlightCard className="p-8 bg-[#0a0a0a]">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">QA Engineer</h3>
                  <p className="text-stone-400 font-bold text-sm">Neurealm</p>
                </div>
                <span className="text-xs font-mono text-stone-500 bg-white/5 px-2 py-1 rounded">May 2019 - Jun 2021</span>
              </div>
              <ul className="space-y-2 text-stone-400 text-sm">
                <li className="flex gap-2"><span>▹</span> Executed UI and API testing, owned test execution cycles, and managed defect lifecycles from discovery to closure.</li>
                <li className="flex gap-2"><span>▹</span> Performed extensive backend and API testing covering DNS, DHCP, and networking-level validation.</li>
                <li className="flex gap-2"><span>▹</span> Debugged complex issues using logs, curl, and service-level traces.</li>
              </ul>
            </SpotlightCard>
            
            {/* The "Core Responsibilities" Highlights Block */}
            <SpotlightCard className="p-8 bg-gradient-to-br from-[#111] to-[#050505] border-amber-500/20">
              <h3 className="text-xl font-bold text-white mb-4">Core Automation Achievements</h3>
              <ul className="space-y-3 text-stone-300 text-sm leading-relaxed">
                <li className="flex items-start gap-2"><ChevronRight size={16} className="text-amber-500 shrink-0 mt-0.5"/> Designed automated testing suites for REST APIs using Python (Pytest + Requests), validating DHCP/DNS services.</li>
                <li className="flex items-start gap-2"><ChevronRight size={16} className="text-amber-500 shrink-0 mt-0.5"/> Integrated automated tests into Jenkins CI/CD pipelines in containerized environments.</li>
                <li className="flex items-start gap-2"><ChevronRight size={16} className="text-amber-500 shrink-0 mt-0.5"/> Validated deployments across AWS (EC2, S3, Lambda), Azure, and GCP ensuring absolute reliability.</li>
              </ul>
            </SpotlightCard>

          </div>
        </section>

        {/* 5. SKILLS RADAR & CERTIFICATIONS */}
        <section className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 mt-24">
          <SpotlightCard className="col-span-1 lg:col-span-2 p-8 bg-[#0a0a0a]">
            <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-2"><Code2 className="text-amber-500" /> Technical Arsenal</h3>
            
            <div className="space-y-6">
              <div>
                <p className="text-xs text-stone-500 font-bold uppercase tracking-widest mb-3">Automation & Scripting</p>
                <div className="flex flex-wrap gap-2">
                  {['PyTest', 'Selenium', 'Protractor', 'Jenkins', 'Python', 'Shell Scripting'].map((skill, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-lg border border-white/10 bg-[#121212] text-stone-300 font-mono text-xs">{skill}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-stone-500 font-bold uppercase tracking-widest mb-3">Cloud & Containerization</p>
                <div className="flex flex-wrap gap-2">
                  {['Docker', 'Kubernetes', 'AWS (EC2, S3, Lambda)', 'Azure', 'GCP', 'Terraform', 'ARM'].map((skill, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-lg border border-white/10 bg-[#121212] text-stone-300 font-mono text-xs">{skill}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-stone-500 font-bold uppercase tracking-widest mb-3">Networking & Management</p>
                <div className="flex flex-wrap gap-2">
                  {['TCP/IP', 'UDP', 'DNS', 'DHCP', 'SSL/TLS', 'JIRA', 'Azure Devops', 'TestRails'].map((skill, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-lg border border-white/10 bg-[#121212] text-stone-300 font-mono text-xs">{skill}</span>
                  ))}
                </div>
              </div>
            </div>
          </SpotlightCard>

          <div className="col-span-1 lg:col-span-1 flex flex-col gap-6">
            <SpotlightCard className="p-8 bg-[#0a0a0a] flex-grow">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Award className="text-amber-500" /> Certifications</h3>
              <div className="space-y-4">
                {[
                  { name: "ISTQB Foundation Level", org: "ITB" },
                  { name: "Azure Solution Architect Expert", org: "Microsoft (2021-22)" },
                  { name: "GCP Professional Cloud Architect", org: "Google (2024-26)" },
                  { name: "Associate Data Center Virtualization", org: "VMware" }
                ].map((cert, i) => (
                  <div key={i} className="pb-3 border-b border-white/5 last:border-0 last:pb-0">
                    <h4 className="text-stone-200 font-bold text-sm leading-tight">{cert.name}</h4>
                    <p className="text-stone-500 text-xs font-mono mt-1">{cert.org}</p>
                  </div>
                ))}
              </div>
            </SpotlightCard>
            
            <SpotlightCard className="p-6 bg-gradient-to-r from-amber-500/10 to-[#0a0a0a] border-amber-500/20">
              <h4 className="text-sm font-bold text-amber-500 uppercase tracking-widest mb-2">Honors</h4>
              <p className="text-white font-bold text-lg">Star Performer of the Quarter</p>
              <p className="text-stone-400 text-sm font-mono mt-1">2024</p>
            </SpotlightCard>
          </div>
        </section>

        {/* 6. CONTACT TERMINAL */}
        <section id="contact" className="w-full max-w-2xl mx-auto text-center pt-24">
          <h2 className="text-4xl font-display font-black text-white mb-4">Ready to <span className="text-amber-500">Collaborate?</span></h2>
          <p className="text-stone-400 mb-8">Whether you need enterprise automation architecture or a private consultation, my inbox is open.</p>
          
          <SpotlightCard className="p-8 bg-[#0a0a0a]">
            {/* Sending them to the main domain's API bypasses CORS limitations and triggers your email securely! */}
            <form action="https://shivamnamdev.com/api/send-email" method="POST" className="flex flex-col gap-4 text-left relative z-10">
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