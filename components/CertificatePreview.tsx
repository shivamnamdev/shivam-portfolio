// Sample of the completion certificate generated in /learning/[slug] (jsPDF). Static, so a server component.
export default function CertificatePreview({ courseTitle }: { courseTitle: string }) {
  // Certificates never show the batch number, e.g. "Python Live Session (Batch 1)" -> "Python Live Session"
  const cleanTitle = courseTitle.replace(/\s*\(Batch\s*\d+\)/i, '').trim();

  return (
    <section className="w-full max-w-4xl mx-auto text-center">
      <h2 className="text-4xl font-display font-black text-white mb-4">Earn Your Certificate</h2>
      <p className="text-stone-400 mb-10">Complete every lesson and assignment to unlock your personalised certificate.</p>

      <div className="relative w-full aspect-[1.4] bg-[#121212] rounded-md p-2 flex flex-col border border-white/10 select-none" aria-label="Sample certificate">
        <span className="absolute top-4 right-4 z-10 text-[10px] font-black uppercase tracking-widest bg-white/10 text-stone-300 px-3 py-1 rounded-full">Sample</span>
        <div className="flex-1 border-[3px] border-amber-500 p-1 flex flex-col">
          <div className="flex-1 border border-amber-400 flex flex-col items-center justify-center p-4 md:p-8">
            <p className="text-xl md:text-4xl font-bold text-white mb-2 md:mb-4 tracking-wide">CERTIFICATE OF COMPLETION</p>
            <p className="text-stone-400 italic text-xs md:text-base mb-3 md:mb-6">This credential is proudly presented to</p>
            <p className="text-2xl md:text-5xl font-black text-amber-500 mb-3 md:mb-6 uppercase tracking-wider">Your Name Here</p>
            <p className="text-stone-300 text-xs md:text-base mb-1 md:mb-2">for successfully completing the curriculum and passing all technical requirements in:</p>
            <p className="text-white font-bold text-base md:text-2xl mb-4 md:mb-8">{cleanTitle}</p>
            <div className="w-full flex justify-between items-end mt-auto px-2 md:px-10">
              <p className="text-left text-[9px] md:text-xs font-mono text-amber-400">Issued on completion<br/>with a unique verification ID</p>
              <div className="text-center">
                <p className="font-bold text-sm md:text-xl text-white border-b border-stone-500 pb-1 mb-1">Shivam Namdev</p>
                <p className="text-[9px] md:text-xs text-stone-500">Lead Instructor</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
