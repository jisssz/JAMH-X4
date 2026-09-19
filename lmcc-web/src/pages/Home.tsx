import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  ShieldCheck,
  Scale,
  AlertCircle,
  History as HistoryIcon,
} from 'lucide-react';
import ZenoxNav from '../components/ui/ZenoxNav';
import GlowBackground from '../components/ui/GlowBackground';
import SectionLabel from '../components/ui/SectionLabel';
import HowItWorksModal from '../components/ui/HowItWorksModal';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [isHowItWorksOpen, setIsHowItWorksOpen] = React.useState(false);

  const statutoryRules = [
    {
      num: '01',
      title: 'Maximum Retail Price',
      rule: 'Rule 6(1)(da)',
      desc: 'Mandatory declaration of the retail price inclusive of all taxes, with clear currency designation (₹ or Rs.).',
      gazette: 'G.S.R. 629(E)',
    },
    {
      num: '02',
      title: 'Net Quantity',
      rule: 'Rule 6(1)(c)',
      desc: 'Standard metric measurement (g, kg, ml, l) with uniform spacing and proper decimal formatting.',
      gazette: 'Standard SI Units',
    },
    {
      num: '03',
      title: 'Date of Manufacture / Packing',
      rule: 'Rule 6(1)(d)',
      desc: 'Month and year indication with explicit statutory prefix (MFD, PKD) and prohibition of post-dated declarations.',
      gazette: 'MM/YYYY or DD/MM/YYYY',
    },
    {
      num: '04',
      title: 'Manufacturer, Packer or Importer',
      rule: 'Rule 6(1)(a)',
      desc: 'Clear disclosure of the responsible corporate entity and registered address for domestic and imported goods.',
      gazette: 'Identity & Address',
    },
    {
      num: '05',
      title: 'Consumer Care Details',
      rule: 'Rule 6(1)(e)',
      desc: 'Accessible consumer grievance contact details: telephone helpline number, email, or postal address.',
      gazette: 'Toll-free / Customer Care',
    },
  ];

  return (
    <div className="min-h-screen bg-[#06080e] text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
      {/* Restrained Ambient Background */}
      <GlowBackground variant="subtle" />

      {/* Floating Zenox Navigation */}
      <ZenoxNav onOpenHowItWorks={() => setIsHowItWorksOpen(true)} />

      {/* Main Container */}
      <main className="relative z-10 w-full max-w-5xl mx-auto px-5 sm:px-8 py-12 sm:py-20 space-y-28 sm:space-y-36">
        {/* ==================================================== */}
        {/* HERO SECTION */}
        {/* ==================================================== */}
        <section className="relative pt-4 sm:pt-10">
          {/* Subtle Left Environmental Foliage Accent */}
          <div className="absolute -left-12 sm:-left-20 top-0 bottom-0 w-28 sm:w-36 pointer-events-none -z-10 opacity-70 overflow-hidden hidden sm:block">
            <img
              src="/hero_leaves_accent.png"
              alt=""
              aria-hidden="true"
              className="h-full w-auto object-cover object-left opacity-60"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Left Hero Column: Typographic Focus */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              <SectionLabel className="mb-6">
                Legal Metrology · Packaging Compliance
              </SectionLabel>

              <h1 className="hero-display text-white tracking-tight">
                Check <br />
                before <br />
                you <span className="font-display-italic text-slate-300">buy.</span>
              </h1>

              <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-lg leading-relaxed font-sans font-normal">
                Screen packaged commodities and verify mandatory Legal Metrology Rule 6 statutory declarations directly in your browser.
              </p>

              {/* Action Buttons */}
              <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => navigate('/scan')}
                  className="flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full font-medium text-sm bg-white text-slate-950 hover:bg-slate-100 hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] transition-all duration-200 active:scale-95 cursor-pointer font-sans"
                >
                  <span>Scan package</span>
                  <span className="text-slate-400">→</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/scan?mode=upload')}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-medium text-sm bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/[0.08] transition-all duration-200 cursor-pointer font-sans"
                >
                  <UploadCloud className="w-4 h-4 text-slate-400" />
                  <span>Upload photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/history')}
                  className="flex items-center justify-center gap-2 px-5 py-3.5 text-xs text-slate-400 hover:text-white transition cursor-pointer font-sans"
                >
                  <HistoryIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>View history</span>
                </button>
              </div>

              {/* Minimal Trust Line */}
              <div className="mt-10 pt-6 border-t border-white/[0.06] flex items-center gap-6 text-xs text-slate-500 font-sans">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  On-device evaluation
                </span>
                <span>•</span>
                <span>Zero image transmission</span>
                <span>•</span>
                <span>Rule 6 (2011)</span>
              </div>
            </div>

            {/* Right Hero Column: Cinematic Package Visual with Verification Sheet */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="relative w-full max-w-[460px] group">
                {/* Ambient glow behind card/package */}
                <div className="absolute -inset-4 bg-emerald-500/10 rounded-3xl blur-2xl -z-10 pointer-events-none opacity-40" />
                <img
                  src="/hero_package_visual.png"
                  alt="LMCC Statutory Packaging Verification — Scanning 500g Commodity Package with Verification Sheet"
                  className="w-full h-auto rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.7)] object-cover"
                  width={428}
                  height={424}
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* HOW LMCC WORKS (EDITORIAL 4-STAGE FLOW) */}
        {/* ==================================================== */}
        <section id="how-it-works" className="space-y-12">
          <div className="border-t border-white/[0.08] pt-12">
            <SectionLabel className="mb-3">
              Workflow pipeline
            </SectionLabel>
            <h2 className="section-display text-white tracking-tight">
              How LMCC <span className="font-display-italic text-slate-300">works.</span>
            </h2>
            <p className="mt-3 text-sm text-slate-400 max-w-md">
              A four-step on-device screening workflow designed for fast statutory evaluation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-3 pt-4 border-t border-white/[0.08]">
              <span className="text-xs font-mono text-emerald-400 block">01</span>
              <h3 className="text-sm font-medium text-white">Scan</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Photograph 1–5 packaging faces (Front, Back, Crimp/Seal, Sides) with camera or upload.
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/[0.08]">
              <span className="text-xs font-mono text-slate-500 block">02</span>
              <h3 className="text-sm font-medium text-white">Extract</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                On-device OCR extracts typography and numbers locally without cloud transmission.
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/[0.08]">
              <span className="text-xs font-mono text-slate-500 block">03</span>
              <h3 className="text-sm font-medium text-white">Verify</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                The deterministic rules engine verifies mandatory fields against Rule 6 criteria.
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/[0.08]">
              <span className="text-xs font-mono text-slate-500 block">04</span>
              <h3 className="text-sm font-medium text-white">Review</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Receive an evidence-backed PASS or REVIEW verdict with source panel attribution.
              </p>
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* BUILT AROUND THE LABEL */}
        {/* ==================================================== */}
        <section className="border-t border-white/[0.08] pt-12 space-y-8">
          <div className="max-w-xl">
            <SectionLabel className="mb-3">
              Packaging intelligence
            </SectionLabel>
            <h2 className="section-display text-white tracking-tight">
              Built around the <span className="font-display-italic text-slate-300">label.</span>
            </h2>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed font-sans">
              Retail commodity packaging spreads mandatory disclosures across irregular pouches, crimped seals, and opposite panels. LMCC’s multi-panel engine stitches fragmented observations into one unified statutory dossier.
            </p>
          </div>

          <div className="relative rounded-3xl bg-[#080c16]/80 border border-white/[0.08] p-6 sm:p-10 overflow-hidden">
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-500/[0.05] rounded-full blur-3xl pointer-events-none" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-sans">
              <div className="space-y-2">
                <span className="text-emerald-400 font-mono text-[11px] block">01 / DISPARATE FACES</span>
                <h4 className="text-sm font-medium text-white">Multi-panel synthesis</h4>
                <p className="text-slate-400 leading-relaxed">Merges Front, Back, Crimp, and Seal into a single commodity session without losing panel attribution.</p>
              </div>
              <div className="space-y-2">
                <span className="text-emerald-400 font-mono text-[11px] block">02 / DETERMINISTIC CHECK</span>
                <h4 className="text-sm font-medium text-white">Rule 6 verification</h4>
                <p className="text-slate-400 leading-relaxed">Audits MRP tax clauses, metric net quantities, manufacturing dates, and consumer care compliance.</p>
              </div>
              <div className="space-y-2">
                <span className="text-emerald-400 font-mono text-[11px] block">03 / GS1 CROSS-CHECK</span>
                <h4 className="text-sm font-medium text-white">Barcode coherence</h4>
                <p className="text-slate-400 leading-relaxed">Validates printed EAN/UPC barcodes against Open Food Facts catalog records for cross-verification.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* STATUTORY DECLARATIONS (LEGAL METROLOGY RULE 6) */}
        {/* ==================================================== */}
        <section id="what-we-check" className="space-y-10">
          <div className="border-t border-white/[0.08] pt-12">
            <SectionLabel className="mb-3">
              Statutory criteria
            </SectionLabel>
            <h2 className="section-display text-white tracking-tight">
              Legal Metrology <span className="font-display-italic text-slate-300">Rule 6.</span>
            </h2>
            <p className="mt-3 text-sm text-slate-400 max-w-md">
              Mandatory declarations evaluated under Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011.
            </p>
          </div>

          <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
            {statutoryRules.map((rule) => (
              <div
                key={rule.num}
                className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-baseline group hover:bg-white/[0.01] transition px-1"
              >
                <div className="md:col-span-1 text-xs font-mono text-slate-500 group-hover:text-emerald-400 transition">
                  {rule.num}
                </div>
                <div className="md:col-span-4">
                  <h3 className="text-sm font-medium text-white tracking-tight font-sans">
                    {rule.title}
                  </h3>
                  <span className="text-xs text-emerald-400/90 font-mono mt-0.5 block">
                    {rule.rule}
                  </span>
                </div>
                <div className="md:col-span-5 text-xs text-slate-400 leading-relaxed font-sans">
                  {rule.desc}
                </div>
                <div className="md:col-span-2 text-right text-[11px] text-slate-500 font-mono hidden md:block">
                  {rule.gazette}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ==================================================== */}
        {/* MARKET SURVEILLANCE DATA HIGHLIGHT */}
        {/* ==================================================== */}
        <section className="border-t border-white/[0.08] pt-12 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <SectionLabel className="mb-3">
                Market Intelligence
              </SectionLabel>
              <h2 className="section-display text-white tracking-tight">
                Surveillance at <span className="font-display-italic text-slate-300">scale.</span>
              </h2>
              <p className="mt-3 text-sm text-slate-400 max-w-md font-sans">
                Aggregated, zero-PII compliance telemetry helping consumer safety authorities detect systemic declaration omissions.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => navigate('/authority-dashboard')}
                className="text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition cursor-pointer"
              >
                <span>Explore surveillance data</span>
                <span className="text-slate-500">→</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="p-7 rounded-2xl bg-[#090d16] border border-white/[0.08]">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Surveillance Volume</span>
              <div className="font-display text-3xl sm:text-4xl text-white font-normal mt-2">1,420+</div>
              <p className="text-xs text-slate-400 mt-2 font-sans">Pilot multi-district screenings across 5 commodity sectors.</p>
            </div>

            <div className="p-7 rounded-2xl bg-[#090d16] border border-white/[0.08]">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Zero False PASS</span>
              <div className="font-display text-3xl sm:text-4xl text-emerald-400 font-normal mt-2">100%</div>
              <p className="text-xs text-slate-400 mt-2 font-sans">Deterministic enforcement. Missing declarations mandate review.</p>
            </div>

            <div className="p-7 rounded-2xl bg-[#090d16] border border-white/[0.08]">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Privacy by Design</span>
              <div className="font-display text-3xl sm:text-4xl text-slate-200 font-normal mt-2">Zero PII</div>
              <p className="text-xs text-slate-400 mt-2 font-sans">Zero names, phones, GPS coordinates, or packaging images stored.</p>
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* SCANNER CALL TO ACTION */}
        {/* ==================================================== */}
        <section className="relative rounded-3xl bg-[#080c16]/80 border border-white/[0.08] p-10 sm:p-16 text-center shadow-xl">
          <div className="max-w-xl mx-auto flex flex-col items-center space-y-6">
            <h2 className="section-display text-white tracking-tight">
              Ready to check a <span className="font-display-italic text-slate-300">product?</span>
            </h2>

            <p className="text-sm text-slate-400 leading-relaxed font-sans max-w-md">
              Scan commodity packaging with your device camera or upload label photographs for instant statutory screening.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => navigate('/scan')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-medium text-sm bg-white text-slate-950 hover:bg-slate-100 hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] transition-all duration-200 active:scale-95 cursor-pointer font-sans"
              >
                <span>Scan package</span>
                <span>→</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/scan?mode=upload')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-medium text-xs bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] transition cursor-pointer font-sans"
              >
                <UploadCloud className="w-3.5 h-3.5 text-slate-400" />
                <span>Upload photo</span>
              </button>
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* LEGAL DISCLAIMER */}
        {/* ==================================================== */}
        <section className="p-4 sm:p-5 flex items-start gap-3 text-xs text-slate-500 font-sans border-t border-white/[0.06]">
          <AlertCircle className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-slate-400">Statutory notice:</strong> LMCC is an automated consumer screening aid. It does not issue official legal determinations, certifications, or regulatory penalties. Declarations are evaluated against visible photographic evidence under Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011.
          </p>
        </section>
      </main>

      {/* Clean Footer */}
      <footer className="relative z-10 w-full border-t border-white/[0.08] bg-[#06080e] py-8 text-xs text-slate-500 font-sans">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Scale className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-white">LMCC</span>
            <span>· Legal Metrology Compliance Checker</span>
          </div>
          <div className="text-slate-500 text-xs">
            <span>Smart India Hackathon 2026 · Team JAMH X4</span>
          </div>
        </div>
      </footer>

      {/* How It Works Video Modal */}
      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
      />
    </div>
  );
};

export default Home;
