import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppWidget from "@/components/WhatsAppWidget";
import SpotlightCard from "@/components/SpotlightCard";
import Link from "next/link";
import { ArrowUpRight, Terminal, BookOpen, BrainCircuit, ShieldAlert, FileCode2 } from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-black flex flex-col selection:bg-amber-500/30">
      
      {/* Background Grid & Glow */}
      <div className="absolute inset-0 bg-grid-pattern z-0" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-amber-500/15 blur-[150px] rounded-full pointer-events-none z-0" />
      
      <Navbar />
      
      <main className="flex-grow flex flex-col items-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32 w-full relative z-10">
        
        {/* HERO SECTION */}
        <section className="w-full flex flex-col items-center text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-sm text-stone-300 font-medium mb-8 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            System Architecture & Automation Lead
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-display font-black tracking-tighter text-white max-w-5xl leading-[1.05] mb-6 drop-shadow-2xl">
            Building the future of <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600">
              Tech Mastery.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-stone-400 font-medium max-w-2xl leading-relaxed mb-10">
            QA Leadership, Agentic AI, and Python Engineering. I help ambitious professionals escape tutorial hell and build enterprise-grade systems.
          </p>
        </section>

        {/* 🚨 THE BENTO GRID */}
        <section className="w-full grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[250px]">
          
          {/* Card 1: The Introduction (Large) */}
          <SpotlightCard className="md:col-span-2 lg:col-span-2 row-span-2 flex flex-col p-8 md:p-10 justify-between bg-gradient-to-br from-[#0a0a0a] to-[#121212]">
            <div className="flex justify-between items-start">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Terminal size={28} className="text-amber-500" />
              </div>
              <span className="text-xs font-mono text-stone-500 uppercase tracking-widest border border-white/10 px-3 py-1 rounded-full">About Me</span>
            </div>
            
            <div className="mt-8">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">I am Shivam Namdev.</h2>
              <p className="text-stone-400 text-lg leading-relaxed mb-8">
                From the World Karate Championships to Classical Piano, and now scaling enterprise Test Automation frameworks. I believe excellence is a habit. I built this platform to teach that habit.
              </p>
              <Link href="/about" className="inline-flex items-center gap-2 text-white font-bold group">
                Read My Story <ArrowUpRight size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform text-amber-500" />
              </Link>
            </div>
          </SpotlightCard>

          {/* Card 2: The Academy (Medium) */}
          <SpotlightCard className="md:col-span-1 lg:col-span-2 row-span-1 flex flex-col p-8 justify-center relative overflow-hidden group">
            <div className="absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:opacity-20 transition-opacity">
              <BookOpen size={150} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 z-10">Shivam Academy</h3>
            <p className="text-stone-400 mb-6 z-10 max-w-sm">Join interactive live cohorts. Master Python, DevOps, and Automation.</p>
            <Link href="/courses" className="inline-flex items-center justify-center w-fit px-6 py-3 rounded-xl bg-white text-black font-bold hover:scale-105 transition-transform z-10">
              Explore Courses
            </Link>
          </SpotlightCard>

          {/* Card 3: AI Tech (Small) */}
          <SpotlightCard className="md:col-span-1 lg:col-span-1 row-span-1 p-8 flex flex-col justify-between group">
            <BrainCircuit size={32} className="text-purple-400 mb-4 group-hover:scale-110 transition-transform" />
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Agentic AI</h3>
              <p className="text-sm text-stone-400">Integrated AI Code Tutors & Smart Assignments.</p>
            </div>
          </SpotlightCard>

          {/* Card 4: Mentorship (Small) */}
          <SpotlightCard className="md:col-span-1 lg:col-span-1 row-span-1 p-8 flex flex-col justify-between group bg-amber-500/5">
            <ShieldAlert size={32} className="text-amber-500 mb-4 group-hover:scale-110 transition-transform" />
            <div>
              <h3 className="text-xl font-bold text-white mb-1">1-on-1 Mentorship</h3>
              <p className="text-sm text-stone-400 mb-4">Architecture advice & career coaching.</p>
              <Link href="/mentorship" className="text-xs font-bold text-amber-500 flex items-center gap-1 uppercase tracking-widest hover:text-amber-400">
                Apply Now <ArrowUpRight size={14} />
              </Link>
            </div>
          </SpotlightCard>

          {/* Card 5: The In-Browser IDE (Wide) */}
          <SpotlightCard className="md:col-span-3 lg:col-span-4 row-span-1 p-0 flex flex-col md:flex-row overflow-hidden border border-white/10">
            <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col justify-center">
              <span className="text-xs font-mono text-green-400 mb-4 bg-green-400/10 w-fit px-3 py-1 rounded-full border border-green-400/20">NO INSTALLATION REQUIRED</span>
              <h3 className="text-3xl font-bold text-white mb-4">In-Browser Practice Labs.</h3>
              <p className="text-stone-400 mb-6">Write Python, execute code, and pass automated test cases directly inside our proprietary web-based IDE.</p>
              <Link href="/courses" className="text-sm font-bold text-white flex items-center gap-2 group">
                Try it out <ArrowUpRight size={16} className="text-green-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </Link>
            </div>
            
            {/* Fake Code Editor Graphic */}
            <div className="w-full md:w-1/2 bg-[#0d1117] border-l border-stone-800 p-6 font-mono text-sm leading-relaxed overflow-hidden relative">
               <div className="absolute top-0 left-0 w-full h-8 bg-[#161b22] border-b border-stone-800 flex items-center px-4 gap-2">
                 <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                 <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                 <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                 <span className="ml-2 text-stone-500 text-xs">main.py</span>
               </div>
               <div className="mt-6 text-stone-300">
                 <span className="text-purple-400">def</span> <span className="text-blue-400">master_python</span>():<br/>
                 &nbsp;&nbsp;&nbsp;&nbsp;print(<span className="text-green-400">"Welcome to Shivam Academy"</span>)<br/>
                 &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-purple-400">return</span> <span className="text-amber-400">True</span><br/><br/>
                 <span className="text-stone-500"># Run the execution</span><br/>
                 <span className="text-blue-400">master_python</span>()
               </div>
               {/* Fade out gradient */}
               <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-[#0d1117] to-transparent"></div>
            </div>
          </SpotlightCard>

        </section>

      </main>
      
      <Footer />
      <WhatsAppWidget />
    </div>
  );
}