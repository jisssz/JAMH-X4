import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Camera, UploadCloud, HelpCircle, ShieldCheck } from 'lucide-react';
import { CameraCapture } from '../components/CameraCapture';
import { ImageUpload } from '../components/ImageUpload';
import { LanguageSelector } from '../components/LanguageSelector';
import { useImage } from '../context/ImageContext';

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
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      {/* Top Navigation Header */}
      <header className="px-4 py-3.5 flex items-center justify-between border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-slate-300 hover:text-white text-sm font-medium py-1 px-2 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Home</span>
        </button>

        <div className="text-center">
          <h1 className="text-sm font-bold tracking-wide text-slate-100">
            {mode === 'camera' ? 'Label Camera Scanner' : 'Upload Label Image'}
          </h1>
          <span className="text-[10px] text-slate-400 block">Rule 6 Package Screening</span>
        </div>

        {/* Mode Selector Toggle */}
        <div className="flex bg-slate-800 rounded-xl p-1 border border-slate-700">
          <button
            type="button"
            onClick={() => setMode('camera')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              mode === 'camera'
                ? 'bg-gov-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Scan with Camera"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Camera</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              mode === 'upload'
                ? 'bg-gov-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Upload Label Photo"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload</span>
          </button>
        </div>
      </header>

      {/* Main Scanner Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 max-w-lg mx-auto w-full">
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
          <div className="w-full bg-slate-900/90 p-6 rounded-3xl border border-slate-800 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gov-600/20 text-gov-400 flex items-center justify-center mx-auto mb-3 border border-gov-500/20">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-100">Upload Package Label</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Select an image showing the mandatory declarations (MRP, Net Qty, Dates & Manufacturer).
              </p>
            </div>
            <ImageUpload onImageSelected={handleImageReady} />
          </div>
        )}

        {/* Guidance Notice */}
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 px-4 py-2.5 rounded-2xl border border-slate-800">
          <HelpCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Hold steady with good lighting. The image remains 100% on your device.</span>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="py-3 text-center text-[11px] text-slate-500 border-t border-slate-800 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>Legal Metrology (Packaged Commodities) Rules, 2011 • Rule 6</span>
      </footer>
    </div>
  );
};
