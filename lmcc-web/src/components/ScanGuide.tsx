import React from 'react';

interface ScanGuideProps {
  statusText?: string;
  instructionText?: string;
}

export const ScanGuide: React.FC<ScanGuideProps> = ({
  statusText = 'Ready to capture',
  instructionText = 'Good light · Keep label flat · Fill frame',
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6 sm:p-8 z-10 select-none">
      {/* Top Status & Minimal Guidance Row */}
      <div className="w-full flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/[0.08] shadow-lg flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-sans font-medium text-white tracking-wide">
            {statusText}
          </span>
        </div>

        <div className="inline-flex items-center text-[10px] sm:text-[11px] font-sans text-slate-300/90 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/[0.08] tracking-wide shadow-lg">
          <span className="hidden sm:inline">{instructionText}</span>
          <span className="sm:hidden">Good light · Hold steady</span>
        </div>
      </div>

      {/* Target Reticle Area with Subtle Corner Brackets */}
      <div className="relative w-[82%] sm:w-[76%] aspect-[4/5] max-h-[360px] my-auto">
        {/* Subtle Vignette Mask Outside Reticle */}
        <div className="absolute -inset-8 bg-radial-gradient from-transparent via-transparent to-black/35 pointer-events-none" />

        {/* Minimal Corner Brackets - Muted & Delicate */}
        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/50 rounded-tl-md" />
        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/50 rounded-tr-md" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white/50 rounded-bl-md" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white/50 rounded-br-md" />

        {/* Subtle Animated Scanning Beam */}
        <div className="absolute inset-x-3 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent shadow-[0_0_6px_rgba(52,211,153,0.4)] animate-scan-beam pointer-events-none" />
      </div>
    </div>
  );
};

export default ScanGuide;
