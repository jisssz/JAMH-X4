import React from 'react';

export const ScanGuide: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-5 sm:p-6 z-10 select-none">
      {/* Top Status Tag */}
      <div className="w-full flex items-center justify-between pt-1">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/[0.08] shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <div className="flex flex-col text-left">
            <span className="text-[11px] font-sans font-medium text-white leading-tight">
              Ready to scan
            </span>
            <span className="text-[9px] font-sans text-slate-400 leading-tight">
              Position the label within the frame
            </span>
          </div>
        </div>
      </div>

      {/* Target Reticle Area */}
      <div className="relative w-[76%] sm:w-[70%] aspect-[4/5] max-h-[380px] my-auto">
        {/* Subtle Vignette Mask Outside Reticle */}
        <div className="absolute -inset-10 bg-radial-gradient from-transparent via-transparent to-black/40 pointer-events-none" />

        {/* Minimal Corner Brackets */}
        <div className="absolute top-0 left-0 w-6 sm:w-7 h-6 sm:h-7 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg shadow-[0_0_10px_rgba(52,211,153,0.35)]" />
        <div className="absolute top-0 right-0 w-6 sm:w-7 h-6 sm:h-7 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg shadow-[0_0_10px_rgba(52,211,153,0.35)]" />
        <div className="absolute bottom-0 left-0 w-6 sm:w-7 h-6 sm:h-7 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg shadow-[0_0_10px_rgba(52,211,153,0.35)]" />
        <div className="absolute bottom-0 right-0 w-6 sm:w-7 h-6 sm:h-7 border-b-2 border-r-2 border-emerald-400 rounded-br-lg shadow-[0_0_10px_rgba(52,211,153,0.35)]" />

        {/* Subtle Animated Scanning Beam */}
        <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400/75 to-transparent shadow-[0_0_8px_rgba(52,211,153,0.5)] animate-scan-beam pointer-events-none" />
      </div>

      {/* Bottom Floating Minimal Instruction */}
      <div className="pb-24 sm:pb-28 flex justify-center">
        <span className="text-[11px] font-sans text-slate-300/90 bg-black/60 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/[0.06] tracking-wide shadow-md">
          Good light · Keep label flat · Fill frame
        </span>
      </div>
    </div>
  );
};

export default ScanGuide;
