import React from 'react';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { Verdict } from '../models/Verdict';

interface VerdictCardProps {
  verdict: Verdict;
}

export const VerdictCard: React.FC<VerdictCardProps> = ({ verdict }) => {
  const isPass = verdict.overallStatus === 'PASS';

  return (
    <div
      className={`relative w-full rounded-[2rem] p-6 sm:p-8 text-white transition-all overflow-hidden ${
        isPass
          ? 'bg-gradient-to-b from-slate-900/95 via-emerald-950/40 to-slate-950 border border-emerald-500/40 shadow-[0_0_50px_-12px_rgba(16,185,129,0.3)]'
          : 'bg-gradient-to-b from-slate-900/95 via-amber-950/40 to-slate-950 border border-amber-500/40 shadow-[0_0_50px_-12px_rgba(245,158,11,0.3)]'
      }`}
    >
      {/* Background ambient glow blob */}
      <div
        className={`pointer-events-none absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl opacity-30 ${
          isPass ? 'bg-emerald-500' : 'bg-amber-500'
        }`}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-md border ${
                isPass
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              }`}
            >
              {isPass ? <CheckCircle2 className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
            </div>
            <div>
              <span
                className={`text-[10px] font-mono uppercase tracking-widest font-bold px-2.5 py-0.5 rounded-full border ${
                  isPass
                    ? 'bg-emerald-400/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-400/15 text-amber-300 border-amber-500/30'
                }`}
              >
                {isPass ? 'PASS — No Potential Issue' : 'REVIEW — Potential Issue Detected'}
              </span>
              <h2 className="text-xl sm:text-2xl font-black mt-1.5 tracking-tight text-white uppercase">
                {isPass ? 'RULE 6 SCREENING: NO ISSUE DETECTED' : 'MANUAL VERIFICATION RECOMMENDED'}
              </h2>
            </div>
          </div>
        </div>

        <p className="mt-4 text-sm text-slate-300 leading-relaxed font-sans">
          {verdict.summary}
        </p>

        {/* Metrics Row */}
        <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-white/10 text-center font-mono">
          <div className="bg-white/[0.03] border border-white/5 backdrop-blur-sm rounded-2xl p-3">
            <span className="block text-2xl font-black text-white">{verdict.totalChecks}</span>
            <span className="text-[10px] uppercase text-slate-400">Total Checks</span>
          </div>
          <div className="bg-white/[0.03] border border-white/5 backdrop-blur-sm rounded-2xl p-3">
            <span className="block text-2xl font-black text-emerald-400">{verdict.passedChecks}</span>
            <span className="text-[10px] uppercase text-slate-400">Detected</span>
          </div>
          <div className="bg-white/[0.03] border border-white/5 backdrop-blur-sm rounded-2xl p-3">
            <span
              className={`block text-2xl font-black ${
                verdict.flaggedChecks > 0 ? 'text-amber-400' : 'text-slate-500'
              }`}
            >
              {verdict.flaggedChecks}
            </span>
            <span className="text-[10px] uppercase text-slate-400">Requires Review</span>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="mt-6 flex items-start gap-2 bg-black/40 border border-white/5 backdrop-blur-md rounded-2xl p-3.5 text-[11px] text-slate-400 font-mono">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-slate-400" />
          <span className="leading-relaxed">
            <strong className="text-slate-300">Automated Screening Notice:</strong> This assessment evaluates visible declarations under Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011. OCR is subject to image clarity and lighting, and this result does not constitute an official legal determination or certification.
          </span>
        </div>
      </div>
    </div>
  );
};

export default VerdictCard;
