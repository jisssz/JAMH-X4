import React from 'react';
import { CheckCircle2, ShieldCheck, Scale } from 'lucide-react';

interface FloatingScanCardProps {
  className?: string;
}

export const FloatingScanCard: React.FC<FloatingScanCardProps> = ({ className = '' }) => {
  return (
    <div
      className={`relative w-full max-w-sm sm:max-w-md rounded-3xl bg-slate-900/80 backdrop-blur-2xl p-5 sm:p-6 border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.6)] hover:border-emerald-500/40 transition-all duration-500 ${className}`.trim()}
    >
      {/* Ambient glowing backlight */}
      <div className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-tr from-emerald-500/20 via-sky-500/10 to-indigo-500/20 blur-xl opacity-70" />

      <div className="relative z-10">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
              <Scale className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-mono tracking-widest text-slate-300 uppercase font-semibold">
              PRODUCT VERIFICATION
            </span>
          </div>
          <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400">
            UI Preview
          </span>
        </div>

        {/* Verdict Badge */}
        <div className="my-4 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-black text-white tracking-wide block">
                PASS — SCREENING PASSED
              </span>
              <span className="text-[10px] text-emerald-300/80 block">
                No potential Rule 6 declaration issues detected
              </span>
            </div>
          </div>
        </div>

        {/* Detected Declarations Grid */}
        <div className="space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/5">
            <span className="text-slate-400 text-[11px]">MRP (INCL. TAXES)</span>
            <span className="text-white font-bold">₹120.00</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/5">
            <span className="text-slate-400 text-[11px]">NET QUANTITY</span>
            <span className="text-white font-bold">500 g</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/5">
            <span className="text-slate-400 text-[11px]">MANUFACTURER</span>
            <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" /> Detected
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/5">
            <span className="text-slate-400 text-[11px]">PACK DATE</span>
            <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" /> Detected (08/2024)
            </span>
          </div>
        </div>

        {/* Bottom Status Footer */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" /> 5 declarations checked
          </span>
          <span className="text-slate-500">Legal Metrology 2011</span>
        </div>
      </div>
    </div>
  );
};

export default FloatingScanCard;
