import React from 'react';

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({
  children,
  className = '',
  glow = false,
}) => {
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-semibold tracking-wider uppercase border ${
        glow
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
          : 'bg-white/5 border-white/10 text-slate-300 backdrop-blur-sm'
      } ${className}`.trim()}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      <span>{children}</span>
    </div>
  );
};

export default SectionLabel;
