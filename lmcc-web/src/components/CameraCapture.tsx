import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshCw, Image as ImageIcon, CameraOff, Check, X, ShieldAlert } from 'lucide-react';
import { ScanGuide } from './ScanGuide';

interface CameraCaptureProps {
  onCapture: (imageBlob: Blob) => void;
  onFallbackToUpload: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  onFallbackToUpload,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSecure, setIsSecure] = useState(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedPreview, setCapturedPreview] = useState<{ blob: Blob; url: string } | null>(null);

  // Helper to reliably stop all tracks in an active stream
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore already stopped tracks
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start or switch the camera stream
  const startCamera = useCallback(async (mode: 'environment' | 'user' = facingMode) => {
    setIsLoading(true);
    setError(null);
    stopStream();

    // Check secure context (HTTPS or localhost)
    if (window.isSecureContext === false && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setIsSecure(false);
      setError('Camera access requires HTTPS in mobile browsers. Please use the image upload fallback.');
      setIsLoading(false);
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera API is not supported in this browser environment. Please use image upload.');
      setIsLoading(false);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsLoading(false);
    } catch (err: unknown) {
      console.error('Camera initialization failed:', err);
      let errorMsg = 'Could not access the camera. Please check permissions or upload an image.';

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMsg = 'Camera permission was denied. Please allow camera access in your browser site settings or use the image upload option.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMsg = 'No camera device found on this system. Please use the image upload fallback.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMsg = 'Camera is currently in use by another browser tab or app. Please close other camera apps and retry.';
        } else if (err.name === 'OverconstrainedError') {
          // Fallback to basic video constraint if resolution constraints fail
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
            streamRef.current = fallbackStream;
            if (videoRef.current) {
              videoRef.current.srcObject = fallbackStream;
              await videoRef.current.play();
            }
            setIsLoading(false);
            return;
          } catch {
            errorMsg = 'Could not initialize camera with required resolution.';
          }
        }
      }

      setError(errorMsg);
      setIsLoading(false);
    }
  }, [facingMode, stopStream]);

  // Handle lifecycle mount & unmount cleanup
  useEffect(() => {
    startCamera();

    return () => {
      stopStream();
      if (capturedPreview) {
        URL.revokeObjectURL(capturedPreview.url);
      }
    };
  }, [startCamera, stopStream, capturedPreview]);

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          // Pause camera stream while showing captured snapshot
          stopStream();
          const url = URL.createObjectURL(blob);
          setCapturedPreview({ blob, url });
        }
      },
      'image/jpeg',
      0.92
    );
  };

  const handleRetake = () => {
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview.url);
      setCapturedPreview(null);
    }
    startCamera();
  };

  const handleConfirmCapture = () => {
    if (capturedPreview) {
      const blob = capturedPreview.blob;
      URL.revokeObjectURL(capturedPreview.url);
      setCapturedPreview(null);
      stopStream();
      onCapture(blob);
    }
  };

  return (
    <div className="relative w-full aspect-[4/5] sm:aspect-[3/4] max-h-[580px] bg-[#05070a] rounded-[28px] sm:rounded-3xl overflow-hidden border border-white/[0.08] shadow-[0_25px_60px_rgba(0,0,0,0.65)] flex flex-col items-center justify-center select-none">
      {/* 1. Captured Image Review State */}
      {capturedPreview ? (
        <div className="relative w-full h-full flex flex-col justify-between bg-black">
          <img
            src={capturedPreview.url}
            alt="Captured product label"
            className="w-full h-full object-contain"
          />

          <div className="absolute top-4 inset-x-4 flex items-center justify-center">
            <span className="bg-black/80 backdrop-blur-md text-white text-xs font-sans font-medium px-4 py-1.5 rounded-full border border-white/15 shadow-lg">
              Review captured label
            </span>
          </div>

          <div className="absolute bottom-6 inset-x-0 flex items-center justify-center gap-4 px-6 z-20">
            {/* Retake Button */}
            <button
              type="button"
              onClick={handleRetake}
              className="flex-1 max-w-[140px] flex items-center justify-center gap-2 bg-white/[0.08] hover:bg-white/[0.14] text-slate-200 text-xs font-sans font-medium py-3 px-4 rounded-full border border-white/10 backdrop-blur-md transition active:scale-95 cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
              <span>Retake</span>
            </button>

            {/* Confirm & Proceed Button */}
            <button
              type="button"
              onClick={handleConfirmCapture}
              className="flex-1 max-w-[160px] flex items-center justify-center gap-2 bg-white text-slate-950 hover:bg-slate-100 text-xs font-sans font-semibold py-3 px-5 rounded-full backdrop-blur-md transition active:scale-95 cursor-pointer shadow-xl"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Use Photo</span>
            </button>
          </div>
        </div>
      ) : (
        /* 2. Live Camera View State */
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isLoading || error ? 'opacity-0' : 'opacity-100'
            }`}
          />

          {/* Target Scan Guide Overlay */}
          {!isLoading && !error && <ScanGuide />}

          {/* Loading Overlay */}
          {isLoading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#06080e] text-white gap-3 z-20">
              <div className="w-9 h-9 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-sans text-slate-400">Accessing device camera...</p>
            </div>
          )}

          {/* Error / Fallback State */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#06080e]/95 text-white p-6 text-center z-30">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-3">
                {!isSecure ? <ShieldAlert className="w-6 h-6" /> : <CameraOff className="w-6 h-6" />}
              </div>
              <h3 className="text-sm font-sans font-semibold text-slate-100 mb-1">
                {!isSecure ? 'Insecure Context' : 'Camera Unavailable'}
              </h3>
              <p className="text-xs font-sans text-slate-400 max-w-xs mb-6 leading-relaxed">{error}</p>

              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                {isSecure && (
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="w-full flex items-center justify-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-sans font-medium py-2.5 px-4 rounded-full border border-white/[0.08] transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry Camera
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    stopStream();
                    onFallbackToUpload();
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-white text-slate-950 hover:bg-slate-100 text-xs font-sans font-semibold py-2.5 px-4 rounded-full transition cursor-pointer shadow-lg"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  Upload Image Instead
                </button>
              </div>
            </div>
          )}

          {/* Camera Controls Bar (Active Preview) */}
          {!isLoading && !error && (
            <div className="absolute bottom-5 inset-x-0 flex items-center justify-around px-8 z-20">
              {/* Gallery / File Picker */}
              <button
                type="button"
                onClick={() => {
                  stopStream();
                  onFallbackToUpload();
                }}
                className="flex flex-col items-center gap-1.5 text-slate-300 hover:text-white transition group cursor-pointer"
                title="Choose from Gallery / Files"
              >
                <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center group-hover:border-white/30 group-hover:bg-black/80 transition active:scale-95 shadow-lg">
                  <ImageIcon className="w-5 h-5 text-slate-300 group-hover:text-white" />
                </div>
                <span className="text-[10px] font-sans font-medium text-slate-400 group-hover:text-slate-200">
                  Gallery
                </span>
              </button>

              {/* Shutter Capture Button */}
              <button
                type="button"
                onClick={captureFrame}
                className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-full p-1.5 border-2 border-white/80 hover:border-white flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer shadow-2xl group"
                title="Capture Product Label"
              >
                <div className="w-full h-full rounded-full bg-white group-hover:scale-95 transition-transform duration-150 flex items-center justify-center shadow-inner">
                  <div className="w-14 h-14 rounded-full border border-slate-300/40" />
                </div>
              </button>

              {/* Switch Front/Rear Camera */}
              <button
                type="button"
                onClick={toggleFacingMode}
                className="flex flex-col items-center gap-1.5 text-slate-300 hover:text-white transition group cursor-pointer"
                title="Switch Camera (Front/Rear)"
              >
                <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center group-hover:border-white/30 group-hover:bg-black/80 transition active:scale-95 shadow-lg">
                  <RefreshCw className="w-5 h-5 text-slate-300 group-hover:text-white" />
                </div>
                <span className="text-[10px] font-sans font-medium text-slate-400 group-hover:text-slate-200">
                  Flip
                </span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
