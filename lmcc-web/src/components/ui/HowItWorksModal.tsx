import React, { useEffect, useRef } from 'react';
import { X, Play, Sparkles } from 'lucide-react';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoSrc?: string;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({
  isOpen,
  onClose,
  videoSrc = '/how-it-works.mp4',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Keyboard navigation (ESC to close) and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    // Lock body scroll while modal is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Auto-focus the close button for accessibility
    setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 50);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Video playback lifecycle management
  useEffect(() => {
    if (isOpen && videoRef.current) {
      // Attempt autoplay muted (standard browser compliance)
      videoRef.current.currentTime = 0;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          // Autoplay policy prevented playback, controls remain available for user interaction
          console.debug('Autoplay prevented by browser policy:', err);
        });
      }
    } else if (!isOpen && videoRef.current) {
      // Immediately pause and silence video when closed
      videoRef.current.pause();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="How LMCC Works Video Tutorial"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-2xl transition-opacity animate-in fade-in duration-200"
    >
      {/* Modal Container: Stop propagation so clicking video does not close modal */}
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-gradient-to-b from-slate-900/95 via-slate-950 to-slate-950 rounded-3xl sm:rounded-[2rem] border border-white/10 shadow-[0_0_60px_rgba(16,185,129,0.15)] overflow-hidden flex flex-col"
      >
        {/* Modal Header Bar */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wider font-mono">
                  How LMCC Works
                </span>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase">
                  10s Overview
                </span>
              </div>
            </div>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close tutorial video"
            className="p-2 rounded-full text-slate-400 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10 transition cursor-pointer active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video Player Container */}
        <div className="relative w-full bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            muted
            playsInline
            controls
            preload="metadata"
            className="w-full h-auto aspect-video max-h-[72vh] object-contain bg-black"
          >
            Your browser does not support embedded MP4 video playback.
          </video>
        </div>

        {/* Modal Footer Bar */}
        <div className="px-5 sm:px-7 py-3.5 bg-slate-950/80 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>Workflow: Scan package → Local OCR extraction → Legal Metrology Rule 6 validation.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="self-end sm:self-auto text-[11px] font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/10 transition cursor-pointer"
          >
            Close Tutorial
          </button>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksModal;
