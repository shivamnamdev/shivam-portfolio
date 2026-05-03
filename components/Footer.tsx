'use client';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full py-10 border-t border-stone-200 bg-white relative z-10 mt-20">
      <div className="max-w-7xl mx-auto px-6 sm:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* 🚨 THE UPDATED BRANDING */}
        <div className="text-center md:text-left">
          <h2 className="text-xl font-display font-black text-stone-900">Shivam Namdev</h2>
          <p className="text-sm text-stone-500 mt-1">Empowering Tech Mastery for All</p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-6 text-sm font-medium">
          <Link href="/privacy" className="text-stone-500 hover:text-amber-600 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="text-stone-500 hover:text-amber-600 transition-colors">Terms of Service</Link>
          <Link href="/refund" className="text-stone-500 hover:text-amber-600 transition-colors">Refund Policy</Link>
          <a href="https://linkedin.com/in/shivam-namdev" target="_blank" rel="noreferrer" className="text-stone-500 hover:text-amber-600 transition-colors">LinkedIn</a>
        </div>
      </div>
      <div className="text-center mt-8 text-xs text-stone-400">
        &copy; {new Date().getFullYear()} Shivam Namdev. All Rights Reserved.
      </div>
    </footer>
  );
}