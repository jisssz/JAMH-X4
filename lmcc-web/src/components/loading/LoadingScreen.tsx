import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Scale, ChevronRight } from 'lucide-react';

interface LoadingScreenProps {
  onComplete: () => void;
  videoSrc?: string;
  maxDurationMs?: number;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  onComplete,
  videoSrc = '/intro.mp4',
  maxDurationMs = 11500, // safety fallback: video is 10s
}) => {
  const [isFading, setIsFading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const completedRef = useRef(false);

  const finishIntro = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsFading(true);
    setTimeout(() => {
      onComplete();
    }, 750); // Matches transition duration
  }, [onComplete]);

  useEffect(() => {
    // 1. Accessibility: Check for prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia) {
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (motionQuery.matches) {
        // Skip video intro for users who prefer reduced motion
        const timer = setTimeout(finishIntro, 500);
        return () => clearTimeout(timer);
      }
    }

    // 2. Enable subtle skip control after 1 second
    const skipTimer = setTimeout(() => {
      setCanSkip(true);
    }, 1000);

    // 3. Absolute Safety Timeout: never trap the user on black screen
    const safetyTimer = setTimeout(() => {
      finishIntro();
    }, maxDurationMs);

    // 4. Keyboard escape hatch (Esc, Space, Enter)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        finishIntro();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // 5. Attempt programmatic playback on mount
    if (videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If browser policy blocks autoplay despite muted attribute,
          // safely allow user click anywhere to dismiss or fallback
          setCanSkip(true);
        });
      }
    }

    return () => {
      clearTimeout(skipTimer);
      clearTimeout(safetyTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [finishIntro, maxDurationMs]);

  const handleVideoEnded = () => {
    finishIntro();
  };

  const handleVideoError = () => {
    setHasError(true);
    // After brief display of branded fallback, fade into app
    setTimeout(finishIntro, 1800);
  };

  return (
    <aside
      data-testid="loading-screen"
      aria-label="Application Startup Introduction"
      aria-live="polite"
      className={`fixed inset-0 z-[9999] w-screen h-screen h-[100dvh] bg-black overflow-hidden select-none flex items-center justify-center transition-opacity duration-700 ease-out ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {!hasError ? (
        /* Fullscreen Cinematic Video Experience */
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          <video
            ref={videoRef}
            data-testid="loading-video"
            src={videoSrc}
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={handleVideoEnded}
            onError={handleVideoError}
            className="w-full h-full object-cover"
            style={{ width: '100vw', height: '100dvh' }}
          />

          {/* Minimal, elegant skip button (appears after 1s) */}
          {canSkip && (
            <button
              type="button"
              data-testid="skip-intro-btn"
              onClick={finishIntro}
              className="absolute bottom-6 right-6 z-20 flex items-center gap-1 text-[11px] font-mono tracking-widest uppercase text-white/40 hover:text-white bg-white/5 hover:bg-white/10 px-3.5 py-1.5 rounded-full border border-white/10 backdrop-blur-md transition cursor-pointer"
              title="Skip intro animation"
            >
              <span>SKIP</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        /* Static Branded Fallback if video fails to decode */
        <div className="flex flex-col items-center text-center p-6 text-white max-w-md animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-6 text-emerald-400">
            <Scale className="w-8 h-8" />
          </div>
          <span className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase mb-2">
            JAMH X4
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase mb-2">
            Legal Metrology Compliance Checker
          </h1>
          <p className="text-xs text-slate-400 font-mono max-w-xs leading-relaxed mb-6">
            AI-Powered Label Scanning for Consumer Protection
          </p>
          <div className="w-24 h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="w-full h-full bg-emerald-400 rounded-full animate-pulse" />
          </div>
        </div>
      )}
    </aside>
  );
};

export default LoadingScreen;
