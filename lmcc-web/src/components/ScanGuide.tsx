import React from 'react';

interface ScanGuideProps {
  statusText?: string;
  subText?: string;
}

export const ScanGuide: React.FC<ScanGuideProps> = ({
  statusText = 'Ready to scan',
  subText = 'Position the label within the frame',
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-5 sm:p-7 z-10 select-none">
      {/* Top Status Tag matching reference */}
      <div className="w-full flex items-center justify-start">
        <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-black/65 backdrop-blur-md border border-white/[0.08] shadow-lg">
          <span className="w-2 h-2 rounded-full bg-[#2ee6a6] animate-pulse" />
          <div className="flex flex-col text-left">
            <span className="text-[11px] font-sans font-medium text-white leading-tight">
              {statusText}
            </span>
            <span className="text-[9px] font-sans text-slate-400 leading-tight mt-0.5">
              {subText}
            </span>
          </div>
        </div>
      </div>

      {/* Target Reticle Frame matching reference */}
      <div className="relative w-[78%] sm:w-[72%] aspect-[4/5] max-h-[350px] my-auto">
        {/* Subtle Vignette Mask Outside Reticle */}
        <div className="absolute -inset-10 bg-radial-gradient from-transparent via-transparent to-black/30 pointer-events-none" />

        {/* Reticle Box with subtle cyan/emerald glow matching reference */}
        <div className="w-full h-full rounded-2xl border-2 border-[#2ee6a6]/90 shadow-[0_0_25px_rgba(46,230,166,0.35)] relative overflow-hidden">
          {/* Subtle Animated Scanning Beam sweeping vertically */}
          <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-[#2ee6a6] to-transparent shadow-[0_0_12px_rgba(46,230,166,0.8)] animate-scan-beam pointer-events-none" />
        </div>
      </div>

      {/* Invisible spacer for bottom controls */}
      <div className="h-16" />
    </div>
  );
};

export default ScanGuide;
