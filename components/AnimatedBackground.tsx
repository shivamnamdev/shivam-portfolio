'use client';
import { useEffect, useRef } from 'react';

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
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

    const particleCount = Math.min(Math.floor(window.innerWidth / 30), 40);
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 1.5 + 0.5,
      color: Math.random() > 0.5 ? 'rgba(245, 158, 11, 0.8)' : 'rgba(217, 119, 6, 0.8)' 
    }));

    const animate = () => {
      time += 0.002;
      const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGradient.addColorStop(0, '#0a0a0b');
      bgGradient.addColorStop(1, '#050505');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (!prefersReducedMotion) {
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          for (let x = 0; x <= canvas.width; x += 10) {
            const y1 = Math.sin(x * 0.002 + time + i) * 120;
            const y2 = Math.cos(x * 0.004 - time * 1.2 + i) * 60;
            const y3 = Math.sin(x * 0.01 + time * 0.5) * 15;
            const y = canvas.height / 2 + y1 + y2 + y3;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          const waveGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
          waveGrad.addColorStop(0, `rgba(245, 158, 11, ${0.1 - i * 0.02})`);
          waveGrad.addColorStop(1, `rgba(251, 146, 60, ${0.1 - i * 0.02})`);
          ctx.strokeStyle = waveGrad;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        });
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
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-[#0a0a0b]">
      <div className="absolute top-[10%] left-[20%] w-[50%] h-[50%] rounded-full opacity-30 mix-blend-screen animate-pulse"
        style={{ background: 'radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(80px)', animationDuration: '8s' }} />
      <canvas ref={canvasRef} className="absolute inset-0 mix-blend-screen" />
    </div>
  );
}