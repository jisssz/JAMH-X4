import React from 'react';
import { AlertCircle, BookOpen, HelpCircle, Search } from 'lucide-react';
import { PotentialViolation } from '../models/Verdict';

interface ViolationCardProps {
  violation: PotentialViolation;
}

export const ViolationCard: React.FC<ViolationCardProps> = ({ violation }) => {
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'high':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      default:
        return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
    }
  };

  return (
    <div className="bg-slate-900/80 rounded-2xl p-5 border border-white/10 shadow-xl backdrop-blur-xl transition hover:border-white/20">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0 border border-amber-500/20">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white leading-snug">{violation.title}</h4>
            <span className="text-[11px] text-slate-400 font-mono">Declaration: {violation.field}</span>
          </div>
        </div>
        <span
          className={`text-[10px] uppercase font-mono tracking-widest font-bold px-2.5 py-0.5 rounded-full border ${getSeverityBadge(
            violation.severity
          )}`}
        >
          {violation.severity}
        </span>
      </div>

      {/* Explanation */}
      <p className="mt-3 text-xs text-slate-300 leading-relaxed bg-white/[0.03] p-3.5 rounded-xl border border-white/5">
        <strong className="text-white block mb-1 font-mono text-[11px]">Observation:</strong>
        {violation.explanation}
      </p>

      {/* Evidence from OCR */}
      <div className="mt-3 p-3 bg-amber-950/20 rounded-xl border border-amber-500/20 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-amber-300 mb-1 font-mono">
          <Search className="w-3.5 h-3.5 text-amber-400" />
          <span>OCR Text Evidence:</span>
        </div>
        <p className="text-[11px] text-amber-200 font-mono bg-black/40 p-2 rounded border border-amber-500/20 break-words">
          {violation.evidence || 'No reliable OCR evidence available.'}
        </p>
      </div>

      {/* Recommendation Note */}
      <div className="mt-3 flex items-start gap-2 text-xs text-slate-400">
        <HelpCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <span>
          <strong className="text-slate-200">Inspection Guidance: </strong>
          {violation.recommendation}
        </span>
      </div>

      {/* Legal Reference Citation */}
      <div className="mt-3 pt-3 border-t border-white/5 space-y-1 text-[11px] text-emerald-400 font-mono">
        <div className="flex items-center gap-1.5 font-medium">
          <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Statutory Authority: {violation.source}</span>
        </div>
        {violation.gazetteReference && (
          <div className="text-[10px] text-slate-400 pl-5">
            Gazette Ref: {violation.gazetteReference}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViolationCard;
