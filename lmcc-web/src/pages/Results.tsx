import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Calendar,
  Building,
  Scale,
  MapPin,
  Phone,
  Layers,
  X,
  Camera,
  Plus,
} from 'lucide-react';
import { ExtractedLabel } from '../models/ExtractedLabel';
import { Verdict } from '../models/Verdict';
import { MultiPanelMergeResult } from '../services/parser/multiPanelMerger';
import { BarcodeCrossCheckResult } from '../services/barcode/barcodeCrossCheck';
import { useImage } from '../context/ImageContext';
import { VerdictCard } from '../components/VerdictCard';
import { ViolationCard } from '../components/ViolationCard';
import GlowBackground from '../components/ui/GlowBackground';

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
    ocrSuccessCount?: number;
    multiPanelResult?: MultiPanelMergeResult;
    isMultiPanel?: boolean;
    barcodeCrossCheck?: BarcodeCrossCheckResult;
    panelSnapshot?: { id: string; type: string; label: string; previewUrl: string }[];
    panelProgressSnapshot?: {
      panelId: string;
      panelLabel: string;
      hasText: boolean;
      charCount: number;
      confidence: number;
      quality: string;
    }[];
  } | null;

  const extractedLabel = state?.extractedLabel;
  const verdict = state?.verdict;
  const imageBlob = state?.imageBlob || capturedImage;
  const multiPanelResult = state?.multiPanelResult;
  const barcodeCrossCheck = state?.barcodeCrossCheck;

  const panelSnapshot = state?.panelSnapshot ?? panels.map((p) => ({
    id: p.id,
    type: p.type,
    label: p.label,
    previewUrl: p.previewUrl,
  }));
  const panelProgressSnapshot = state?.panelProgressSnapshot ?? [];

  const isMultiPanel = Boolean(
    state?.isMultiPanel ||
    panelSnapshot.length > 1 ||
    (multiPanelResult && multiPanelResult.panelContributions.length > 1)
  );

  const [showRawOcr, setShowRawOcr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isImageExpanded, setIsImageExpanded] = useState(false);

  // Empty / Failure State Handling
  if (!extractedLabel || !verdict) {
    return (
      <div className="min-h-screen bg-[#06080e] text-white flex flex-col items-center justify-center p-6 text-center selection:bg-emerald-500 font-sans">
        <GlowBackground variant="subtle" />
        <div className="relative z-10 w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-slate-400 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="relative z-10 text-2xl font-semibold text-white mb-2 tracking-tight">
          Results unavailable
        </h2>
        <p className="relative z-10 text-xs text-slate-400 mb-6 max-w-sm leading-relaxed">
          No active screening data was found in this session. Please capture or upload a commodity package to evaluate Rule 6 declarations.
        </p>
        <button
          type="button"
          onClick={() => navigate('/scan')}
          className="relative z-10 bg-white text-slate-950 hover:bg-slate-100 text-xs font-semibold px-6 py-3 rounded-full transition active:scale-95 cursor-pointer font-sans"
        >
          Open package scanner
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
    <div className="min-h-screen bg-[#06080e] text-slate-100 flex flex-col justify-between pb-12 selection:bg-emerald-500 selection:text-black font-sans">
      <GlowBackground variant="subtle" />

      {/* Floating Top Header */}
      <header className="sticky top-4 sm:top-6 z-40 max-w-4xl w-full mx-auto px-4">
        <div className="px-5 py-3 rounded-full bg-[#080c16]/85 border border-white/[0.08] backdrop-blur-2xl shadow-xl flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-sans transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>

          <div className="text-center">
            <h1 className="text-xs font-semibold text-white tracking-wide">
              Compliance Verification Sheet
            </h1>
          </div>

          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="flex items-center gap-1.5 text-slate-950 bg-white hover:bg-slate-100 text-xs font-semibold py-1.5 px-3.5 rounded-full transition cursor-pointer font-sans"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan another</span>
          </button>
        </div>
      </header>

      {/* Main Document Body */}
      <main className="relative z-10 max-w-4xl w-full mx-auto px-5 sm:px-8 py-8 space-y-8">
        {/* Main Verdict Banner */}
        <VerdictCard verdict={verdict} />

        {/* Multi-Panel Conflict Alert (if any) */}
        {multiPanelResult?.hasConflict && (
          <div className="p-5 bg-rose-950/30 border border-rose-500/30 rounded-3xl flex items-start gap-3.5 text-xs text-rose-300">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-white block font-sans text-sm">
                {multiPanelResult.hasProductClash
                  ? 'Contradictory product evidence detected across panels'
                  : 'Multi-panel declaration discrepancies flagged'}
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
        {isMultiPanel ? (
          <div className="rounded-3xl bg-[#090d16] p-6 border border-white/[0.08] shadow-xl space-y-4">
            <div className="flex items-baseline justify-between pb-3 border-b border-white/[0.06]">
              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  Package Session Overview
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {panelSnapshot.length} package panels analyzed for unified statutory evaluation
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/scan?mode=camera&panel=other&add=true')}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 cursor-pointer font-sans"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add panel</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {panelSnapshot.map((p, idx) => {
                const contrib = multiPanelResult?.panelContributions.find((c) => c.panelId === p.id);
                const pProgress = panelProgressSnapshot.find((pp) => pp.panelId === p.id);
                const ocrOk = pProgress?.hasText ?? (contrib && contrib.fieldsFound.length > 0);
                return (
                  <div
                    key={p.id}
                    className="bg-[#06080e] rounded-2xl p-3 border border-white/[0.06] flex flex-col items-center text-center space-y-2 hover:border-white/20 transition"
                  >
                    <div
                      className="w-full h-28 rounded-xl overflow-hidden bg-black/60 border border-white/[0.06] cursor-pointer hover:opacity-90 transition"
                      onClick={() => setIsImageExpanded(true)}
                    >
                      <img
                        src={p.previewUrl}
                        alt={p.label}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="text-xs font-semibold text-white truncate w-full">
                      {p.label}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Panel #{idx + 1}</span>

                    {/* Real OCR Status Badge */}
                    {pProgress ? (
                      <span
                        className={`text-[10px] font-sans font-medium px-2 py-0.5 rounded-full ${
                          ocrOk
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {ocrOk ? `✓ OCR ok · ${pProgress.charCount} chars` : '⚠ OCR failed'}
                      </span>
                    ) : null}

                    {contrib && contrib.fieldsFound.length > 0 ? (
                      <div className="flex flex-wrap justify-center gap-1 pt-1">
                        {contrib.fieldsFound.map((f) => (
                          <span
                            key={f}
                            className="text-[9px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-1.5 py-0.5 rounded"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500">
                        {ocrOk ? 'No unique fields' : 'Could not read panel'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : imagePreviewUrl ? (
          <div className="rounded-3xl bg-[#090d16] p-5 border border-white/[0.08] shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Scanned Package Photograph</span>
              <button
                type="button"
                onClick={() => navigate('/scan?mode=camera&panel=back&add=true')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.08] cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>Add back / crimp photo</span>
              </button>
            </div>
            <div className="relative w-full h-48 rounded-2xl overflow-hidden bg-black/60 flex items-center justify-center border border-white/[0.06]">
              <img
                src={imagePreviewUrl}
                alt="Captured label"
                className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition"
                onClick={() => setIsImageExpanded(true)}
              />
            </div>
          </div>
        ) : null}

        {/* Mandatory Declarations Table (Rule 6) */}
        <div className="rounded-3xl bg-[#090d16] p-6 sm:p-8 border border-white/[0.08] shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 pb-4 border-b border-white/[0.06]">
            <div>
              <h3 className="text-lg font-semibold text-white tracking-tight">
                Mandatory Declarations
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluation under Rule 6, Legal Metrology (Packaged Commodities) Rules, 2011
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono">6 statutory fields</span>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {declarationFields.map((field) => {
              const detected = Boolean(field.value && field.value.trim().length > 0);
              const isAmbiguous = Boolean(field.isAmbiguous);
              const origin = multiPanelResult?.fieldOrigins?.[field.key];
              const fieldStatus = extractedLabel.declarationCoverage?.fieldStatuses?.[field.key];

              return (
                <div
                  key={field.key}
                  className="py-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
                >
                  {/* Field Label & Source */}
                  <div className="md:col-span-4">
                    <span className="text-xs text-slate-400 font-medium block">
                      {field.label}
                    </span>
                    {origin && (
                      <span className="text-[10px] text-emerald-400/90 font-mono mt-0.5 block">
                        Source: {origin.panelLabel}
                      </span>
                    )}
                  </div>

                  {/* Detected Value */}
                  <div className="md:col-span-5 text-sm font-medium text-white break-words">
                    {detected
                      ? field.value
                      : fieldStatus === 'present_ocr_failed'
                      ? 'Cues visible on label but unreadable — closer focus required'
                      : '—'}
                  </div>

                  {/* Status Indicator */}
                  <div className="md:col-span-3 text-left md:text-right">
                    {detected && !isAmbiguous ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Detected
                      </span>
                    ) : detected && isAmbiguous ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400">
                        <AlertTriangle className="w-3.5 h-3.5" /> Needs review
                      </span>
                    ) : fieldStatus === 'present_ocr_failed' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400">
                        <AlertTriangle className="w-3.5 h-3.5" /> OCR unclear
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                        <AlertCircle className="w-3.5 h-3.5" /> Not detected
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Secondary Barcode Cross-Check Reference */}
        {barcodeCrossCheck && (
          <section className="rounded-3xl bg-[#090d16] p-6 sm:p-7 border border-white/[0.08] shadow-xl space-y-4">
            <div className="flex items-baseline justify-between pb-3 border-b border-white/[0.06]">
              <div>
                <h3 className="text-sm font-semibold text-white">Product Reference Evidence</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Secondary comparison against open product catalogs (Open Food Facts)
                </p>
              </div>
              {barcodeCrossCheck.barcode && (
                <span className="text-xs font-mono text-slate-400 bg-white/[0.03] px-2.5 py-1 rounded-full border border-white/[0.08]">
                  {barcodeCrossCheck.barcode.rawValue}
                </span>
              )}
            </div>

            {barcodeCrossCheck.overallStatus === 'NO_BARCODE_DETECTED' ? (
              <p className="text-xs text-slate-400 leading-relaxed">
                No 1D/2D barcode was detected on the scanned packaging photos. This does not impact Legal Metrology Rule 6 statutory evaluation.
              </p>
            ) : barcodeCrossCheck.overallStatus === 'REFERENCE_NOT_FOUND' ? (
              <p className="text-xs text-slate-400 leading-relaxed">
                Barcode <span className="font-mono text-white">{barcodeCrossCheck.barcode?.rawValue}</span> was detected. No matching public record was found in the reference catalog.
              </p>
            ) : (
              <div className="divide-y divide-white/[0.04] text-xs">
                {barcodeCrossCheck.comparisons.map((comp) => (
                  <div key={comp.field} className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-400">{comp.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium">OCR: {comp.ocrValue || '—'}</span>
                      <span className="text-slate-500">/</span>
                      <span className="text-slate-400">DB: {comp.referenceValue || '—'}</span>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          comp.status === 'MATCH'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-amber-500/10 text-amber-300'
                        }`}
                      >
                        {comp.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Flagged Review Items (if any) */}
        {verdict.potentialViolations.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Observations Flagged for Manual Review ({verdict.potentialViolations.length})
            </h3>
            <div className="space-y-3">
              {verdict.potentialViolations.map((violation) => (
                <ViolationCard key={violation.ruleId} violation={violation} />
              ))}
            </div>
          </div>
        )}

        {/* Raw OCR Inspection Accordion */}
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden bg-white/[0.01]">
          <button
            type="button"
            onClick={() => setShowRawOcr(!showRawOcr)}
            className="w-full px-5 py-3.5 flex items-center justify-between text-left text-xs text-slate-400 hover:text-white transition cursor-pointer"
          >
            <span>Raw character recognition stream ({extractedLabel.rawText.length} characters)</span>
            {showRawOcr ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showRawOcr && (
            <div className="p-4 border-t border-white/[0.06] bg-black/40 space-y-2">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCopyRaw}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white bg-white/5 px-2.5 py-1 rounded-full border border-white/10"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                {extractedLabel.rawText || '(No readable characters detected)'}
              </pre>
            </div>
          )}
        </div>

        {/* Primary Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() =>
              navigate('/report', {
                state: {
                  extractedLabel,
                  verdict,
                  imageBlob,
                  isPassConcern: verdict.overallStatus === 'PASS',
                },
              })
            }
            className="flex-1 py-3.5 px-6 rounded-full font-semibold text-xs bg-white text-slate-950 hover:bg-slate-100 transition active:scale-95 cursor-pointer font-sans shadow-lg text-center"
          >
            {verdict.overallStatus === 'PASS' ? 'File voluntary packaging observation →' : 'Report potential declaration issue →'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="flex-1 py-3.5 px-6 rounded-full font-medium text-xs bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/[0.08] transition cursor-pointer font-sans text-center"
          >
            Scan another product
          </button>
        </div>
      </main>

      {/* Enlarged Photo Modal */}
      {isImageExpanded && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-xl"
          onClick={() => setIsImageExpanded(false)}
        >
          <button
            type="button"
            onClick={() => setIsImageExpanded(false)}
            className="absolute top-5 right-5 z-10 p-2.5 bg-white/10 text-white rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="max-w-3xl max-h-[85vh] w-full flex items-center justify-center">
            <img
              src={imagePreviewUrl || (panelSnapshot.length > 0 ? panelSnapshot[0].previewUrl : '')}
              alt="Enlarged packaging photograph"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Results;
