'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const codeLines =[
  "shivam@neurealm:~$ pytest src/test_ai_agent.py --parallel=4",
  "================= test session starts =================",
  "collecting ... collected 145 items",
  "",
  "test_ai_agent.py .............................. [ 20%]",
  "test_payment_gateway.py ....................... [ 85%]",
  "test_zero_downtime.py .........................[100%]",
  "",
  "========== 145 passed in 1.12s (Agentic AI) ==========="
];

export default function Terminal() {
  const[lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    // 1. Reset lines array on mount to prevent Hot-Reload (HMR) desync bugs
    setLines([]); 
    
    let currentLine = 0;
    const interval = setInterval(() => {
      if (currentLine < codeLines.length) {
        // Safely push the line
        const nextLine = codeLines[currentLine];
        if (nextLine !== undefined) {
          setLines(prev => [...prev, nextLine]);
        }
        currentLine++;
      } else {
        clearInterval(interval);
      }
    }, 400); // Speed of the typing effect

    return () => clearInterval(interval);
  },[]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.8, duration: 0.8 }}
      className="w-full max-w-md rounded-xl overflow-hidden border border-white/10 shadow-[0_8px_32px_rgba(245,158,11,0.15)] bg-[#0a0a0b]/80 backdrop-blur-xl font-mono text-xs sm:text-sm"
    >
      <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/5">
        <div className="w-3 h-3 rounded-full bg-red-500/80" />
        <div className="w-3 h-3 rounded-full bg-amber-500/80" />
        <div className="w-3 h-3 rounded-full bg-green-500/80" />
        <span className="ml-2 text-slate-400 text-xs">agentic-automation-run</span>
      </div>
      <div className="p-4 text-slate-300 min-h-[200px] flex flex-col gap-1">
        {lines.map((line, i) => (
          /* 2. Added optional chaining (line?.includes) as a fail-safe */
          <div key={i} className={`${line?.includes('passed') ? 'text-amber-400 font-bold' : line?.includes('error') ? 'text-red-400' : ''}`}>
            {line}
          </div>
        ))}
        {lines.length < codeLines.length && (
          <div className="w-2 h-4 bg-amber-500 animate-pulse mt-1" />
        )}
      </div>
    </motion.div>
  );
}