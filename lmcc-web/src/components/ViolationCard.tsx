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
        return 'bg-red-50 text-red-700 border-red-200';
      case 'high':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm transition hover:border-slate-300">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0 border border-amber-200/60">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 leading-snug">{violation.title}</h4>
            <span className="text-[11px] text-slate-500 font-mono">Declaration: {violation.field}</span>
          </div>
        </div>
        <span
          className={`text-[10px] uppercase tracking-wide font-bold px-2.5 py-0.5 rounded-full border ${getSeverityBadge(
            violation.severity
          )}`}
        >
          {violation.severity}
        </span>
      </div>

      {/* Explanation */}
      <p className="mt-3 text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
        <strong className="text-slate-900 block mb-1">Observation:</strong>
        {violation.explanation}
      </p>

      {/* Evidence from OCR */}
      <div className="mt-3 p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1">
          <Search className="w-3.5 h-3.5 text-amber-700" />
          <span>OCR Text Evidence:</span>
        </div>
        <p className="text-[11px] text-amber-950 font-mono bg-white/80 p-2 rounded border border-amber-200/40 break-words">
          {violation.evidence || 'No reliable OCR evidence available.'}
        </p>
      </div>

      {/* Recommendation Note */}
      <div className="mt-3 flex items-start gap-2 text-xs text-slate-600">
        <HelpCircle className="w-4 h-4 text-gov-600 flex-shrink-0 mt-0.5" />
        <span>
          <strong className="text-slate-800">Inspection Guidance: </strong>
          {violation.recommendation}
        </span>
      </div>

      {/* Legal Reference Citation */}
      <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-[11px] text-gov-700">
        <div className="flex items-center gap-1.5 font-medium">
          <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Statutory Authority: {violation.source}</span>
        </div>
        {violation.gazetteReference && (
          <div className="text-[10px] text-slate-500 pl-5">
            Gazette Ref: {violation.gazetteReference}
          </div>
        )}
      </div>
    </div>
  );
};
