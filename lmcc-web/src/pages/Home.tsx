import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  UploadCloud,
  ShieldCheck,
  Scale,
  AlertCircle,
  ChevronRight,
  History as HistoryIcon,
  CheckCircle2,
  ArrowRight,
  FileSearch,
  Building,
  Calendar,
  DollarSign,
  PhoneCall,
} from 'lucide-react';
import ZenoxNav from '../components/ui/ZenoxNav';
import GlowBackground from '../components/ui/GlowBackground';
import SectionLabel from '../components/ui/SectionLabel';
import BentoCard from '../components/ui/BentoCard';
import FloatingScanCard from '../components/ui/FloatingScanCard';
import RippleDistortion from '../components/motion/RippleDistortion';
import HowItWorksModal from '../components/ui/HowItWorksModal';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [isHowItWorksOpen, setIsHowItWorksOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-[#05070b] text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
      {/* Ambient Visual Background */}
      <GlowBackground variant="hero" />

      {/* Floating Zenox Navigation Bar */}
      <ZenoxNav onOpenHowItWorks={() => setIsHowItWorksOpen(true)} />

      {/* Main Container */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-24 sm:space-y-32">
        {/* ==================================================== */}
        {/* HERO SECTION */}
        {/* ==================================================== */}
        <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-slate-950/90 via-slate-900/60 to-slate-950/90 border border-white/10 p-6 sm:p-12 shadow-2xl backdrop-blur-3xl">
          {/* Ripple Distortion WebGL Canvas Layer (Offline & Pointer-events none) */}
          <div className="absolute inset-0 pointer-events-none opacity-40">
            <RippleDistortion
              tint="#10b981"
              tintAmount={0.25}
              strength={0.16}
              brushSize={130}
              quality="low"
            />
          </div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Left Hero Column: Headline & CTAs */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              <SectionLabel glow className="mb-5">
                /SMART PRODUCT VERIFICATION
              </SectionLabel>

              <h1 className="hero-title font-black text-white tracking-tight uppercase">
                Check <br />
                Before <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-emerald-400">
                  You Buy.
                </span>
              </h1>

              <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-xl leading-relaxed">
                Scan packaged product labels and instantly identify potential declaration issues against implemented Legal Metrology (Packaged Commodities) Rules, 2011.
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto">
                {/* Primary CTA: Camera Scan */}
                <button
                  type="button"
                  onClick={() => navigate('/scan')}
                  className="group flex items-center justify-between sm:justify-center gap-3 px-7 py-4 rounded-full font-bold text-sm bg-white text-slate-950 hover:bg-slate-100 hover:shadow-[0_0_30px_rgba(255,255,255,0.35)] transition-all duration-200 active:scale-95 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>Scan Product Label</span>
                  </div>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </button>

                {/* Secondary CTA: Image Upload */}
                <button
                  type="button"
                  onClick={() => navigate('/scan?mode=upload')}
                  className="flex items-center justify-center gap-2.5 px-6 py-4 rounded-full font-semibold text-sm bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 hover:border-white/20 backdrop-blur-md transition-all duration-200 active:scale-95 cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4 text-slate-400" />
                  <span>Upload Label Image</span>
                </button>

                {/* Tertiary CTA: Report History */}
                <button
                  type="button"
                  onClick={() => navigate('/history')}
                  className="flex items-center justify-center gap-2 px-5 py-4 rounded-full font-semibold text-sm text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <HistoryIcon className="w-4 h-4 text-emerald-400" />
                  <span>Report History</span>
                </button>
              </div>

              {/* Key Value Micro-Tags */}
              <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  100% Client-Side OCR
                </span>
                <span className="text-white/20">•</span>
                <span>Zero Image Upload</span>
                <span className="text-white/20">•</span>
                <span>Rule 6 Screening</span>
              </div>
            </div>

            {/* Right Hero Column: Floating Product Verification Card */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <FloatingScanCard className="transform hover:-translate-y-1 transition duration-300" />
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* VALUE / TRUST SECTION */}
        {/* ==================================================== */}
        <section className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <SectionLabel className="mb-3">
                /BUILT FOR EVERYDAY VERIFICATION
              </SectionLabel>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Inspect retail packaging with precision.
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md font-mono">
              Empowering consumers and enforcement screening with instant statutory declaration checks.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-3xl bg-slate-900/50 p-6 border border-white/10 backdrop-blur-xl hover:border-emerald-500/30 transition">
              <span className="text-2xl font-mono font-bold text-emerald-400 block mb-2">SCAN</span>
              <p className="text-sm text-slate-300 leading-relaxed">
                Extract label information in real-time using on-device OCR without transmitting camera streams.
              </p>
            </div>

            <div className="rounded-3xl bg-slate-900/50 p-6 border border-white/10 backdrop-blur-xl hover:border-emerald-500/30 transition">
              <span className="text-2xl font-mono font-bold text-sky-400 block mb-2">CHECK</span>
              <p className="text-sm text-slate-300 leading-relaxed">
                Compare detected declarations with implemented Legal Metrology Rule 6 statutory requirements.
              </p>
            </div>

            <div className="rounded-3xl bg-slate-900/50 p-6 border border-white/10 backdrop-blur-xl hover:border-emerald-500/30 transition">
              <span className="text-2xl font-mono font-bold text-indigo-400 block mb-2">UNDERSTAND</span>
              <p className="text-sm text-slate-300 leading-relaxed">
                See exactly which declaration is detected or requires attention with highlighted source evidence.
              </p>
            </div>

            <div className="rounded-3xl bg-slate-900/50 p-6 border border-white/10 backdrop-blur-xl hover:border-emerald-500/30 transition">
              <span className="text-2xl font-mono font-bold text-purple-400 block mb-2">REPORT</span>
              <p className="text-sm text-slate-300 leading-relaxed">
                Submit observations to the compliance database or queue them offline when network is unavailable.
              </p>
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* HOW IT WORKS SECTION */}
        {/* ==================================================== */}
        <section id="how-it-works" className="space-y-12">
          <div>
            <SectionLabel className="mb-3">
              /WORKFLOW PIPELINE
            </SectionLabel>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase">
              How LMCC Works
            </h2>
            <p className="mt-3 text-sm text-slate-400 max-w-xl">
              From package label capture to statutory rules evaluation in seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 01 */}
            <div className="relative rounded-3xl bg-gradient-to-b from-slate-900/80 to-slate-950 p-7 border border-white/10 backdrop-blur-xl flex flex-col justify-between group hover:border-white/20 transition">
              <div>
                <span className="text-4xl font-mono font-black text-slate-700 group-hover:text-emerald-400/80 transition">
                  01
                </span>
                <h3 className="text-xl font-bold text-white mt-4 mb-2">SCAN</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Capture the product label with live camera targeting or upload a photo from your gallery.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-white/5 flex items-center gap-2 text-xs font-mono text-slate-500">
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span>Target packaging</span>
              </div>
            </div>

            {/* Step 02 */}
            <div className="relative rounded-3xl bg-gradient-to-b from-slate-900/80 to-slate-950 p-7 border border-white/10 backdrop-blur-xl flex flex-col justify-between group hover:border-white/20 transition">
              <div>
                <span className="text-4xl font-mono font-black text-slate-700 group-hover:text-sky-400/80 transition">
                  02
                </span>
                <h3 className="text-xl font-bold text-white mt-4 mb-2">EXTRACT</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  High-speed Web Worker OCR extracts text locally with automatic contrast and script normalization.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-white/5 flex items-center gap-2 text-xs font-mono text-slate-500">
                <FileSearch className="w-3.5 h-3.5 text-sky-400" />
                <span>7 Indian languages</span>
              </div>
            </div>

            {/* Step 03 */}
            <div className="relative rounded-3xl bg-gradient-to-b from-slate-900/80 to-slate-950 p-7 border border-white/10 backdrop-blur-xl flex flex-col justify-between group hover:border-white/20 transition">
              <div>
                <span className="text-4xl font-mono font-black text-slate-700 group-hover:text-indigo-400/80 transition">
                  03
                </span>
                <h3 className="text-xl font-bold text-white mt-4 mb-2">VERIFY</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  The deterministic rules engine parses MRP, quantities, dates, and names against Rule 6 provisions.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-white/5 flex items-center gap-2 text-xs font-mono text-slate-500">
                <Scale className="w-3.5 h-3.5 text-indigo-400" />
                <span>Rule 6 screening</span>
              </div>
            </div>

            {/* Step 04 */}
            <div className="relative rounded-3xl bg-gradient-to-b from-slate-900/80 to-slate-950 p-7 border border-white/10 backdrop-blur-xl flex flex-col justify-between group hover:border-white/20 transition">
              <div>
                <span className="text-4xl font-mono font-black text-slate-700 group-hover:text-purple-400/80 transition">
                  04
                </span>
                <h3 className="text-xl font-bold text-white mt-4 mb-2">RESULT</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Receive a clear PASS or REVIEW screening verdict supported by concrete OCR textual evidence.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-white/5 flex items-center gap-2 text-xs font-mono text-slate-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Evidence backed</span>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* COMPLIANCE FEATURES / BENTO GRID */}
        {/* ==================================================== */}
        <section id="what-we-check" className="space-y-12">
          <div>
            <SectionLabel className="mb-3">
              /STATUTORY DECLARATIONS
            </SectionLabel>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase">
              What We Check
            </h2>
            <p className="mt-3 text-sm text-slate-400 max-w-xl">
              Implemented screening criteria aligned with the Legal Metrology (Packaged Commodities) Rules, 2011.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bento Card 1: MRP */}
            <BentoCard
              title="Maximum Retail Price (MRP)"
              subtitle="RULE 6(1)(da)"
              tag="Mandatory"
              icon={<DollarSign className="w-5 h-5" />}
              description="Verifies statutory maximum retail price declaration with inclusive tax phrasing (₹ or Rs.)."
              colSpan="1"
            >
              <span className="text-xs font-mono text-slate-500">Gazette: G.S.R. 629(E)</span>
            </BentoCard>

            {/* Bento Card 2: Net Quantity */}
            <BentoCard
              title="Net Weight / Volume"
              subtitle="RULE 6(1)(c)"
              tag="Mandatory"
              icon={<Scale className="w-5 h-5" />}
              description="Checks standard metric units (g, kg, ml, l) with spaces and decimal verification."
              colSpan="1"
            >
              <span className="text-xs font-mono text-slate-500">Standard SI Units Required</span>
            </BentoCard>

            {/* Bento Card 3: Dates */}
            <BentoCard
              title="Packing / Manufacture Date"
              subtitle="RULE 6(1)(d)"
              tag="Mandatory"
              icon={<Calendar className="w-5 h-5" />}
              description="Validates month and year declaration while screening out ambiguous dates and future post-dating."
              colSpan="1"
            >
              <span className="text-xs font-mono text-slate-500">MM/YYYY or DD/MM/YYYY</span>
            </BentoCard>

            {/* Bento Card 4: Manufacturer / Importer */}
            <BentoCard
              title="Manufacturer, Packer or Importer"
              subtitle="RULE 6(1)(a) & 6(1)(ab)"
              tag="Identity"
              icon={<Building className="w-5 h-5" />}
              description="Verifies the clear declaration of the manufacturer, packer, or importer name and registered premise address."
              colSpan="2"
            >
              <span className="text-xs font-mono text-slate-500">Domestic & Imported Package Screening</span>
            </BentoCard>

            {/* Bento Card 5: Consumer Care */}
            <BentoCard
              title="Consumer Care Details"
              subtitle="RULE 6(1)(n)"
              tag="Support"
              icon={<PhoneCall className="w-5 h-5" />}
              description="Screens for mandatory grievance redressal contacts: toll-free telephone, helpline, or email address."
              colSpan="1"
            >
              <span className="text-xs font-mono text-slate-500">Toll-free / Customer Email</span>
            </BentoCard>
          </div>
        </section>

        {/* ==================================================== */}
        {/* SCANNER CALL TO ACTION */}
        {/* ==================================================== */}
        <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-emerald-950/60 via-slate-950 to-indigo-950/60 p-8 sm:p-14 border border-white/15 shadow-2xl backdrop-blur-2xl text-center">
          {/* Glowing Ambient Halo */}
          <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-emerald-500/20 blur-[100px]" />

          <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
            <SectionLabel glow className="mb-4">
              /INSTANT SCREENING
            </SectionLabel>

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase">
              Ready to check a product?
            </h2>

            <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
              Put the package label in frame and let LMCC screen mandatory Legal Metrology declarations directly in your browser.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => navigate('/scan')}
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4.5 rounded-full font-bold text-base bg-white text-slate-950 hover:bg-slate-100 hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all duration-200 active:scale-95 cursor-pointer"
              >
                <Camera className="w-5 h-5 text-emerald-600" />
                <span>Scan Product Label</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/scan?mode=upload')}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-7 py-4.5 rounded-full font-semibold text-sm bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 hover:border-white/20 transition-all duration-200 active:scale-95 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4 text-slate-400" />
                <span>Upload Label Image</span>
              </button>
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* LEGAL DISCLAIMER */}
        {/* ==================================================== */}
        <section className="rounded-2xl bg-white/[0.02] border border-white/5 p-4 sm:p-5 flex items-start gap-3 text-xs text-slate-400 font-mono">
          <AlertCircle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-slate-300">Statutory Disclaimer:</strong> LMCC is an automated consumer assistance screening tool. It operates client-side and does not issue legal determinations, certifications, or formal non-compliance penalties. For official certification, refer to designated Legal Metrology inspectors.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-white/10 bg-slate-950/80 backdrop-blur-md py-8 text-center text-xs font-mono text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Scale className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white">LMCC</span>
            <span>• Smart India Hackathon 2026 (PS: SIH26034)</span>
          </div>
          <div>
            <span>Ministry of Consumer Affairs, Food & Public Distribution • Team JAMH X4</span>
          </div>
        </div>
      </footer>

      {/* How It Works Video Tutorial Modal */}
      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
      />
    </div>
  );
};

export default Home;
