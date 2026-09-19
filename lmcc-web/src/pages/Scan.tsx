import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  UploadCloud,
  HelpCircle,
  ShieldCheck,
  Layers,
  RefreshCw,
  Plus,
  Trash2,
  Sparkles,
  Info,
} from 'lucide-react';
import { CameraCapture } from '../components/CameraCapture';
import { ImageUpload } from '../components/ImageUpload';
import { LanguageSelector } from '../components/LanguageSelector';
import { useImage, PanelType } from '../context/ImageContext';
import GlowBackground from '../components/ui/GlowBackground';

export const Scan: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { panels, addPanel, addPanels, updatePanelType, removePanel, clearPanels, currentPanelType, setCurrentPanelType } = useImage();

  const initialMode = searchParams.get('mode') === 'upload' ? 'upload' : 'camera';
  const [mode, setMode] = useState<'camera' | 'upload'>(initialMode);

  const panelOptions: { type: PanelType; label: string; desc: string }[] = [
    { type: 'front', label: 'Front / Main Label', desc: 'Brand, Commodity Name & Net Quantity' },
    { type: 'back', label: 'Back Declaration', desc: 'Manufacturer, Address & Consumer Care' },
    { type: 'crimp', label: 'Crimp / Seal / Base', desc: 'Stamped MRP, Batch No. & Mfg/Pkg Date' },
    { type: 'other', label: 'Side / Additional', desc: 'Nutritional, Imported or Extra Panels' },
  ];

  const handleSingleImageReady = (image: Blob | File) => {
    addPanel(image, currentPanelType);

    // Auto-advance to next logical panel type
    if (currentPanelType === 'front') setCurrentPanelType('back');
    else if (currentPanelType === 'back') setCurrentPanelType('crimp');
    else setCurrentPanelType('other');
  };

  const handleMultipleImagesReady = (images: File[]) => {
    addPanels(images);
  };

  const handleStartAnalysis = () => {
    if (panels.length === 0) return;
    navigate('/processing', { state: { hasImage: true } });
  };

  return (
    <div className="min-h-screen bg-[#05070b] text-white flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
      <GlowBackground variant="subtle" />

      {/* Top Navigation Floating Header */}
      <header className="sticky top-3 sm:top-5 z-40 max-w-xl w-full mx-auto px-4">
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
            <h1 className="text-xs sm:text-sm font-black text-white tracking-wide uppercase flex items-center gap-1.5 justify-center">
              <span>Package Scanner</span>
              {panels.length > 1 && (
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {panels.length} Panels
                </span>
              )}
            </h1>
            <span className="text-[10px] text-slate-400 font-mono block">Multi-Panel Evidence Fusion</span>
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
              title="Upload Label Photos"
            >
              <UploadCloud className="w-3 h-3" />
              <span className="hidden sm:inline">Upload</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Scanner Container */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-start p-4 max-w-xl mx-auto w-full space-y-4 my-2">
        {/* Language Selector Bar */}
        <div className="w-full flex justify-center">
          <LanguageSelector />
        </div>

        {/* Multi-Image Package Staging Tray */}
        {panels.length > 0 && (
          <section className="w-full bg-slate-900/90 border border-emerald-500/30 rounded-3xl p-4 sm:p-5 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">Staged Package Session</h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {panels.length} / 5 panels staged for single unified analysis
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={clearPanels}
                className="text-[11px] font-mono text-slate-400 hover:text-rose-400 flex items-center gap-1 bg-white/5 hover:bg-rose-500/10 px-2.5 py-1 rounded-full border border-white/10 transition cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Panel Thumbnails Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
              {panels.map((panel, idx) => (
                <div
                  key={panel.id}
                  className="relative group bg-slate-950/80 border border-white/10 rounded-2xl p-2 flex flex-col items-center hover:border-emerald-500/40 transition"
                >
                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => removePanel(panel.id)}
                    title="Remove this panel"
                    className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full bg-slate-900/90 border border-white/20 text-slate-400 hover:text-rose-400 hover:border-rose-500 flex items-center justify-center transition cursor-pointer shadow-md"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>

                  {/* Thumbnail */}
                  <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-black/40 mb-2">
                    <span className="absolute bottom-1 left-1 z-10 text-[9px] font-mono font-bold bg-black/70 text-slate-300 px-1.5 py-0.5 rounded backdrop-blur-sm">
                      #{idx + 1}
                    </span>
                    <img
                      src={panel.previewUrl}
                      alt={panel.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  </div>

                  {/* Panel Selector Tag */}
                  <select
                    value={panel.type}
                    onChange={(e) => updatePanelType(panel.id, e.target.value as PanelType)}
                    className="w-full text-[10px] font-mono bg-white/5 hover:bg-white/10 text-emerald-300 font-semibold border border-white/10 rounded-lg px-2 py-1 outline-none cursor-pointer"
                  >
                    {panelOptions.map((opt) => (
                      <option key={opt.type} value={opt.type} className="bg-slate-900 text-white">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              {/* Add More Slot (if < 5 panels) */}
              {panels.length < 5 && (
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('capture-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="aspect-[4/3] rounded-2xl border-2 border-dashed border-white/15 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-emerald-300 p-2 cursor-pointer"
                >
                  <Plus className="w-5 h-5 text-emerald-400" />
                  <span className="text-[10px] font-mono font-bold uppercase">Add Photo</span>
                  <span className="text-[9px] text-slate-500 font-mono">({5 - panels.length} left)</span>
                </button>
              )}
            </div>

            {/* Primary Analysis Trigger Button */}
            <button
              type="button"
              onClick={handleStartAnalysis}
              className="w-full py-3.5 px-6 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 text-slate-950 hover:brightness-110 shadow-[0_0_30px_rgba(16,185,129,0.35)] transition-all duration-200 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>ANALYZE COMPLETE PACKAGE ({panels.length} PHOTO{panels.length > 1 ? 'S' : ''})</span>
            </button>
          </section>
        )}

        {/* Capture / Upload Staging Area */}
        <section id="capture-section" className="w-full">
          {/* Panel Selector Header */}
          <div className="w-full mb-3 bg-slate-900/80 border border-white/10 rounded-2xl p-3 backdrop-blur-xl flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-emerald-400" />
                <span>Next Photo Classification:</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                {panelOptions.find((p) => p.type === currentPanelType)?.desc}
              </span>
            </div>

            {/* Quick Panel Type Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {panelOptions.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setCurrentPanelType(opt.type)}
                  className={`py-1.5 px-2 rounded-xl text-[10px] font-mono font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    currentPanelType === opt.type
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                  }`}
                >
                  <span>{opt.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {mode === 'camera' ? (
            <div className="w-full flex flex-col items-center">
              <CameraCapture
                onCapture={handleSingleImageReady}
                onFallbackToUpload={() => setMode('upload')}
              />
            </div>
          ) : (
            <div className="w-full bg-slate-900/80 p-5 sm:p-7 rounded-[2rem] border border-white/10 shadow-2xl backdrop-blur-2xl">
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-2xl bg-white/5 text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-white/10">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight">Upload Package Photos</h2>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed font-mono">
                  Select 1–5 photographs of the same physical commodity (Front, Back, Crimp/Seal, Sides).
                </p>
              </div>
              <ImageUpload
                onImageSelected={handleSingleImageReady}
                onImagesSelected={handleMultipleImagesReady}
                multiple={true}
              />
            </div>
          )}
        </section>

        {/* Guidance Notice */}
        <div className="mt-2 w-full flex items-start gap-2.5 text-xs text-slate-400 bg-slate-900/60 p-3.5 rounded-2xl border border-white/10 font-mono">
          <HelpCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Multi-Image Tip:</strong> Mandatory declarations are often printed across different faces. For packaged foods & FMCG, upload the <strong>Front</strong> (Net Qty), <strong>Back</strong> (Manufacturer & Customer Care), and <strong>Crimp/Seal</strong> (stamped MRP & Dates) for 100% statutory coverage.
          </span>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="relative z-10 py-3 text-center text-[11px] text-slate-500 border-t border-white/10 flex items-center justify-center gap-1.5 font-mono">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>Legal Metrology (Packaged Commodities) Rules, 2011 • Rule 6 Compliance Screening</span>
      </footer>
    </div>
  );
};

export default Scan;
