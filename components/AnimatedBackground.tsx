'use client';
import { useEffect, useRef } from 'react';

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false }); // Optimize performance
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // The "Science": Precise data nodes
    const particleCount = Math.min(Math.floor(window.innerWidth / 30), 40);
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 1.5 + 0.5,
      // Cyan (Science) and Violet (Art) nodes
      color: Math.random() > 0.5 ? 'rgba(34, 211, 238, 0.8)' : 'rgba(168, 85, 247, 0.8)' 
    }));

    const animate = () => {
      time += 0.002; // Slow, elegant time progression

      // 1. Artistic Base Canvas (Deep, warm museum-like void)
      const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGradient.addColorStop(0, '#05030f');   // Very dark violet-black
      bgGradient.addColorStop(0.5, '#080514'); // Deep midnight space
      bgGradient.addColorStop(1, '#020617');   // Strict slate at the bottom (grounded)
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (!prefersReducedMotion) {
        // 2. The "Art + Math" Harmony: Flowing Parametric Curves
        // These represent strings (music), flow (martial arts), and data streams (tech)
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          for (let x = 0; x <= canvas.width; x += 10) {
            // Complex mathematical equation for organic beauty
            const y1 = Math.sin(x * 0.002 + time + i) * 120; // Broad fluid wave
            const y2 = Math.cos(x * 0.004 - time * 1.2 + i) * 60; // Counter movement
            const y3 = Math.sin(x * 0.01 + time * 0.5) * 15; // High frequency precision (The Math)
            
            const y = canvas.height / 2 + y1 + y2 + y3;

            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          
          // Flowing gradient stroke for the curves
          const waveGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
          waveGrad.addColorStop(0, `rgba(168, 85, 247, ${0.15 - i * 0.03})`);   // Artistic Purple
          waveGrad.addColorStop(0.5, `rgba(56, 189, 248, ${0.15 - i * 0.03})`); // Engineering Blue
          waveGrad.addColorStop(1, `rgba(45, 212, 191, ${0.1 - i * 0.02})`);    // Creative Teal
          
          ctx.strokeStyle = waveGrad;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // 3. The "Network": Particles & Scientific Connections
        particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          
          // Fluid boundary bounce
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        });

        // Draw structural connecting lines between close particles
        ctx.lineWidth = 0.5;
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 120) {
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              // Line fades as distance increases
              ctx.strokeStyle = `rgba(148, 163, 184, ${0.15 * (1 - dist / 120)})`;
              ctx.stroke();
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  },[]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-[#05030f]">
      {/* 
        Artistic Lighting Overlays (CSS Based)
        These provide the museum-style generative art lighting behind the canvas 
      */}
      <div 
        className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-60 mix-blend-screen animate-pulse"
        style={{ 
          background: 'radial-gradient(circle, rgba(109, 40, 217, 0.15) 0%, rgba(0,0,0,0) 70%)', 
          filter: 'blur(80px)',
          animationDuration: '8s'
        }}
      />
      <div 
        className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-50 mix-blend-screen"
        style={{ 
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, rgba(0,0,0,0) 70%)', 
          filter: 'blur(80px)' 
        }}
      />
      <div 
        className="absolute top-[30%] left-[50%] w-[40%] h-[40%] rounded-full opacity-30 mix-blend-screen"
        style={{ 
          background: 'radial-gradient(circle, rgba(45, 212, 191, 0.08) 0%, rgba(0,0,0,0) 70%)', 
          filter: 'blur(60px)' 
        }}
      />
      
      {/* Precision Mathematical Canvas Layer */}
      <canvas ref={canvasRef} className="absolute inset-0 mix-blend-screen" />
    </div>
  );
}