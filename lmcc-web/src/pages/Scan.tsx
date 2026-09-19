import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  UploadCloud,
  RefreshCw,
  Plus,
  Trash2,
  HelpCircle,
  ShieldCheck,
  Zap,
  FileCheck,
  Sun,
  EyeOff,
  Maximize,
  Sparkles,
  Check,
} from 'lucide-react';
import ZenoxNav from '../components/ui/ZenoxNav';
import { CameraCapture } from '../components/CameraCapture';
import { ImageUpload } from '../components/ImageUpload';
import { LanguageSelector } from '../components/LanguageSelector';
import { useImage, PanelType } from '../context/ImageContext';
import GlowBackground from '../components/ui/GlowBackground';
import SectionLabel from '../components/ui/SectionLabel';

export const Scan: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    panels,
    addPanel,
    addPanels,
    removePanel,
    clearPanels,
    currentPanelType,
    setCurrentPanelType,
  } = useImage();

  const initialMode = searchParams.get('mode') === 'upload' ? 'upload' : 'camera';
  const [mode, setMode] = useState<'camera' | 'upload'>(initialMode);

  const panelOptions: { type: PanelType; label: string; desc: string }[] = [
    { type: 'front', label: 'Front / Main Label', desc: 'Brand, Commodity & Net Quantity' },
    { type: 'back', label: 'Back Declaration', desc: 'Manufacturer, Address & Consumer Care' },
    { type: 'crimp', label: 'Crimp / Seal / Base', desc: 'Stamped MRP, Batch & Dates' },
    { type: 'other', label: 'Side / Additional', desc: 'Nutritional, Ingredients or Extra Panels' },
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
    <div className="min-h-screen bg-[#06080e] text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
      <GlowBackground variant="subtle" />

      {/* Subtle Environmental Foliage on Left Margin */}
      <div className="absolute -left-12 sm:-left-16 top-0 bottom-0 w-28 pointer-events-none -z-10 opacity-50 overflow-hidden hidden sm:block">
        <img
          src="/hero_leaves_accent.png"
          alt=""
          aria-hidden="true"
          className="h-full w-auto object-cover object-left opacity-50"
        />
      </div>

      {/* Floating Zenox Navigation */}
      <ZenoxNav />

      {/* Main Scanner Container */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 flex-1">
        {/* Sub-Nav Context Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-8 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-xs font-sans text-slate-400 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-xs font-sans text-slate-300 font-medium hidden sm:inline">
              Package scanner
            </span>
          </div>

          {/* Mode Switcher & Language Selector */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <LanguageSelector />

            <div className="flex bg-white/[0.04] rounded-full p-0.5 border border-white/[0.08] text-xs font-sans">
              <button
                type="button"
                onClick={() => setMode('camera')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium transition cursor-pointer ${
                  mode === 'camera'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Camera className="w-3 h-3" />
                <span>Camera</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('upload')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium transition cursor-pointer ${
                  mode === 'upload'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UploadCloud className="w-3 h-3" />
                <span>Upload</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3-Column Editorial Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-start">
          {/* ==================================================== */}
          {/* LEFT COLUMN: Editorial Headline & Reassurance (3 cols) */}
          {/* ==================================================== */}
          <div className="lg:col-span-3 flex flex-col items-start text-left space-y-6">
            <SectionLabel>Scan & Verify</SectionLabel>

            <h1 className="hero-display text-white tracking-tight text-4xl sm:text-5xl lg:text-[56px] leading-[0.95]">
              Scan <br />
              your <br />
              <span className="font-display-italic text-slate-300">package.</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-sans max-w-sm">
              Capture clear images of your product label and let LMCC check the mandatory Legal Metrology Rule 6 declarations.
            </p>

            {/* Reassurance Feature List */}
            <div className="space-y-4 pt-4 border-t border-white/[0.06] w-full text-xs font-sans">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-medium text-white">On-device processing</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">Your images never leave your device.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-medium text-white">Works offline</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">Scan anytime, anywhere.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
                  <FileCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-medium text-white">Rule 6 compliant</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">Checks all mandatory declarations instantly.</p>
                </div>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-500 font-sans">
              Safe. Private. Compliant.
            </div>
          </div>

          {/* ==================================================== */}
          {/* CENTER COLUMN: Camera Hero Stage & Multi-Panel (6 cols) */}
          {/* ==================================================== */}
          <div className="lg:col-span-6 flex flex-col items-center space-y-4 w-full max-w-xl mx-auto">
            {/* Panel Face Selector Tabs */}
            <div className="w-full flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                {panelOptions.map((opt, idx) => {
                  const hasCaptured = panels.some((p) => p.type === opt.type);
                  const isCurrent = currentPanelType === opt.type;
                  return (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => setCurrentPanelType(opt.type)}
                      className={`px-3 py-1.5 rounded-full text-xs font-sans transition flex items-center gap-1.5 cursor-pointer ${
                        isCurrent
                          ? 'bg-white text-slate-950 font-semibold shadow-sm'
                          : hasCaptured
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium'
                          : 'bg-white/[0.03] hover:bg-white/[0.06] text-slate-400 border border-white/[0.06]'
                      }`}
                    >
                      <span className="font-mono text-[10px] opacity-75">0{idx + 1}</span>
                      <span>{opt.label.split(' ')[0]}</span>
                      {hasCaptured && <Check className="w-3 h-3 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>

              {panels.length > 0 && (
                <button
                  type="button"
                  onClick={clearPanels}
                  className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition cursor-pointer font-sans"
                  title="Clear all captured photos"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              )}
            </div>

            {/* Current Target Panel Subtitle */}
            <div className="w-full flex items-center justify-between text-xs font-sans px-2">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[11px] text-emerald-400 font-medium">
                  0{panelOptions.findIndex((p) => p.type === currentPanelType) + 1} / {panelOptions.find((p) => p.type === currentPanelType)?.label.split(' ')[0].toUpperCase()}
                </span>
                <span className="text-slate-300 font-medium">
                  {panelOptions.find((p) => p.type === currentPanelType)?.label}
                </span>
              </div>
              <span className="text-slate-400 text-[11px] hidden sm:inline">
                {panelOptions.find((p) => p.type === currentPanelType)?.desc}
              </span>
            </div>

            {/* Primary Camera / Upload Stage */}
            <div className="w-full">
              {mode === 'camera' ? (
                <CameraCapture
                  onCapture={handleSingleImageReady}
                  onFallbackToUpload={() => setMode('upload')}
                />
              ) : (
                <div className="w-full bg-[#080c16]/90 p-6 sm:p-8 rounded-[28px] border border-white/[0.08] shadow-2xl">
                  <div className="text-center mb-6">
                    <h3 className="text-base font-semibold text-white font-sans">
                      Upload package photos
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 font-sans">
                      Select 1–5 photos of the same package (Front, Back, Crimp/Seal, Sides).
                    </p>
                  </div>
                  <ImageUpload
                    onImageSelected={handleSingleImageReady}
                    onImagesSelected={handleMultipleImagesReady}
                    multiple={true}
                  />
                </div>
              )}
            </div>

            {/* Captured Panels Horizontal Thumbnail Rail */}
            {panels.length > 0 && (
              <div className="w-full rounded-2xl bg-[#080c16]/80 border border-white/[0.08] p-4 shadow-xl space-y-3">
                <div className="flex items-center justify-between text-xs font-sans">
                  <span className="font-medium text-white">
                    Staged package photos ({panels.length} / 5)
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    All panels merge into 1 screening
                  </span>
                </div>

                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                  {panels.map((panel, idx) => (
                    <div
                      key={panel.id}
                      className="relative flex-shrink-0 group w-20 sm:w-24 aspect-[4/3] rounded-xl overflow-hidden border border-white/[0.1] bg-black"
                    >
                      <img
                        src={panel.previewUrl}
                        alt={panel.label}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 left-1 text-[9px] font-sans font-semibold bg-black/75 text-slate-200 px-1 py-0.5 rounded backdrop-blur-sm">
                        0{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removePanel(panel.id)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 text-slate-400 hover:text-rose-400 flex items-center justify-center transition cursor-pointer"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {panels.length < 5 && (
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('capture-section');
                        el?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="flex-shrink-0 w-20 sm:w-24 aspect-[4/3] rounded-xl border border-dashed border-white/[0.12] hover:border-white/30 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-white transition cursor-pointer font-sans"
                    >
                      <Plus className="w-4 h-4 text-emerald-400" />
                      <span className="text-[10px]">Add panel</span>
                    </button>
                  )}
                </div>

                {/* Primary Analyze Button */}
                <button
                  type="button"
                  onClick={handleStartAnalysis}
                  className="w-full py-3.5 px-6 rounded-full font-medium text-xs sm:text-sm bg-white text-slate-950 hover:bg-slate-100 transition-all duration-200 active:scale-98 flex items-center justify-center gap-2 cursor-pointer font-sans shadow-xl"
                >
                  <span>Analyze complete package ({panels.length} panel{panels.length > 1 ? 's' : ''})</span>
                  <span>→</span>
                </button>
              </div>
            )}

            {/* Bottom Multi-Image Advice Pill */}
            <div className="w-full p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-2.5 text-xs text-slate-400 font-sans">
              <HelpCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed text-[11px]">
                <strong className="text-slate-300">Multi-image advice:</strong> Capture Front (Net quantity), Back (Manufacturer & Consumer care), Crimp/Seal (MRP & Date) and Side views for a complete Rule 6 evaluation.
              </p>
            </div>
          </div>

          {/* ==================================================== */}
          {/* RIGHT COLUMN: For Best Results Guidance (3 cols) */}
          {/* ==================================================== */}
          <div className="lg:col-span-3 flex flex-col items-start text-left space-y-6 hidden lg:flex">
            <div className="w-full space-y-5">
              <div className="flex items-center gap-2 text-xs font-sans font-medium text-emerald-400 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>For best results</span>
              </div>

              <div className="space-y-4 text-xs font-sans">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-slate-300 flex-shrink-0 mt-0.5">
                    <Maximize className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-white">Hold steady</h4>
                    <p className="text-slate-400 text-[11px] mt-0.5">Keep your device still for sharp OCR.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-slate-300 flex-shrink-0 mt-0.5">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-white">Good lighting</h4>
                    <p className="text-slate-400 text-[11px] mt-0.5">Use natural or bright ambient light.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-slate-300 flex-shrink-0 mt-0.5">
                    <EyeOff className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-white">Avoid glare</h4>
                    <p className="text-slate-400 text-[11px] mt-0.5">Tilt slightly to reduce packaging reflections.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-slate-300 flex-shrink-0 mt-0.5">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-white">Keep label in frame</h4>
                    <p className="text-slate-400 text-[11px] mt-0.5">Ensure all printed declarations are visible.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-4 text-center text-xs text-slate-500 border-t border-white/[0.08] font-sans">
        <span>Rule 6 (Packaged Commodities) Rules, 2011 · Client-Side Screening</span>
      </footer>
    </div>
  );
};

export default Scan;
