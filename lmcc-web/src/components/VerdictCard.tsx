import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { Verdict } from '../models/Verdict';

interface VerdictCardProps {
  verdict: Verdict;
}

export const VerdictCard: React.FC<VerdictCardProps> = ({ verdict }) => {
  const isPass = verdict.overallStatus === 'PASS';

  return (
    <div
      className={`w-full rounded-3xl p-6 md:p-8 text-white shadow-xl transition-all ${
        isPass
          ? 'bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-900 border border-emerald-500/40 shadow-emerald-950/20'
          : 'bg-gradient-to-br from-amber-700 via-amber-800 to-slate-900 border border-amber-500/40 shadow-amber-950/20'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-md ${
              isPass ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
            }`}
          >
            {isPass ? <CheckCircle2 className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
          </div>
          <div>
            <span
              className={`text-[11px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full ${
                isPass ? 'bg-emerald-400/20 text-emerald-200' : 'bg-amber-400/20 text-amber-200'
              }`}
            >
              {isPass ? 'PASS — No Detected Issue' : 'REVIEW — Potential Issue Detected'}
            </span>
            <h2 className="text-xl sm:text-2xl font-black mt-1">
              {isPass ? 'RULE 6 SCREENING: NO ISSUE DETECTED' : 'MANUAL VERIFICATION RECOMMENDED'}
            </h2>
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-white/90 leading-relaxed">
        {verdict.summary}
      </p>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-white/15 text-center">
        <div className="bg-black/20 backdrop-blur-sm rounded-xl p-3">
          <span className="block text-2xl font-bold">{verdict.totalChecks}</span>
          <span className="text-[11px] text-white/70">Total Checks</span>
        </div>
        <div className="bg-black/20 backdrop-blur-sm rounded-xl p-3">
          <span className="block text-2xl font-bold text-emerald-300">{verdict.passedChecks}</span>
          <span className="text-[11px] text-white/70">Detected</span>
        </div>
        <div className="bg-black/20 backdrop-blur-sm rounded-xl p-3">
          <span
            className={`block text-2xl font-bold ${
              verdict.flaggedChecks > 0 ? 'text-amber-300' : 'text-slate-300'
            }`}
          >
            {verdict.flaggedChecks}
          </span>
          <span className="text-[11px] text-white/70">Requires Review</span>
        </div>
      </div>

      {/* Legal Disclaimer */}
      <div className="mt-6 flex items-start gap-2 bg-black/30 backdrop-blur-md rounded-xl p-3 text-[11px] text-white/75">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-white/80" />
        <span>
          <strong>Automated Screening Notice:</strong> This assessment evaluates visible declarations
          under Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011. OCR is subject to image clarity
          and lighting, and this result does not constitute an official legal determination or certification.
        </span>
      </div>
    </div>
  );
};
