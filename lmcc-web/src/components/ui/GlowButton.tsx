import React from 'react';

interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export const GlowButton: React.FC<GlowButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  trailingIcon,
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-4 py-2 text-xs font-semibold rounded-full gap-1.5',
    md: 'px-6 py-3.5 text-sm font-bold rounded-full gap-2.5',
    lg: 'px-8 py-4.5 text-base font-bold rounded-full gap-3',
  }[size];

  const variantClasses = {
    primary:
      'bg-white text-slate-950 hover:bg-slate-100 shadow-[0_0_25px_rgba(255,255,255,0.25)] hover:shadow-[0_0_35px_rgba(255,255,255,0.4)] border border-white',
    secondary:
      'bg-slate-900/80 text-white hover:bg-slate-800/90 border border-slate-700/80 hover:border-slate-500 backdrop-blur-md shadow-lg',
    glass:
      'bg-white/5 text-slate-200 hover:text-white hover:bg-white/10 border border-white/10 hover:border-white/20 backdrop-blur-md',
  }[variant];

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center transition-all duration-200 active:scale-[0.97] cursor-pointer ${sizeClasses} ${variantClasses} ${className}`.trim()}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
      {trailingIcon && <span className="flex-shrink-0 transition-transform duration-200 group-hover:translate-x-1">{trailingIcon}</span>}
    </button>
  );
};

export default GlowButton;
