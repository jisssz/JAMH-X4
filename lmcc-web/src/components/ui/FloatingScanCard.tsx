import React from 'react';

interface FloatingScanCardProps {
  className?: string;
}

export const FloatingScanCard: React.FC<FloatingScanCardProps> = ({ className = '' }) => {
  return (
    <div
      className={`relative w-full max-w-sm sm:max-w-md rounded-3xl bg-[#090d16]/90 backdrop-blur-2xl p-6 sm:p-7 border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-300 ${className}`.trim()}
    >
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-baseline justify-between pb-4 border-b border-white/[0.06]">
          <div>
            <span className="text-[11px] font-sans font-medium uppercase tracking-wider text-slate-400 block">
              Legal Metrology Screening
            </span>
            <span className="text-base font-sans font-semibold text-white mt-0.5 block">
              Verification sheet
            </span>
          </div>
          <span className="text-[10px] font-sans font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
            Passed
          </span>
        </div>

        {/* Declarations Data List */}
        <div className="divide-y divide-white/[0.04] text-xs font-sans my-2">
          <div className="flex items-center justify-between py-3">
            <span className="text-slate-400">MRP (inclusive of taxes)</span>
            <span className="text-white font-medium">₹120.00</span>
          </div>

          <div className="flex items-center justify-between py-3">
            <span className="text-slate-400">Net quantity</span>
            <span className="text-white font-medium">500 g</span>
          </div>

          <div className="flex items-center justify-between py-3">
            <span className="text-slate-400">Manufacturer</span>
            <span className="text-emerald-400 font-medium">Detected</span>
          </div>

          <div className="flex items-center justify-between py-3">
            <span className="text-slate-400">Date of packing</span>
            <span className="text-white font-medium">08/2024</span>
          </div>

          <div className="flex items-center justify-between py-3">
            <span className="text-slate-400">Consumer care</span>
            <span className="text-emerald-400 font-medium">Detected</span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400 font-sans">
          <span>5 statutory declarations checked</span>
          <span className="text-slate-400">Rule 6 (2011)</span>
        </div>
      </div>
    </div>
  );
};

export default FloatingScanCard;
