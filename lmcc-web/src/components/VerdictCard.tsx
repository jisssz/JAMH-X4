import React from 'react';
import { Info } from 'lucide-react';
import { Verdict } from '../models/Verdict';

interface VerdictCardProps {
  verdict: Verdict;
}

export const VerdictCard: React.FC<VerdictCardProps> = ({ verdict }) => {
  const isPass = verdict.overallStatus === 'PASS';

  return (
    <div
      className={`relative w-full rounded-3xl p-7 sm:p-9 text-white transition-all ${
        isPass
          ? 'bg-[#090e18] border border-emerald-500/20'
          : 'bg-[#0d0c15] border border-amber-500/25'
      }`}
    >
      <div className="relative z-10 space-y-6">
        {/* Eyebrow & Status */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-sans font-medium uppercase tracking-wider text-slate-400">
            Screening Result
          </span>
          <span
            className={`text-xs font-sans font-semibold px-3 py-1 rounded-full border ${
              isPass
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
            }`}
          >
            {isPass ? 'Passed' : 'Review recommended'}
          </span>
        </div>

        {/* Large Editorial Headline */}
        <div>
          <h2 className="font-display text-3xl sm:text-5xl font-normal text-white tracking-tight leading-[1.1]">
            {isPass ? (
              <span>
                Compliant with visible <span className="font-serif italic text-slate-300">declarations.</span>
              </span>
            ) : (
              <span>
                Manual verification <span className="font-serif italic text-slate-300">recommended.</span>
              </span>
            )}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400 leading-relaxed font-sans max-w-2xl">
            {verdict.summary}
          </p>
        </div>

        {/* Quiet Metrics Line */}
        <div className="pt-4 border-t border-white/[0.06] flex flex-wrap items-center gap-6 text-xs font-sans text-slate-400">
          <div>
            <span>Statutory checks: </span>
            <strong className="text-white font-medium">{verdict.totalChecks}</strong>
          </div>
          <div>
            <span>Detected: </span>
            <strong className="text-emerald-400 font-medium">{verdict.passedChecks}</strong>
          </div>
          <div>
            <span>Requires review: </span>
            <strong className={verdict.flaggedChecks > 0 ? 'text-amber-400 font-medium' : 'text-slate-500 font-normal'}>
              {verdict.flaggedChecks}
            </strong>
          </div>
        </div>

        {/* Statutory Notice */}
        <div className="pt-3 border-t border-white/[0.06] flex items-start gap-2.5 text-xs text-slate-500 font-sans">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-slate-500" />
          <span className="leading-relaxed">
            <strong className="text-slate-400">Screening notice:</strong> Evaluates visible declarations under Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011. Does not constitute an official legal determination.
          </span>
        </div>
      </div>
    </div>
  );
};

export default VerdictCard;
