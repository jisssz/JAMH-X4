import React from 'react';
import { Cpu, Check, Loader2 } from 'lucide-react';

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

  // Pipeline step states
  // 1. Preprocessing: done as soon as OCR initializes
  // 2. OCR Extraction: active during 'ocr', done after
  // 3. Declaration detection: active during 'parsing', done after
  // 4. Compliance screening: active during 'rules', done on 'done'

  const stages = [
    {
      id: 'pre',
      title: 'Image preprocessing',
      status: 'done', // Preprocessing is done upfront on canvas
    },
    {
      id: 'ocr',
      title: 'OCR extraction',
      status: step === 'ocr' ? 'active' : 'done',
    },
    {
      id: 'parsing',
      title: 'Declaration detection',
      status: step === 'ocr' ? 'pending' : step === 'parsing' ? 'active' : 'done',
    },
    {
      id: 'rules',
      title: 'Compliance screening',
      status: step === 'rules' ? 'active' : step === 'done' ? 'done' : 'pending',
    },
  ];

  return (
    <div className="w-full max-w-md bg-slate-900/90 rounded-3xl p-7 sm:p-8 shadow-2xl border border-white/15 backdrop-blur-2xl flex flex-col items-center text-center">
      {/* Animated Glowing Center Icon */}
      <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-50" />
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-slate-950 via-slate-900 to-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.25)]">
          <Cpu className="w-9 h-9 animate-pulse" />
        </div>
      </div>

      <span className="text-[10px] font-mono tracking-widest uppercase text-emerald-400 font-bold mb-1">
        /ANALYZING PRODUCT
      </span>

      <h3 className="text-xl font-black text-white tracking-tight mb-1">
        {step === 'ocr' && 'Extracting Label Text'}
        {step === 'parsing' && 'Detecting Mandatory Fields'}
        {step === 'rules' && 'Verifying Rule 6 Compliance'}
        {step === 'done' && 'Screening Complete'}
      </h3>

      <p className="text-xs text-slate-400 mb-6 h-5 font-mono truncate max-w-xs">
        {statusMessage}
      </p>

      {/* Progress Bar */}
      <div className="w-full bg-white/5 border border-white/10 rounded-full h-3 mb-2.5 overflow-hidden p-0.5">
        <div
          className="bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-400 h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_15px_rgba(16,185,129,0.5)]"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="w-full flex justify-between text-[11px] font-mono text-slate-400">
        <span>Client-side Web Worker</span>
        <span className="text-white font-bold">{percentage}%</span>
      </div>

      {/* Structured Pipeline HUD */}
      <div className="w-full mt-6 pt-5 border-t border-white/10 space-y-2.5 text-left text-xs font-mono">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-white/[0.02] border border-white/5"
          >
            <span
              className={
                stage.status === 'done'
                  ? 'text-white'
                  : stage.status === 'active'
                  ? 'text-emerald-400 font-bold'
                  : 'text-slate-500'
              }
            >
              {stage.title}
            </span>

            <span className="flex items-center">
              {stage.status === 'done' && (
                <Check className="w-4 h-4 text-emerald-400" />
              )}
              {stage.status === 'active' && (
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
              )}
              {stage.status === 'pending' && (
                <span className="w-2 h-2 rounded-full bg-slate-600 inline-block" />
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProcessingIndicator;
