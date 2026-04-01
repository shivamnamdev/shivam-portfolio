'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const codeLines =[
  "shivam@neurealm:~$ ./load_profile.sh",
  "> Initializing chronological data...",
  "",
  "[🥋] Phase 1: The Dojo",
  "Selected for Asian & World Karate Championships at 17.",
  "Skill Acquired: Unbreakable discipline & resilience.",
  "",
  "[🎹] Phase 2: The Symphony",
  "Studied ABRSM syllabus, wrote and composed music.",
  "Skill Acquired: Mastery of craft through relentless practice.",
  "",
  "[💻] Phase 3: Technical Leadership",
  "Designing scalable QA automation (Python, Pytest, Agentic AI).",
  "Eradicating slow, fragile testing processes.",
  "",
  "> Output: \"Excellence is a habit, not a one-time act.\"",
  "shivam@neurealm:~$ "
];

export default function Terminal() {
  const [lines, setLines] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setLines([]);
    setIsComplete(false);
    
    let currentLine = 0;
    const interval = setInterval(() => {
      if (currentLine < codeLines.length) {
        const nextLine = codeLines[currentLine];
        if (nextLine !== undefined) {
          setLines(prev =>[...prev, nextLine]);
        }
        currentLine++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, 400); // Speed of the typing effect

    return () => clearInterval(interval);
  },[]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.4, duration: 0.8 }}
      className="w-full max-w-2xl rounded-xl overflow-hidden border border-white/10 shadow-[0_8px_32px_rgba(245,158,11,0.15)] bg-[#0a0a0b]/80 backdrop-blur-xl font-mono text-xs sm:text-sm mt-4"
    >
      {/* Terminal Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/5">
        <div className="w-3 h-3 rounded-full bg-red-500/80" />
        <div className="w-3 h-3 rounded-full bg-amber-500/80" />
        <div className="w-3 h-3 rounded-full bg-green-500/80" />
        <span className="ml-2 text-slate-400 text-xs font-sans">bash — profile_data</span>
      </div>
      
      {/* Terminal Body */}
      <div className="p-5 text-slate-300 min-h-[260px] flex flex-col gap-1.5 leading-relaxed">
        {lines.map((line, i) => (
          <div key={i} className={`
            ${line?.startsWith('shivam@') ? 'text-amber-400 font-bold' : ''}
            ${line?.startsWith('>') ? 'text-blue-400' : ''}
            ${line?.includes('Skill Acquired') ? 'text-emerald-400' : ''}
          `}>
            {line}
            {/* Blinking cursor effect on the active line or at the end */}
            {i === lines.length - 1 && !isComplete && (
              <span className="inline-block w-2 h-4 bg-amber-500 animate-pulse ml-1 align-middle" />
            )}
            {i === lines.length - 1 && isComplete && line?.startsWith('shivam@') && (
              <span className="inline-block w-2 h-4 bg-amber-500 animate-pulse ml-1 align-middle" />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}