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
      {/* Background Subtle Grid Texture */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.12) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.12) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Cinematic Ambient Atmosphere */}
      {variant === 'hero' && (
        <>
          {/* Subtle Emerald / Teal Ambient Bloom on Right Side */}
          <div className="absolute top-10 right-0 sm:right-10 w-[500px] h-[500px] rounded-full bg-emerald-500/[0.07] blur-[140px]" />
          {/* Deep Navy Atmosphere Center */}
          <div className="absolute -top-24 left-1/3 w-[600px] h-[450px] rounded-full bg-sky-900/[0.06] blur-[160px]" />
        </>
      )}

      {variant === 'subtle' && (
        <>
          {/* Subtle Ambient Depth Glow */}
          <div className="absolute top-12 right-0 sm:right-12 w-[520px] h-[520px] rounded-full bg-emerald-500/[0.06] blur-[150px]" />
          <div className="absolute top-1/2 -left-20 w-[480px] h-[480px] rounded-full bg-sky-950/[0.08] blur-[140px]" />
        </>
      )}

      {/* Vignette Overlay for Cinema Framing */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(5,7,11,0.5)_100%)] pointer-events-none" />
    </div>
  );
};

export default GlowBackground;
