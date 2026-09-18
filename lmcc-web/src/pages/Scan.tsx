import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Camera, UploadCloud, HelpCircle, ShieldCheck } from 'lucide-react';
import { CameraCapture } from '../components/CameraCapture';
import { ImageUpload } from '../components/ImageUpload';
import { LanguageSelector } from '../components/LanguageSelector';
import { useImage } from '../context/ImageContext';
import GlowBackground from '../components/ui/GlowBackground';

export const Scan: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setCapturedImage } = useImage();

  const initialMode = searchParams.get('mode') === 'upload' ? 'upload' : 'camera';
  const [mode, setMode] = useState<'camera' | 'upload'>(initialMode);

  const handleImageReady = (image: Blob | File) => {
    // Store in clean ImageContext (no heavy binary in URL params)
    setCapturedImage(image);
    // Also pass state for resilient fallback
    navigate('/processing', { state: { hasImage: true } });
  };

  return (
    <div className="min-h-screen bg-[#05070b] text-white flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
      <GlowBackground variant="subtle" />

      {/* Top Navigation Floating Header */}
      <header className="sticky top-3 sm:top-5 z-40 max-w-lg w-full mx-auto px-4">
        <div className="px-4 py-3 rounded-full bg-slate-950/80 border border-white/10 backdrop-blur-2xl shadow-xl flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white text-xs font-mono font-semibold py-1.5 px-3 rounded-full bg-white/5 border border-white/10 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>HOME</span>
          </button>

          <div className="text-center">
            <h1 className="text-xs sm:text-sm font-black text-white tracking-wide uppercase">
              {mode === 'camera' ? 'Camera Scanner' : 'Upload Label'}
            </h1>
            <span className="text-[10px] text-slate-400 font-mono block">Rule 6 Screening</span>
          </div>

          {/* Mode Selector Toggle */}
          <div className="flex bg-white/5 rounded-full p-1 border border-white/10 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => setMode('camera')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold transition cursor-pointer ${
                mode === 'camera'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Scan with Camera"
            >
              <Camera className="w-3 h-3" />
              <span className="hidden sm:inline">Cam</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold transition cursor-pointer ${
                mode === 'upload'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Upload Label Photo"
            >
              <UploadCloud className="w-3 h-3" />
              <span className="hidden sm:inline">Up</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Scanner Container */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 max-w-lg mx-auto w-full">
        {/* Language Selector Bar */}
        <div className="w-full mb-3 flex justify-center">
          <LanguageSelector />
        </div>

        {mode === 'camera' ? (
          <div className="w-full flex flex-col items-center">
            <CameraCapture
              onCapture={handleImageReady}
              onFallbackToUpload={() => setMode('upload')}
            />
          </div>
        ) : (
          <div className="w-full bg-slate-900/80 p-6 sm:p-8 rounded-[2rem] border border-white/10 shadow-2xl backdrop-blur-2xl">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-white/5 text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-white/10">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Upload Package Label</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed font-mono">
                Select an image showing the mandatory declarations (MRP, Net Qty, Dates & Manufacturer).
              </p>
            </div>
            <ImageUpload onImageSelected={handleImageReady} />
          </div>
        )}

        {/* Guidance Notice */}
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 px-4 py-2.5 rounded-full border border-white/10 font-mono">
          <HelpCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Hold steady with good lighting. The image remains 100% on your device.</span>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="relative z-10 py-3 text-center text-[11px] text-slate-500 border-t border-white/10 flex items-center justify-center gap-1.5 font-mono">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>Legal Metrology (Packaged Commodities) Rules, 2011 • Rule 6</span>
      </footer>
    </div>
  );
};

export default Scan;
