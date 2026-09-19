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
} from 'lucide-react';
import { CameraCapture } from '../components/CameraCapture';
import { ImageUpload } from '../components/ImageUpload';
import { LanguageSelector } from '../components/LanguageSelector';
import { useImage, PanelType } from '../context/ImageContext';
import GlowBackground from '../components/ui/GlowBackground';

export const Scan: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    panels,
    addPanel,
    addPanels,
    updatePanelType,
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

      {/* Floating Top Bar */}
      <header className="sticky top-4 sm:top-6 z-40 max-w-xl w-full mx-auto px-4">
        <div className="px-5 py-3 rounded-full bg-[#080c16]/85 border border-white/[0.08] backdrop-blur-2xl shadow-xl flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-slate-400 hover:text-white text-xs font-sans transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>

          <div className="text-center">
            <h1 className="text-xs font-sans font-semibold text-white tracking-wide">
              Package scanner
            </h1>
          </div>

          {/* Mode Switcher */}
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
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-start p-4 max-w-xl mx-auto w-full space-y-4 my-3">
        {/* Language Bar */}
        <div className="w-full flex justify-center">
          <LanguageSelector />
        </div>

        {/* Multi-Image Staging Tray */}
        {panels.length > 0 && (
          <section className="w-full rounded-3xl bg-[#090d16] border border-white/[0.08] p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white font-sans">
                  Staged package photos
                </h2>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  {panels.length} of 5 panels ready for unified analysis
                </p>
              </div>

              <button
                type="button"
                onClick={clearPanels}
                className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 bg-white/[0.03] hover:bg-rose-500/10 px-2.5 py-1 rounded-full border border-white/[0.08] transition cursor-pointer font-sans"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Thumbnail Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {panels.map((panel, idx) => (
                <div
                  key={panel.id}
                  className="relative group bg-[#06080e] border border-white/[0.06] rounded-2xl p-2 flex flex-col items-center hover:border-white/20 transition"
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

                  {/* Thumbnail Image */}
                  <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-black/50 mb-2">
                    <span className="absolute bottom-1.5 left-1.5 z-10 text-[10px] font-sans font-semibold bg-black/70 text-slate-300 px-1.5 py-0.5 rounded backdrop-blur-sm">
                      #{idx + 1}
                    </span>
                    <img
                      src={panel.previewUrl}
                      alt={panel.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  </div>

                  {/* Panel Classification Select */}
                  <select
                    value={panel.type}
                    onChange={(e) => updatePanelType(panel.id, e.target.value as PanelType)}
                    className="w-full text-xs font-sans bg-white/[0.03] text-slate-200 font-medium border border-white/[0.08] rounded-lg px-2 py-1 outline-none cursor-pointer"
                  >
                    {panelOptions.map((opt) => (
                      <option key={opt.type} value={opt.type} className="bg-[#090d16] text-white">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              {/* Add More Slot */}
              {panels.length < 5 && (
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('capture-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="aspect-[4/3] rounded-2xl border-2 border-dashed border-white/[0.08] hover:border-white/20 hover:bg-white/[0.02] transition flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-white p-2 cursor-pointer font-sans"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-medium">Add photo</span>
                  <span className="text-[10px] text-slate-500">({5 - panels.length} left)</span>
                </button>
              )}
            </div>

            {/* Primary Analysis Trigger */}
            <button
              type="button"
              onClick={handleStartAnalysis}
              className="w-full py-3.5 px-6 rounded-2xl font-semibold text-xs sm:text-sm bg-white text-slate-950 hover:bg-slate-100 transition-all duration-200 active:scale-98 flex items-center justify-center gap-2 cursor-pointer font-sans shadow-lg"
            >
              <span>Analyze complete package ({panels.length} photo{panels.length > 1 ? 's' : ''})</span>
              <span>→</span>
            </button>
          </section>
        )}

        {/* Capture / Upload Area */}
        <section id="capture-section" className="w-full">
          {/* Classification Bar */}
          <div className="w-full mb-3 bg-[#090d16] border border-white/[0.08] rounded-2xl p-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-slate-400 font-medium">Next photo face:</span>
              <span className="text-emerald-400 font-medium">
                {panelOptions.find((p) => p.type === currentPanelType)?.desc}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {panelOptions.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setCurrentPanelType(opt.type)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-sans font-medium transition cursor-pointer ${
                    currentPanelType === opt.type
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 border border-white/[0.06]'
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
            <div className="w-full bg-[#090d16] p-6 sm:p-8 rounded-3xl border border-white/[0.08] shadow-xl">
              <div className="text-center mb-6">
                <h2 className="text-base font-semibold text-white font-sans">Upload package photos</h2>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed font-sans">
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
        </section>

        {/* Guidance Notice */}
        <div className="w-full flex items-start gap-2.5 text-xs text-slate-400 bg-white/[0.02] p-3.5 rounded-2xl border border-white/[0.06] font-sans">
          <HelpCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            <strong className="text-slate-300">Multi-image advice:</strong> Statutory declarations are often printed across different faces. Uploading the <strong>Front</strong> (Net quantity), <strong>Back</strong> (Manufacturer & Customer care), and <strong>Crimp/Seal</strong> (MRP & Date) ensures comprehensive Rule 6 evaluation.
          </span>
        </div>
      </main>

      <footer className="relative z-10 py-4 text-center text-xs text-slate-500 border-t border-white/[0.08] font-sans">
        <span>Rule 6 (Packaged Commodities) Rules, 2011 · Client-Side Screening</span>
      </footer>
    </div>
  );
};

export default Scan;
