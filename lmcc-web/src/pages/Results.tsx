import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  RotateCcw,
  Flag,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Maximize2,
  X,
  AlertCircle,
  HelpCircle,
  Building,
  Calendar,
  Phone,
  Scale,
  DollarSign,
  MapPin,
  Camera,
  Layers,
  Plus,
  Barcode,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { ExtractedLabel } from '../models/ExtractedLabel';
import { Verdict } from '../models/Verdict';
import { VerdictCard } from '../components/VerdictCard';
import { ViolationCard } from '../components/ViolationCard';
import { useImage } from '../context/ImageContext';
import { MultiPanelMergeResult } from '../services/parser/multiPanelMerger';
import { BarcodeCrossCheckResult } from '../services/barcode/barcodeCrossCheck';
import GlowBackground from '../components/ui/GlowBackground';
import SectionLabel from '../components/ui/SectionLabel';

export const Results: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { capturedImage, imagePreviewUrl, panels } = useImage();

  const state = location.state as {
    extractedLabel?: ExtractedLabel;
    verdict?: Verdict;
    imageBlob?: Blob | File;
    ocrQuality?: 'GOOD' | 'FAIR' | 'POOR';
    ocrConfidence?: number;
    ocrLanguage?: string;
    ocrAttempts?: number;
    multiPanelResult?: MultiPanelMergeResult;
    isMultiPanel?: boolean;
    barcodeCrossCheck?: BarcodeCrossCheckResult;
  } | null;

  const extractedLabel = state?.extractedLabel;
  const verdict = state?.verdict;
  const imageBlob = state?.imageBlob || capturedImage;
  const ocrQuality = state?.ocrQuality;
  const ocrConfidence = state?.ocrConfidence;
  const ocrLanguage = state?.ocrLanguage;
  const ocrAttempts = state?.ocrAttempts;
  const multiPanelResult = state?.multiPanelResult;
  const barcodeCrossCheck = state?.barcodeCrossCheck;

  const [showRawOcr, setShowRawOcr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isImageExpanded, setIsImageExpanded] = useState(false);

  // Empty / Failure State Handling
  if (!extractedLabel || !verdict) {
    return (
      <div className="min-h-screen bg-[#05070b] text-white flex flex-col items-center justify-center p-6 text-center selection:bg-emerald-500">
        <GlowBackground variant="subtle" />
        <div className="relative z-10 w-16 h-16 rounded-3xl bg-slate-900 border border-white/10 text-slate-400 flex items-center justify-center mb-4 shadow-xl">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="relative z-10 text-2xl font-black text-white mb-2 tracking-tight">
          Results Unavailable
        </h2>
        <p className="relative z-10 text-xs text-slate-400 mb-6 max-w-sm leading-relaxed font-mono">
          No active label screening data was found in your session. Please capture or upload a product label to evaluate Rule 6 declarations.
        </p>
        <button
          type="button"
          onClick={() => navigate('/scan')}
          className="relative z-10 bg-white text-slate-950 hover:bg-slate-100 text-xs font-bold px-6 py-3.5 rounded-full shadow-[0_0_25px_rgba(255,255,255,0.3)] transition active:scale-95 cursor-pointer"
        >
          Open Camera Scanner
        </button>
      </div>
    );
  }

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(extractedLabel.rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const declarationFields: {
    label: string;
    value?: string;
    key: 'mrp' | 'netQuantity' | 'manufacturer' | 'address' | 'date' | 'consumerCare';
    icon: React.ReactNode;
    isAmbiguous?: boolean;
  }[] = [
    {
      label: 'Maximum Retail Price (MRP)',
      value: extractedLabel.mrp,
      key: 'mrp',
      icon: <DollarSign className="w-4 h-4 text-emerald-400" />,
    },
    {
      label: 'Net Quantity',
      value: extractedLabel.netQuantity,
      key: 'netQuantity',
      icon: <Scale className="w-4 h-4 text-sky-400" />,
    },
    {
      label: 'Manufacturer / Packer',
      value: extractedLabel.manufacturer,
      key: 'manufacturer',
      icon: <Building className="w-4 h-4 text-blue-400" />,
    },
    {
      label: 'Premises Address',
      value: extractedLabel.address,
      key: 'address',
      icon: <MapPin className="w-4 h-4 text-indigo-400" />,
    },
    {
      label: 'Date of Mfg / Packing',
      value: extractedLabel.packingDate || extractedLabel.manufactureDate,
      key: 'date',
      icon: <Calendar className="w-4 h-4 text-amber-400" />,
      isAmbiguous: extractedLabel.isDateAmbiguous || extractedLabel.isFutureDate,
    },
    {
      label: 'Consumer Care Cell',
      value: extractedLabel.consumerCare,
      key: 'consumerCare',
      icon: <Phone className="w-4 h-4 text-purple-400" />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#05070b] text-slate-100 flex flex-col justify-between pb-12 selection:bg-emerald-500 selection:text-black">
      <GlowBackground variant="subtle" />

      {/* Floating Header */}
      <header className="sticky top-3 sm:top-5 z-40 max-w-4xl w-full mx-auto px-4">
        <div className="px-4 py-3 rounded-full bg-slate-950/80 border border-white/10 backdrop-blur-2xl shadow-xl flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white text-xs font-mono font-semibold py-1.5 px-3 rounded-full bg-white/5 border border-white/10 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>HOME</span>
          </button>

          <div className="text-center">
            <h1 className="text-xs sm:text-sm font-black text-white tracking-wide uppercase">
              Package Compliance Result
            </h1>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:block">
              Rule 6 (Packaged Commodities) Rules, 2011
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="flex items-center gap-1.5 text-slate-950 bg-white hover:bg-slate-100 text-xs font-bold py-1.5 px-3 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.3)] transition cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Scan Another</span>
            <span className="sm:hidden">Scan</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="relative z-10 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Main Verdict Banner */}
        <VerdictCard verdict={verdict} />

        {/* Multi-Panel Conflict Alert */}
        {multiPanelResult?.hasConflict && (
          <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-2xl flex items-start gap-3 text-xs font-mono text-rose-300">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block font-sans text-sm mb-1">
                Multi-Panel Discrepancies Flagged
              </strong>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {multiPanelResult.conflictDetails.map((detail, idx) => (
                  <li key={idx}>{detail}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Multi-Panel Package Session Gallery */}
        {panels.length > 1 ? (
          <div className="bg-slate-900/80 rounded-3xl p-5 border border-white/10 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Unified Package Session ({panels.length} Panels Analyzed)</span>
              </h3>
              <button
                type="button"
                onClick={() => navigate('/scan?mode=camera&panel=other&add=true')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Panel</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {panels.map((p, idx) => {
                const contrib = multiPanelResult?.panelContributions.find((c) => c.panelId === p.id);
                return (
                  <div
                    key={p.id}
                    className="bg-slate-950/80 rounded-2xl p-2.5 border border-white/5 flex flex-col items-center text-center"
                  >
                    <div
                      className="w-full h-24 rounded-xl overflow-hidden bg-black mb-2 border border-white/10 cursor-pointer hover:opacity-90 transition"
                      onClick={() => setIsImageExpanded(true)}
                    >
                      <img src={p.previewUrl} alt={p.label} className="w-full h-full object-contain" />
                    </div>
                    <span className="text-[11px] font-bold text-white font-sans truncate w-full">
                      {p.label}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono mb-1">Panel #{idx + 1}</span>
                    {contrib && contrib.fieldsFound.length > 0 ? (
                      <div className="flex flex-wrap justify-center gap-1 mt-1">
                        {contrib.fieldsFound.map((f) => (
                          <span
                            key={f}
                            className="text-[8px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-md"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[9px] text-slate-500 font-mono">No unique fields</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : imagePreviewUrl ? (
          <div className="bg-slate-900/80 rounded-3xl p-5 border border-white/10 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                Scanned Package Photograph
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/scan?mode=camera&panel=back&add=true')}
                  className="text-xs text-slate-300 hover:text-white font-mono flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full border border-white/10 cursor-pointer"
                  title="Scan back or other panel"
                >
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Add Back / Crimp Panel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsImageExpanded(true)}
                  className="text-xs text-slate-300 hover:text-white font-mono flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full border border-white/10 cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Enlarge</span>
                </button>
              </div>
            </div>

            <div className="relative w-full h-48 rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-white/5">
              <img
                src={imagePreviewUrl}
                alt="Captured label"
                className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition"
                onClick={() => setIsImageExpanded(true)}
              />
              <span className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md text-slate-300 text-[10px] font-mono px-2.5 py-1 rounded-full border border-white/10">
                Click to inspect original
              </span>
            </div>
          </div>
        ) : null}

        {/* Product Identification & Barcode Reference Cross-Check */}
        {barcodeCrossCheck && (
          <section className="bg-slate-900/80 rounded-3xl p-5 sm:p-6 border border-white/10 shadow-xl backdrop-blur-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                  <Barcode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span>Product Identification & Reference Cross-Check</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Independent secondary evidence via public product reference database
                  </p>
                </div>
              </div>

              {barcodeCrossCheck.barcode && (
                <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-[11px]">
                  <span className="bg-sky-500/10 text-sky-300 border border-sky-500/20 px-2.5 py-0.5 rounded-full font-bold">
                    {barcodeCrossCheck.barcode.format}: {barcodeCrossCheck.barcode.rawValue}
                  </span>
                  {barcodeCrossCheck.barcode.gs1Country && (
                    <span className="bg-white/5 text-slate-300 border border-white/10 px-2 py-0.5 rounded-full">
                      {barcodeCrossCheck.barcode.gs1Country}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Comparison Matrix or Not Detected Card */}
            {barcodeCrossCheck.overallStatus === 'NO_BARCODE_DETECTED' ? (
              <div className="p-3.5 bg-white/[0.02] rounded-2xl border border-white/5 flex items-start gap-2.5 text-xs text-slate-400 font-mono">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  No 1D/2D barcode was detected on the scanned panel(s). This does not affect OCR-based Legal Metrology compliance screening.
                </span>
              </div>
            ) : barcodeCrossCheck.overallStatus === 'REFERENCE_NOT_FOUND' ? (
              <div className="p-3.5 bg-white/[0.02] rounded-2xl border border-white/5 flex items-start gap-2.5 text-xs text-slate-400 font-mono">
                <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>
                  Barcode <strong>{barcodeCrossCheck.barcode?.rawValue}</strong> was identified. No matching public record was found in the reference catalog (Open Food Facts).
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Reference Product Identity */}
                {barcodeCrossCheck.referenceData?.productName && (
                  <div className="bg-slate-950/70 p-3 rounded-2xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                    <span className="text-slate-400">Reference Catalog Title:</span>
                    <span className="text-white font-bold font-sans text-sm">
                      {barcodeCrossCheck.referenceData.productName}
                    </span>
                  </div>
                )}

                {/* Side-by-side Field Comparison Matrix */}
                <div className="divide-y divide-white/5 bg-slate-950/50 rounded-2xl border border-white/5 overflow-hidden">
                  {barcodeCrossCheck.comparisons.map((comp) => (
                    <div
                      key={comp.field}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono"
                    >
                      <div className="space-y-1">
                        <span className="text-slate-400 uppercase text-[10px] block">
                          {comp.label}
                        </span>
                        <div className="flex items-center gap-4 text-slate-200">
                          <span>
                            Label OCR: <strong className="text-white">{comp.ocrValue || 'Not detected'}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Reference DB: <strong className="text-sky-300">{comp.referenceValue || 'N/A'}</strong>
                          </span>
                        </div>
                        {comp.note && <span className="text-[10px] text-slate-400 block">{comp.note}</span>}
                      </div>

                      <div className="self-end sm:self-center">
                        {comp.status === 'MATCH' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> Matched
                          </span>
                        ) : comp.status === 'PARTIAL_MATCH' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                            <Info className="w-3 h-3" /> Partial Match
                          </span>
                        ) : comp.status === 'DISCREPANCY' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <AlertTriangle className="w-3 h-3" /> Discrepancy
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">Unavailable</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Status Callout Banner */}
                <div
                  className={`p-3 rounded-xl border text-xs font-mono flex items-start gap-2 ${
                    barcodeCrossCheck.overallStatus === 'VERIFIED_MATCH'
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-sans text-xs">{barcodeCrossCheck.statusTitle}</strong>
                    <span>{barcodeCrossCheck.statusMessage}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-[10px] text-slate-500 font-mono leading-relaxed pt-1">
              <strong>Reference Source Notice:</strong> {barcodeCrossCheck.disclaimer}
            </p>
          </section>
        )}

        {/* Multi-Panel Smart Guidance Card */}
        {verdict.overallStatus === 'REVIEW' &&
          (!extractedLabel.mrp || !(extractedLabel.packingDate || extractedLabel.manufactureDate)) && (
            <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/10 border border-amber-500/30 rounded-3xl p-5 backdrop-blur-xl shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase flex items-center gap-1.5 mb-1">
                    <Layers className="w-3.5 h-3.5" />
                    Multi-Panel Package Guidance
                  </span>
                  <h4 className="text-sm sm:text-base font-bold text-white">
                    Missing {!extractedLabel.mrp && !extractedLabel.packingDate ? 'MRP & Date' : !extractedLabel.mrp ? 'MRP' : 'Date'}? Scan Package Crimp / Seal
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 font-mono max-w-xl">
                    In Indian packaged commodities, price and batch dates are frequently stamped on the crimped seal, base, or neck rather than the printed back label. Capture the crimp to merge evidence into this screening.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/scan?mode=camera&panel=crimp&add=true')}
                  className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-full flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition shrink-0 cursor-pointer font-mono active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  <span>Scan Crimp / Seal</span>
                </button>
              </div>
            </div>
          )}

        {/* Detected Declarations Grid with Source Panel Badges */}
        <div className="bg-slate-900/80 rounded-3xl p-6 border border-white/10 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-white/10">
            <div>
              <SectionLabel className="mb-2">/RULE 6 COMPLIANCE</SectionLabel>
              <h3 className="text-xl font-black text-white tracking-tight">
                Mandatory Declarations
              </h3>
            </div>
            <span className="text-[10px] font-mono font-semibold text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10 self-start sm:self-auto">
              Statutory Matching & Source Attribution
            </span>
          </div>

          <div className="divide-y divide-white/5">
            {declarationFields.map((field) => {
              const detected = Boolean(field.value && field.value.trim().length > 0);
              const isAmbiguous = Boolean(field.isAmbiguous);
              const origin = multiPanelResult?.fieldOrigins?.[field.key];

              return (
                <div key={field.key} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5 text-slate-300">
                      {field.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-400 block uppercase">
                          {field.label}
                        </span>
                        {origin && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            ✓ {origin.panelLabel}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-bold text-white mt-0.5 block break-words max-w-md font-sans">
                        {detected ? field.value : 'Not detected on scanned label'}
                      </span>
                    </div>
                  </div>

                  <div className="self-end sm:self-center font-mono">
                    {detected && !isAmbiguous ? (
                      <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Detected
                      </span>
                    ) : detected && isAmbiguous ? (
                      <span className="inline-flex items-center gap-1.5 bg-amber-500/15 text-amber-300 text-xs font-bold px-3 py-1 rounded-full border border-amber-500/30">
                        <AlertTriangle className="w-3.5 h-3.5" /> Needs Review
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 bg-white/5 text-slate-400 text-xs font-bold px-3 py-1 rounded-full border border-white/10">
                        <AlertCircle className="w-3.5 h-3.5 text-slate-500" /> Not Detected
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Review Items (Evidence-Based) */}
        {verdict.potentialViolations.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <SectionLabel glow className="mb-2">/ACTION ITEMS</SectionLabel>
                <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  Items Flagged for Review ({verdict.potentialViolations.length})
                </h3>
              </div>
            </div>

            <div className="space-y-3">
              {verdict.potentialViolations.map((violation) => (
                <ViolationCard key={violation.ruleId} violation={violation} />
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 text-center backdrop-blur-xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-emerald-500/30">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-white uppercase tracking-wide">
              All Standard Declarations Detected
            </h4>
            <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto leading-relaxed font-mono">
              The scanned label image contains legible representations for all mandatory Rule 6 declarations configured for screening.
            </p>
          </div>
        )}

        {/* OCR Signal Quality Pill */}
        {ocrQuality && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-900/80 rounded-2xl border border-white/10 text-xs font-mono shadow-xl backdrop-blur-xl">
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider">
                OCR Signal Quality:
              </span>
              <span
                className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] border ${
                  ocrQuality === 'GOOD'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : ocrQuality === 'FAIR'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}
              >
                {ocrQuality}
              </span>
              {typeof ocrConfidence === 'number' && (
                <span className="text-slate-400 text-[11px]">
                  ({Math.round(ocrConfidence)}% confidence)
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              {ocrLanguage && (
                <span>
                  Language: <strong className="text-white">{ocrLanguage}</strong>
                </span>
              )}
              {ocrAttempts && (
                <span>
                  Panels: <strong className="text-white">{ocrAttempts}</strong>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Raw Scanned OCR Text Inspector */}
        <div className="bg-slate-900/80 rounded-2xl border border-white/10 overflow-hidden shadow-xl backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setShowRawOcr(!showRawOcr)}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/5 transition cursor-pointer"
          >
            <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Raw Scanned OCR Text ({extractedLabel.rawText.length} characters)
            </span>
            {showRawOcr ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showRawOcr && (
            <div className="px-5 pb-5 pt-1 border-t border-white/5 bg-black/40">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[11px] font-mono text-slate-400">
                  Unfiltered Tesseract.js character recognition output:
                </span>
                <button
                  type="button"
                  onClick={handleCopyRaw}
                  className="flex items-center gap-1.5 text-xs text-white hover:text-white font-mono py-1 px-3 bg-white/10 hover:bg-white/20 border border-white/15 rounded-full transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Text'}</span>
                </button>
              </div>
              <pre className="text-xs font-mono bg-black/80 text-slate-200 p-4 rounded-xl overflow-x-auto max-h-56 whitespace-pre-wrap leading-relaxed border border-white/5">
                {extractedLabel.rawText || '(No text could be extracted)'}
              </pre>
            </div>
          )}
        </div>

        {/* Legal Disclaimer */}
        <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5 text-xs text-slate-400 space-y-2 font-mono">
          <div className="flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Screening Notice:</strong> Results are based on text detected from the scanned images and independent reference databases. Automated screening does not constitute legal certification.
            </p>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          {verdict.overallStatus === 'REVIEW' ? (
            <button
              type="button"
              onClick={() =>
                navigate('/report', {
                  state: {
                    extractedLabel,
                    verdict,
                    imageBlob,
                    isPassConcern: false,
                  },
                })
              }
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-4 px-6 rounded-full flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.25)] transition active:scale-[0.98] cursor-pointer"
            >
              <Flag className="w-5 h-5" />
              <span>Flag This Product</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                navigate('/report', {
                  state: {
                    extractedLabel,
                    verdict,
                    imageBlob,
                    isPassConcern: true,
                  },
                })
              }
              className="flex-1 bg-white/10 hover:bg-white/15 text-white font-bold py-4 px-6 rounded-full flex items-center justify-center gap-2 border border-white/10 transition active:scale-[0.98] cursor-pointer"
            >
              <Flag className="w-5 h-5 text-slate-400" />
              <span>Flag a Packaging Concern</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-4 px-6 rounded-full flex items-center justify-center gap-2 transition active:scale-[0.98] border border-slate-700 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Scan Another Package</span>
          </button>
        </div>
      </main>

      {/* Expanded Image Modal */}
      {isImageExpanded && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-xl animate-fade-in"
          onClick={() => setIsImageExpanded(false)}
        >
          <button
            type="button"
            onClick={() => setIsImageExpanded(false)}
            className="absolute top-5 right-5 z-10 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition border border-white/15"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-3xl max-h-[85vh] w-full flex items-center justify-center">
            <img
              src={imagePreviewUrl || (panels.length > 0 ? panels[0].previewUrl : '')}
              alt="Enlarged packaging photograph"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Results;
