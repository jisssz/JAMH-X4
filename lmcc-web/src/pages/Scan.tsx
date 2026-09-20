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
  Sun,
  EyeOff,
  Maximize,
  Sparkles,
  Info,
  ChevronRight,
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
    <div className="min-h-screen bg-[#05070b] text-slate-100 flex flex-col justify-between selection:bg-[#2ee6a6] selection:text-black relative overflow-x-hidden">
      <GlowBackground variant="subtle" />

      {/* Environmental Botanical Leaves on Left Margin - matching reference */}
      <div className="absolute -left-10 sm:-left-12 top-0 bottom-0 w-36 sm:w-44 pointer-events-none -z-10 opacity-60 overflow-hidden hidden md:block">
        <img
          src="/hero_leaves_accent.png"
          alt=""
          aria-hidden="true"
          className="h-full w-auto object-cover object-left filter brightness-90 contrast-125"
        />
      </div>

      {/* 1. GLOBAL LMCC TOP NAVIGATION (Matching Home) */}
      <header className="sticky top-3 sm:top-5 z-50 w-full px-4 sm:px-6 max-w-5xl mx-auto">
        <nav className="relative flex items-center justify-between px-5 sm:px-7 py-2.5 sm:py-3 rounded-full bg-[#080c16]/85 border border-white/[0.08] backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
          {/* Brand */}
          <div
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#2ee6a6] group-hover:border-[#2ee6a6]/40 transition">
              <Scale className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold tracking-tight text-white font-sans">LMCC</span>
              <span className="hidden sm:inline text-xs font-display-italic text-slate-400">
                Legal Metrology
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-6 text-xs font-sans font-medium text-slate-300">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="hover:text-white transition cursor-pointer"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => navigate("/#how-it-works")}
              className="hover:text-white transition cursor-pointer"
            >
              How it works
            </button>
            <button
              type="button"
              onClick={() => navigate("/rules")}
              className="hover:text-white transition cursor-pointer"
            >
              Rules
            </button>
            <button
              type="button"
              onClick={() => navigate("/history")}
              className="hover:text-white transition cursor-pointer"
            >
              History
            </button>
            <button
              type="button"
              onClick={() => navigate("/authority-dashboard")}
              className="hover:text-white transition cursor-pointer"
            >
              Analytics
            </button>
          </div>

          {/* Right Action */}
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSelector />
            <button
              type="button"
              onClick={() => navigate("/scan")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white text-slate-950 hover:bg-slate-100 transition shadow-sm font-sans cursor-pointer"
            >
              <span>Scan product</span>
              <span className="text-slate-400 font-normal">→</span>
            </button>
          </div>
        </nav>
      </header>

      {/* 2. SUB-BAR (Context & Controls Bar matching reference) */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-3 sm:mt-5">
        <div className="flex items-center justify-between py-2 border-b border-white/[0.06] text-xs font-sans gap-2">
          {/* Left: Home link */}
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition cursor-pointer font-medium flex-shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Home</span>
          </button>

          {/* Center: Package scanner indicator */}
          <div className="flex items-center gap-1.5 text-slate-300 font-medium flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2ee6a6]" />
            <span className="text-[11px] sm:text-xs tracking-wide">Package scanner</span>
          </div>

          {/* Right: Mode Switch [ Camera | Upload ] matching reference */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
            <div className="flex bg-white/[0.04] rounded-full p-0.5 border border-white/[0.08] text-xs font-sans">
              <button
                type="button"
                onClick={() => setMode("camera")}
                className={"flex items-center gap-1.5 px-3 sm:px-3.5 py-1 rounded-full font-medium transition cursor-pointer text-xs " + (
                  mode === "camera"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Camera className="w-3 h-3" />
                <span>Camera</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("upload")}
                className={"flex items-center gap-1.5 px-3 sm:px-3.5 py-1 rounded-full font-medium transition cursor-pointer text-xs " + (
                  mode === "upload"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <UploadCloud className="w-3 h-3" />
                <span>Upload</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN HERO 3-COLUMN EDITORIAL COMPOSITION (Matching Reference) */}
      <main className="relative z-10 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-12 items-center">

          {/* ========================================================= */}
          {/* COLUMN 1: LEFT EDITORIAL MESSAGING (25% -> 3.5 cols)      */}
          {/* ========================================================= */}
          <div className="lg:col-span-4 xl:col-span-3 flex flex-col items-start text-left space-y-6 lg:space-y-7">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest text-[#2ee6a6] uppercase font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2ee6a6]" />
              <span>SCAN &amp; VERIFY</span>
            </div>

            {/* Editorial Serif Heading */}
            <h1 className="hero-display text-[#F5F3EE] tracking-tight font-normal leading-[0.88] text-[52px] sm:text-[68px] lg:text-[76px] xl:text-[84px]">
              Scan <br />
              your <br />
              <span className="font-display-italic text-white">package.</span>
            </h1>

            {/* Description */}
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-sans max-w-[340px]">
              Capture clear images of your product label and let LMCC check the mandatory Legal Metrology Rule 6 declarations.
            </p>

            {/* 3 Compact Information Rows (Desktop) - No cards, clean separators */}
            <div className="hidden lg:block space-y-4 pt-4 border-t border-white/[0.08] w-full max-w-[340px] text-xs font-sans">
              <div className="flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-300 flex-shrink-0 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2ee6a6]" />
                </div>
                <div>
                  <h4 className="font-medium text-white text-xs">On-device processing</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5 leading-snug">Your images never leave your device.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-300 flex-shrink-0 mt-0.5">
                  <Zap className="w-3.5 h-3.5 text-[#2ee6a6]" />
                </div>
                <div>
                  <h4 className="font-medium text-white text-xs">Works offline</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5 leading-snug">Scan anytime, anywhere.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-300 flex-shrink-0 mt-0.5">
                  <FileCheck className="w-3.5 h-3.5 text-[#2ee6a6]" />
                </div>
                <div>
                  <h4 className="font-medium text-white text-xs">Rule 6 compliant</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5 leading-snug">Checks all mandatory declarations instantly.</p>
                </div>
              </div>
            </div>

            {/* Tagline */}
            <div className="hidden lg:block text-[11px] text-slate-500 font-sans tracking-wide">
              Safe. Private. Compliant.
            </div>
          </div>

          {/* ========================================================= */}
          {/* COLUMN 2: CENTER CAMERA STAGE (50% -> 5.5 cols)           */}
          {/* ========================================================= */}
          <div className="lg:col-span-5 xl:col-span-6 flex flex-col items-center space-y-4 w-full max-w-[620px] mx-auto">
            {/* Step Navigation for Package Faces (01 FRONT  02 BACK  03 CRIMP  04 SIDE) */}
            <div className="w-full flex items-center justify-between border-b border-white/[0.08] pb-2 px-1">
              <div className="flex items-center gap-5 sm:gap-7 overflow-x-auto">
                {panelOptions.map((opt) => {
                  const hasCaptured = panels.some((p) => p.type === opt.type);
                  const isCurrent = currentPanelType === opt.type;
                  return (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => setCurrentPanelType(opt.type)}
                      className={"flex items-center gap-1.5 text-xs font-sans transition-all pb-1 cursor-pointer relative " + (
                        isCurrent
                          ? "text-white font-medium"
                          : hasCaptured
                          ? "text-[#2ee6a6] font-medium"
                          : "text-slate-500 hover:text-slate-300"
                      )}
                    >
                      <span className="font-mono text-[11px] opacity-75">{opt.code}</span>
                      <span className="tracking-wide text-[11px]">{opt.short}</span>
                      {hasCaptured && <Check className="w-3 h-3 text-[#2ee6a6] stroke-[2.5]" />}
                      {isCurrent && (
                        <span className="absolute -bottom-2 inset-x-0 h-[2px] bg-[#2ee6a6] rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>

              {panels.length > 0 && (
                <button
                  type="button"
                  onClick={clearPanels}
                  className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition cursor-pointer font-sans pl-2"
                  title="Clear all captured photos"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span className="text-[11px] hidden sm:inline">Reset</span>
                </button>
              )}
            </div>

            {/* The Dominant Camera Viewport */}
            <div className="w-full">
              {mode === "camera" ? (
                <CameraCapture
                  onCapture={handleSingleImageReady}
                  onFallbackToUpload={() => setMode("upload")}
                />
              ) : (
                <div className="w-full bg-[#05070b] p-6 sm:p-8 rounded-[28px] border border-white/[0.08] shadow-[0_25px_60px_rgba(0,0,0,0.65)] text-center">
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

            {/* Staged Panels Horizontal Thumbnail Strip */}
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
                      onClick={() => setMode("upload")}
                      className="flex-shrink-0 w-20 sm:w-24 aspect-[4/3] rounded-xl border border-dashed border-white/[0.12] hover:border-white/30 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-white transition cursor-pointer font-sans"
                      title="Add another package face"
                    >
                      <Plus className="w-4 h-4 text-[#2ee6a6]" />
                      <span className="text-[10px]">Add panel</span>
                    </button>
                  )}
                </div>

                {/* Primary Complete Package Analyze Button */}
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

            {/* Bottom Multi-Image Advice Bar (Matching Reference) */}
            <div className="w-full p-3.5 sm:p-4 rounded-[20px] bg-white/[0.03] border border-white/[0.08] flex items-center justify-between gap-3 text-xs text-slate-400 font-sans shadow-lg">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[#2ee6a6] flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px] sm:text-xs">
                  <strong className="text-slate-200 font-medium">Multi-image advice:</strong> Capture Front (Net quantity), Back (Manufacturer &amp; Consumer care), Crimp/Seal (MRP &amp; Date) and Side views for a complete Rule 6 evaluation.
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 hidden sm:block flex-shrink-0" />
            </div>
          </div>

          {/* ========================================================= */}
          {/* COLUMN 3: RIGHT GUIDANCE (FOR BEST RESULTS) (25% -> 3.5 cols) */}
          {/* ========================================================= */}
          <div className="lg:col-span-3 xl:col-span-3 flex flex-col items-start text-left space-y-6 hidden lg:flex">
            {/* Header */}
            <div className="flex items-center gap-2 text-xs font-sans font-medium text-[#2ee6a6] tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-white text-sm font-semibold">For best results</span>
            </div>

            {/* 4 Clean Rows with Minimal Line Icons */}
            <div className="space-y-6 text-xs font-sans w-full">
              {/* Row 1 */}
              <div className="flex items-start gap-3.5 group">
                <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-slate-300 flex-shrink-0 mt-0.5 group-hover:border-white/20 transition">
                  <Camera className="w-4 h-4 text-slate-300" />
                </div>
                <div>
                  <h4 className="font-medium text-white text-xs">Hold steady</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5 leading-snug">Keep your device still</p>
                </div>
              </div>

              {/* Row 2 */}
              <div className="flex items-start gap-3.5 group">
                <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-slate-300 flex-shrink-0 mt-0.5 group-hover:border-white/20 transition">
                  <Sun className="w-4 h-4 text-slate-300" />
                </div>
                <div>
                  <h4 className="font-medium text-white text-xs">Good lighting</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5 leading-snug">Use natural or bright light</p>
                </div>
              </div>

              {/* Row 3 */}
              <div className="flex items-start gap-3.5 group">
                <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-slate-300 flex-shrink-0 mt-0.5 group-hover:border-white/20 transition">
                  <EyeOff className="w-4 h-4 text-slate-300" />
                </div>
                <div>
                  <h4 className="font-medium text-white text-xs">Avoid glare</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5 leading-snug">Tilt to reduce reflections</p>
                </div>
              </div>

              {/* Row 4 */}
              <div className="flex items-start gap-3.5 group">
                <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-slate-300 flex-shrink-0 mt-0.5 group-hover:border-white/20 transition">
                  <Maximize className="w-4 h-4 text-slate-300" />
                </div>
                <div>
                  <h4 className="font-medium text-white text-xs">Keep label in frame</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5 leading-snug">Ensure all text is visible</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Mobile Editorial Rows & Tagline (Rendered underneath camera on small viewports) */}
        <div className="lg:hidden mt-8 space-y-5 pt-6 border-t border-white/[0.08] max-w-[620px] mx-auto w-full text-xs font-sans">
          <div className="space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-300 flex-shrink-0 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2ee6a6]" />
              </div>
              <div>
                <h4 className="font-medium text-white text-xs">On-device processing</h4>
                <p className="text-slate-400 text-[11px] mt-0.5 leading-snug">Your images never leave your device.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-300 flex-shrink-0 mt-0.5">
                <Zap className="w-3.5 h-3.5 text-[#2ee6a6]" />
              </div>
              <div>
                <h4 className="font-medium text-white text-xs">Works offline</h4>
                <p className="text-slate-400 text-[11px] mt-0.5 leading-snug">Scan anytime, anywhere.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-300 flex-shrink-0 mt-0.5">
                <FileCheck className="w-3.5 h-3.5 text-[#2ee6a6]" />
              </div>
              <div>
                <h4 className="font-medium text-white text-xs">Rule 6 compliant</h4>
                <p className="text-slate-400 text-[11px] mt-0.5 leading-snug">Checks all mandatory declarations instantly.</p>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 tracking-wide text-center pt-2">
            Safe. Private. Compliant.
          </div>
        </div>
      </main>

      {/* 4. MINIMAL FOOTER */}
      <footer className="relative z-10 py-4 text-center text-xs text-slate-500 border-t border-white/[0.08] font-sans">
        <span>Rule 6 (Packaged Commodities) Rules, 2011 · Client-Side Screening</span>
      </footer>
    </div>
  );
};

export default Scan;
