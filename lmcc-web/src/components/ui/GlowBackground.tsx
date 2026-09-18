import React from 'react';

interface GlowBackgroundProps {
  className?: string;
  variant?: 'hero' | 'section' | 'subtle';
}

export const GlowBackground: React.FC<GlowBackgroundProps> = ({
  className = '',
  variant = 'hero',
}) => {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none ${className}`}
      aria-hidden="true"
    >
      {/* Background Grid Lines */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {variant === 'hero' && (
        <>
          {/* Top Center Electric Blue / Violet Luminous Orb */}
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-gradient-to-tr from-indigo-600/20 via-sky-500/15 to-purple-600/15 blur-[120px]" />

          {/* Right Emerald Scanner Ambient Flare */}
          <div className="absolute top-1/4 -right-20 w-[450px] h-[450px] rounded-full bg-emerald-500/10 blur-[140px]" />

          {/* Bottom Left Deep Azure Pool */}
          <div className="absolute -bottom-32 -left-20 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[130px]" />
        </>
      )}

      {variant === 'section' && (
        <>
          {/* Subtle Radial Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-indigo-500/10 blur-[130px]" />
        </>
      )}

      {variant === 'subtle' && (
        <div className="absolute inset-0 bg-radial-gradient from-white/[0.03] via-transparent to-transparent opacity-50" />
      )}
    </div>
  );
};

export default GlowBackground;
