import React from 'react';

interface BentoCardProps {
  title: string;
  subtitle?: string;
  description: string;
  tag?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  colSpan?: '1' | '2' | '3';
}

export const BentoCard: React.FC<BentoCardProps> = ({
  title,
  subtitle,
  description,
  tag,
  icon,
  children,
  className = '',
  colSpan = '1',
}) => {
  const colSpanClass = {
    '1': 'md:col-span-1',
    '2': 'md:col-span-2',
    '3': 'md:col-span-3',
  }[colSpan];

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-6 sm:p-7 border border-white/10 hover:border-white/25 transition-all duration-300 shadow-2xl backdrop-blur-xl ${colSpanClass} ${className}`.trim()}
    >
      {/* Corner subtle radial ambient glow on hover */}
      <div className="pointer-events-none absolute -right-20 -top-20 w-48 h-48 rounded-full bg-emerald-500/10 group-hover:bg-emerald-500/20 blur-3xl transition-all duration-500" />

      <div className="relative z-10 flex flex-col justify-between h-full">
        <div>
          {/* Top header row */}
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-200 group-hover:scale-110 group-hover:text-emerald-300 transition-all duration-300">
              {icon}
            </div>
            {tag && (
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
                {tag}
              </span>
            )}
          </div>

          {subtitle && (
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider block mb-1">
              {subtitle}
            </span>
          )}

          <h3 className="text-xl font-black text-white tracking-tight mb-2 group-hover:text-white transition">
            {title}
          </h3>

          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            {description}
          </p>
        </div>

        {children && <div className="mt-6 pt-4 border-t border-white/5">{children}</div>}
      </div>
    </div>
  );
};

export default BentoCard;
