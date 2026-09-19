import React, { useEffect, useRef } from 'react';
import { X, Play } from 'lucide-react';

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

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

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
      videoRef.current.currentTime = 0;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.debug('Autoplay prevented by browser policy:', err);
        });
      }
    } else if (!isOpen && videoRef.current) {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl bg-[#090d16] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Modal Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-slate-300">
              <Play className="w-3 h-3 fill-white text-white" />
            </div>
            <div>
              <span className="text-sm font-medium text-white tracking-wide">
                How LMCC Works
              </span>
              <span className="text-[11px] text-slate-500 ml-2 font-sans">
                Overview Tutorial
              </span>
            </div>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close tutorial video"
            className="p-1.5 rounded-full text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition cursor-pointer"
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
            className="w-full h-auto aspect-video max-h-[70vh] object-contain bg-black"
          >
            Your browser does not support embedded MP4 video playback.
          </video>
        </div>

        {/* Modal Footer Bar */}
        <div className="px-6 py-3.5 bg-[#06080e] border-t border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-sans text-slate-400">
          <span>Workflow: Capture packaging photos &rarr; On-device OCR &rarr; Rule 6 verification.</span>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-medium text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] px-3 py-1 rounded-full border border-white/[0.08] transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksModal;
