import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Scale,
  ArrowLeft,
  Camera,
  UploadCloud,
  RefreshCw,
  Plus,
  Trash2,
  ShieldCheck,
  Zap,
  FileCheck,
  Check,
} from "lucide-react";
import { CameraCapture } from "../components/CameraCapture";
import { ImageUpload } from "../components/ImageUpload";
import { LanguageSelector } from "../components/LanguageSelector";
import { useImage, PanelType } from "../context/ImageContext";
import GlowBackground from "../components/ui/GlowBackground";

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

  const initialMode = searchParams.get("mode") === "upload" ? "upload" : "camera";
  const [mode, setMode] = useState<"camera" | "upload">(initialMode);

  const panelOptions: { type: PanelType; code: string; short: string; label: string; desc: string }[] = [
    { type: "front", code: "01", short: "FRONT", label: "Front / Main Label", desc: "Brand, Commodity & Net Quantity" },
    { type: "back", code: "02", short: "BACK", label: "Back Declaration", desc: "Manufacturer, Address & Consumer Care" },
    { type: "crimp", code: "03", short: "CRIMP", label: "Crimp / Seal / Base", desc: "Stamped MRP, Batch & Dates" },
    { type: "other", code: "04", short: "SIDE", label: "Side / Additional", desc: "Nutritional, Ingredients or Extra Panels" },
  ];

  const currentPanelMeta = panelOptions.find((p) => p.type === currentPanelType) || panelOptions[0];

  const handleSingleImageReady = (image: Blob | File) => {
    addPanel(image, currentPanelType);

    // Auto-advance to next logical panel type
    if (currentPanelType === "front") setCurrentPanelType("back");
    else if (currentPanelType === "back") setCurrentPanelType("crimp");
    else setCurrentPanelType("other");
  };

  const handleMultipleImagesReady = (images: File[]) => {
    addPanels(images);
  };

  const handleStartAnalysis = () => {
    if (panels.length === 0) return;
    navigate("/processing", { state: { hasImage: true } });
  };

  return (
    <div className="min-h-screen bg-[#06080e] text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-black relative">
      <GlowBackground variant="subtle" />

      {/* Subtle Environmental Foliage on Left Margin */}
      <div className="absolute -left-12 sm:-left-16 top-0 bottom-0 w-28 pointer-events-none -z-10 opacity-40 overflow-hidden hidden sm:block">
        <img
          src="/hero_leaves_accent.png"
          alt=""
          aria-hidden="true"
          className="h-full w-auto object-cover object-left opacity-40"
        />
      </div>

      {/* 1. TOP FLOATING EDITORIAL NAVIGATION */}
      <header className="sticky top-4 sm:top-6 z-50 w-full px-4 sm:px-6 max-w-5xl mx-auto">
        <nav className="relative flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3 rounded-full bg-[#080c16]/85 border border-white/[0.08] backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
          {/* Left Brand with Back to Home */}
          <div
            onClick={() => navigate("/")}
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-300 group-hover:text-white group-hover:border-white/20 transition">
              <ArrowLeft className="w-3.5 h-3.5 sm:hidden" />
              <Scale className="w-3.5 h-3.5 hidden sm:block text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs sm:text-sm font-bold tracking-tight text-white font-sans">LMCC</span>
              <span className="hidden sm:inline text-xs font-display-italic text-slate-400">
                Legal Metrology
              </span>
            </div>
          </div>

          {/* Center Indicator */}
          <div className="hidden md:flex items-center gap-2 text-xs font-sans text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-slate-200 font-medium">Package scanner</span>
          </div>

          {/* Right Controls: Language Selector + Camera/Upload Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSelector />

            <div className="flex bg-white/[0.04] rounded-full p-0.5 border border-white/[0.08] text-xs font-sans">
              <button
                type="button"
                onClick={() => setMode("camera")}
                className={"flex items-center gap-1.5 px-3 py-1 rounded-full font-medium transition cursor-pointer " + (
                  mode === "camera"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                )}
                title="Use Live Camera"
              >
                <Camera className="w-3 h-3" />
                <span className="hidden sm:inline">Camera</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("upload")}
                className={"flex items-center gap-1.5 px-3 py-1 rounded-full font-medium transition cursor-pointer " + (
                  mode === "upload"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                )}
                title="Upload Image Files"
              >
                <UploadCloud className="w-3 h-3" />
                <span className="hidden sm:inline">Upload</span>
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* 2. MAIN EDITORIAL CONTENT: CAMERA AS PRIMARY VISUAL HERO */}
      <main className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex-1 flex flex-col items-center">
        {/* Intro Editorial Section */}
        <div className="text-center max-w-xl mx-auto mb-6 sm:mb-8 space-y-2.5">
          <div className="inline-flex items-center gap-2 text-[11px] font-mono tracking-widest text-emerald-400 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Package Verification</span>
          </div>

          <h1 className="hero-display text-white tracking-tight text-4xl sm:text-5xl lg:text-[54px] leading-[1.04]">
            Scan the package <br />
            <span className="font-display-italic text-slate-300">face by face.</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-sans max-w-md mx-auto">
            Capture each declaration panel clearly. LMCC combines all visible fields into one comprehensive screening result.
          </p>
        </div>

        {/* 3. EDITORIAL PACKAGE FACES PROGRESS */}
        <div className="w-full max-w-[720px] mb-4 space-y-3">
          {/* Progress Bar Tabs */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 px-1">
            <div className="flex items-center gap-4 sm:gap-8 overflow-x-auto">
              {panelOptions.map((opt) => {
                const hasCaptured = panels.some((p) => p.type === opt.type);
                const isCurrent = currentPanelType === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setCurrentPanelType(opt.type)}
                    className={"flex items-center gap-2 text-xs font-sans transition-all pb-1 cursor-pointer relative " + (
                      isCurrent
                        ? "text-white font-semibold"
                        : hasCaptured
                        ? "text-emerald-400 font-medium"
                        : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    <span className="font-mono text-[11px] opacity-75">{opt.code}</span>
                    <span className="tracking-wide">{opt.short}</span>
                    {hasCaptured && <Check className="w-3 h-3 text-emerald-400 stroke-[2.5]" />}
                    {isCurrent && (
                      <span className="absolute -bottom-3 inset-x-0 h-[2px] bg-emerald-400 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {panels.length > 0 && (
              <button
                type="button"
                onClick={clearPanels}
                className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1.5 transition cursor-pointer font-sans pl-2"
                title="Clear all captured photos"
              >
                <RefreshCw className="w-3 h-3" />
                <span className="text-[11px] hidden sm:inline">Reset</span>
              </button>
            )}
          </div>

          {/* Current Target Face Metadata */}
          <div className="flex items-center justify-between text-xs font-sans px-1">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[11px] text-emerald-400 font-medium">
                {currentPanelMeta.code} / {currentPanelMeta.short}
              </span>
              <span className="text-slate-200 font-medium">
                {currentPanelMeta.label}
              </span>
            </div>
            <span className="text-slate-400 text-[11px] hidden sm:inline">
              {currentPanelMeta.desc}
            </span>
          </div>
        </div>

        {/* 4. DOMINANT HERO CAMERA STAGE */}
        <div className="w-full max-w-[720px] mx-auto">
          {mode === "camera" ? (
            <CameraCapture
              onCapture={handleSingleImageReady}
              onFallbackToUpload={() => setMode("upload")}
            />
          ) : (
            <div className="w-full bg-[#080c16]/90 p-6 sm:p-10 rounded-[32px] border border-white/[0.08] shadow-[0_30px_70px_rgba(0,0,0,0.7)] text-center">
              <div className="mb-6">
                <h3 className="text-base font-semibold text-white font-sans">
                  Upload package photos
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-sans max-w-sm mx-auto">
                  Select 1–5 clear photos of the same package (Front, Back, Crimp/Seal, Sides).
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

        {/* 5. CAPTURED PANELS THUMBNAIL RAIL */}
        {panels.length > 0 && (
          <div className="w-full max-w-[720px] mx-auto mt-5 rounded-2xl bg-[#080c16]/80 border border-white/[0.08] p-4 sm:p-5 shadow-xl space-y-4">
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
                  className="relative flex-shrink-0 group w-20 sm:w-24 aspect-[4/3] rounded-xl overflow-hidden border border-white/[0.1] bg-black shadow-md"
                >
                  <img
                    src={panel.previewUrl}
                    alt={panel.label}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 left-1 text-[9px] font-sans font-semibold bg-black/75 text-slate-200 px-1 py-0.5 rounded backdrop-blur-sm">
                    0{idx + 1} {panel.type.slice(0, 4).toUpperCase()}
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
                    const el = document.getElementById("capture-stage");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="flex-shrink-0 w-20 sm:w-24 aspect-[4/3] rounded-xl border border-dashed border-white/[0.12] hover:border-white/30 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-white transition cursor-pointer font-sans"
                  title="Add another package face"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px]">Add panel</span>
                </button>
              )}
            </div>

            {/* High-Contrast Editorial Analyze Action */}
            <button
              type="button"
              onClick={handleStartAnalysis}
              className="w-full py-3.5 px-6 rounded-full font-medium text-xs sm:text-sm bg-white text-slate-950 hover:bg-slate-100 transition-all duration-200 active:scale-98 flex items-center justify-center gap-2 cursor-pointer font-sans shadow-xl"
            >
              <span>Analyze complete package ({panels.length} panel{panels.length > 1 ? "s" : ""})</span>
              <span>→</span>
            </button>
          </div>
        )}

        {/* 6. EDITORIAL SCAN GUIDANCE & TRUST INVARIANTS */}
        <div className="w-full max-w-xl mx-auto text-center space-y-3 pt-8 pb-4">
          <div className="text-[11px] font-mono tracking-widest text-slate-500 uppercase">
            Multi-Panel Screening
          </div>
          <p className="text-xs text-slate-400 leading-relaxed font-sans max-w-md mx-auto">
            Statutory declarations can appear across different package faces. Capture the relevant faces and LMCC will combine them into one comprehensive screening.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2 text-[11px] text-slate-500 font-sans">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>On-device processing</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Works offline</span>
            </span>
            <span className="flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Rule 6 compliant</span>
            </span>
          </div>

          <div className="text-[10px] text-slate-600 font-sans">
            Safe. Private. Compliant.
          </div>
        </div>
      </main>

      {/* 7. MINIMAL FOOTER */}
      <footer className="relative z-10 py-4 text-center text-xs text-slate-500 border-t border-white/[0.08] font-sans">
        <span>Rule 6 (Packaged Commodities) Rules, 2011 · Client-Side Screening</span>
      </footer>
    </div>
  );
};

export default Scan;
