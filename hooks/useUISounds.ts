// hooks/useUISounds.ts
'use client';
import { useCallback } from 'react';

// We use a Singleton pattern so we don't crash the browser's audio engine
let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  return audioCtx;
};

export function useUISounds() {
  
  // The "Hover" Sound: A very fast, soft, high-pitched mechanical tick
  const playHover = useCallback(() => {
    const ctx = getAudioContext();
    // Browsers block audio until the user clicks the page at least once. 
    if (!ctx || ctx.state === 'suspended') return; 

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime); // High pitch
      gain.gain.setValueAtTime(0.01, ctx.currentTime); // Very quiet (1% volume)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03); // Fades instantly
      
      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch(e) {}
  }, []);

  // The "Click" Sound: A deeper, satisfying 'pop' or 'thud'
  const playClick = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume(); // Force wake-up on click

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime); 
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1); // Pitch drop creates a "pop"
      gain.gain.setValueAtTime(0.08, ctx.currentTime); // Louder (8% volume)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch(e) {}
  }, []);

  return { playHover, playClick };
}