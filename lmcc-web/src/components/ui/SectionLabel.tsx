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
  // Strip redundant leading slash if present
  const content = typeof children === 'string' && children.startsWith('/') ? children.slice(1) : children;

  return (
    <div
      className={`inline-flex items-center gap-2 text-xs font-sans font-medium tracking-wider uppercase text-slate-400 ${className}`.trim()}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${glow ? 'bg-emerald-400' : 'bg-emerald-500/80'}`} />
      <span>{content}</span>
    </div>
  );
};

export default SectionLabel;
