'use client';

export default function Footer() {
  return (
    <footer className="w-full py-12 border-t border-white/10 mt-20 flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="text-center md:text-left">
        <h2 className="text-xl font-bold text-white">Let's Connect</h2>
        <p className="text-sm text-slate-400 mt-1">Open to discussing new projects and opportunities.</p>
      </div>
      <div className="flex gap-6">
        <a href="mailto:shivamnamdev.edu@gmail.com" className="text-slate-400 hover:text-white transition-colors">Email</a>
        <a href="https://linkedin.com/in/shivam-namdev" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white transition-colors">LinkedIn</a>
      </div>
    </footer>
  );
}
