import React from 'react';
import { Cpu, FileText, CheckCircle2 } from 'lucide-react';

interface ProcessingIndicatorProps {
  progress: number; // 0.0 to 1.0
  statusMessage: string;
  step: 'ocr' | 'parsing' | 'rules' | 'done';
}

export const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({
  progress,
  statusMessage,
  step,
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round(progress * 100)));

  return (
    <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-slate-100 flex flex-col items-center text-center">
      {/* Animated Center Icon */}
      <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-gov-500/10 animate-ping opacity-75" />
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-gov-700 to-gov-500 flex items-center justify-center text-white shadow-lg shadow-gov-600/30">
          {step === 'ocr' && <Cpu className="w-9 h-9 animate-pulse" />}
          {step === 'parsing' && <FileText className="w-9 h-9 animate-pulse" />}
          {(step === 'rules' || step === 'done') && <CheckCircle2 className="w-9 h-9 text-emerald-300" />}
        </div>
      </div>

      <h3 className="text-xl font-bold text-slate-800 mb-1">
        {step === 'ocr' && 'Extracting Label Text'}
        {step === 'parsing' && 'Parsing Mandatory Fields'}
        {step === 'rules' && 'Verifying Legal Metrology Rules'}
        {step === 'done' && 'Evaluation Complete'}
      </h3>
      <p className="text-xs text-slate-500 mb-6 h-4">{statusMessage}</p>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 rounded-full h-3 mb-3 overflow-hidden p-0.5">
        <div
          className="bg-gradient-to-r from-gov-600 via-gov-500 to-emerald-500 h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="w-full flex justify-between text-xs text-slate-400 font-medium">
        <span>Processing client-side</span>
        <span>{percentage}%</span>
      </div>

      {/* Verification Steps List */}
      <div className="w-full mt-6 pt-6 border-t border-slate-100 space-y-2 text-left text-xs">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${step === 'ocr' ? 'bg-gov-600 animate-pulse' : 'bg-emerald-500'}`} />
          <span className={step === 'ocr' ? 'font-semibold text-slate-800' : 'text-slate-500'}>
            Tesseract.js Browser OCR
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${step === 'parsing' ? 'bg-gov-600 animate-pulse' : step === 'ocr' ? 'bg-slate-300' : 'bg-emerald-500'}`} />
          <span className={step === 'parsing' ? 'font-semibold text-slate-800' : 'text-slate-500'}>
            Rule 6 Declaration Parser
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${step === 'rules' ? 'bg-gov-600 animate-pulse' : step === 'done' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          <span className={step === 'rules' ? 'font-semibold text-slate-800' : 'text-slate-500'}>
            Legal Metrology (PC) Rules Engine
          </span>
        </div>
      </div>
    </div>
  );
};
