import Navbar from "@/components/Navbar";
import LeadMagnet from "@/components/LeadMagnet";
import Footer from "@/components/Footer";
import WhatsAppWidget from "@/components/WhatsAppWidget";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Briefcase, ChevronRight } from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow flex flex-col items-center max-w-7xl mx-auto px-6 sm:px-12 pt-20 md:pt-32 pb-20 w-full">
        
        {/* 1. The Personal Branding Hero */}
        <section className="w-full flex flex-col items-center text-center mb-24 relative z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-stone-200 bg-white/50 text-sm text-stone-600 font-bold mb-8 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Accepting new students for 2026 Cohorts
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-black tracking-tighter text-stone-900 max-w-5xl leading-[1.1] mb-6">
            I help QA Engineers become <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-400">Automation Leaders.</span>
          </h1>

          <p className="text-lg md:text-xl text-stone-500 font-medium max-w-2xl leading-relaxed mb-10">
            Learn the exact Python, Pytest, and Agentic AI frameworks I use to cut enterprise testing cycles by 50%. No fluff. Just real-world engineering.
          </p>
        </section>


        {/* 2. The Featured Pathways Grid */}
        <section className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-32 relative z-10">
          
          {/* Pathway 1: Courses */}
          <Link href="/courses" className="group glass-panel p-8 md:p-10 rounded-3xl border-2 border-stone-200 bg-white shadow-sm hover:shadow-2xl hover:border-amber-400 transition-all duration-300 flex flex-col items-start relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[40px] group-hover:bg-amber-500/20 transition-colors" />
            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-6 border border-amber-200">
              <BookOpen size={28} className="text-amber-600" />
            </div>
            <h2 className="text-3xl font-black text-stone-900 mb-3">Live Courses</h2>
            <p className="text-stone-500 mb-8 flex-grow">
              Join my intensive 45-day cohorts. Build strong logic, write Python confidently, and master Agentic AI.
            </p>
            <div className="flex items-center gap-2 text-amber-600 font-bold group-hover:gap-4 transition-all">
              View Catalog <ArrowRight size={20} />
            </div>
          </Link>

          {/* Pathway 2: Consulting/Mentorship */}
          {/* 🚨 THE FIX: Added ?subject=mentorship to the URL */}
          <Link href="/mentorship" className="group glass-panel p-8 md:p-10 rounded-3xl border border-stone-200 bg-stone-50 shadow-sm hover:shadow-xl hover:border-stone-300 transition-all duration-300 flex flex-col items-start relative">
            <div className="w-14 h-14 rounded-2xl bg-stone-200 flex items-center justify-center mb-6 border border-stone-300">
              <Briefcase size={28} className="text-stone-700" />
            </div>
            <h2 className="text-3xl font-black text-stone-900 mb-3">1-on-1 Mentorship</h2>
            <p className="text-stone-500 mb-8 flex-grow">
              Need architectural advice for your company's QA framework? Or private career coaching? Let's talk.
            </p>
            <div className="flex items-center gap-2 text-stone-900 font-bold group-hover:gap-4 transition-all">
              Book a Call <ArrowRight size={20} />
            </div>
          </Link>

        </section>

        {/* 3. The Lead Magnet (Email Capture) */}
        <LeadMagnet />
        
      </main>
      
      <Footer />
      <WhatsAppWidget />
    </div>
  );
}