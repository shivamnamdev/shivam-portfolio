'use client';
import { useRef, useState } from 'react';
import { motion } from 'framer-motion';

export default function SpotlightCard({ 
  children, 
  className = "", 
  interactive = false 
}: { 
  children: React.ReactNode, 
  className?: string,
  interactive?: boolean 
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current || isFocused) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <motion.div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={() => { setIsFocused(true); setOpacity(1); }}
      onBlur={() => { setIsFocused(false); setOpacity(0); }}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      whileHover={interactive ? {} : { scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`relative overflow-hidden rounded-3xl bg-[#0a0a0a] border border-white/10 shadow-2xl group flex flex-col ${interactive ? '' : 'hover:-translate-y-1 transition-all duration-300'} ${className}`}
    >
      {/* The Mouse-Tracking Glow */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 z-0"
        style={{
          opacity,
          background: `
            radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(245,158,11,0.1), transparent 40%),
            radial-gradient(800px circle at ${position.x}px ${position.y}px, rgba(255,255,255,0.03), transparent 40%)
          `,
        }}
      />
      {/* Subtle border glow */}
      <div 
        className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none"
        style={{
          boxShadow: `inset 0 0 0 1px rgba(245,158,11,0.2)`
        }}
      />
      
      {/* The Internal Content */}
      <div className="relative z-10 h-full w-full flex flex-col flex-grow">
        {children}
      </div>
    </motion.div>
  );
}