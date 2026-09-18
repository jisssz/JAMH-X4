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
  Sparkles,
} from 'lucide-react';
import { ExtractedLabel } from '../models/ExtractedLabel';
import { Verdict } from '../models/Verdict';
import { VerdictCard } from '../components/VerdictCard';
import { ViolationCard } from '../components/ViolationCard';
import { useImage } from '../context/ImageContext';

export const Results: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { capturedImage, imagePreviewUrl } = useImage();

  const state = location.state as {
    extractedLabel?: ExtractedLabel;
    verdict?: Verdict;
    imageBlob?: Blob | File;
    ocrQuality?: 'GOOD' | 'FAIR' | 'POOR';
    ocrConfidence?: number;
    ocrLanguage?: string;
    ocrAttempts?: number;
  } | null;

  const extractedLabel = state?.extractedLabel;
  const verdict = state?.verdict;
  const imageBlob = state?.imageBlob || capturedImage;
  const ocrQuality = state?.ocrQuality;
  const ocrConfidence = state?.ocrConfidence;
  const ocrLanguage = state?.ocrLanguage;
  const ocrAttempts = state?.ocrAttempts;

  const [showRawOcr, setShowRawOcr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isImageExpanded, setIsImageExpanded] = useState(false);

  // ----------------------------------------------------
  // Empty / Failure State Handling
  // ----------------------------------------------------
  if (!extractedLabel || !verdict) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-200 text-slate-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Results Unavailable</h2>
        <p className="text-xs text-slate-600 mb-6 max-w-xs leading-relaxed">
          No active label screening data was found in your session. Please capture or upload a product label to evaluate Rule 6 declarations.
        </p>
        <button
          type="button"
          onClick={() => navigate('/scan')}
          className="bg-gov-700 hover:bg-gov-800 text-white text-sm font-bold px-6 py-3.5 rounded-xl shadow-md transition active:scale-95"
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
    key: keyof ExtractedLabel;
    icon: React.ReactNode;
    isAmbiguous?: boolean;
  }[] = [
    {
      label: 'Maximum Retail Price (MRP)',
      value: extractedLabel.mrp,
      key: 'mrp',
      icon: <DollarSign className="w-4 h-4 text-emerald-600" />,
    },
    {
      label: 'Net Quantity',
      value: extractedLabel.netQuantity,
      key: 'netQuantity',
      icon: <Scale className="w-4 h-4 text-gov-600" />,
    },
    {
      label: 'Manufacturer / Packer',
      value: extractedLabel.manufacturer,
      key: 'manufacturer',
      icon: <Building className="w-4 h-4 text-blue-600" />,
    },
    {
      label: 'Premises Address',
      value: extractedLabel.address,
      key: 'address',
      icon: <MapPin className="w-4 h-4 text-indigo-600" />,
    },
    {
      label: 'Date of Mfg / Packing',
      value: extractedLabel.packingDate || extractedLabel.manufactureDate,
      key: 'packingDate',
      icon: <Calendar className="w-4 h-4 text-amber-600" />,
      isAmbiguous: extractedLabel.isDateAmbiguous || extractedLabel.isFutureDate,
    },
    {
      label: 'Consumer Care Cell',
      value: extractedLabel.consumerCare,
      key: 'consumerCare',
      icon: <Phone className="w-4 h-4 text-purple-600" />,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between pb-12">
      {/* ---------------------------------------------------- */}
      {/* A. Header */}
      {/* ---------------------------------------------------- */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 text-xs font-semibold py-1 px-2.5 rounded-lg border border-slate-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>
          <div className="text-center">
            <h1 className="text-sm font-black text-slate-900 tracking-tight">Compliance Screening Result</h1>
            <span className="text-[10px] text-slate-500 font-medium">Legal Metrology (Packaged Commodities) Rules, 2011</span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="flex items-center gap-1.5 text-gov-700 hover:text-gov-800 text-xs font-bold py-1.5 px-3 bg-gov-50 hover:bg-gov-100 rounded-lg border border-gov-200 transition"
          >
            <span>Scan Another</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-3xl w-full mx-auto px-4 py-6 space-y-6">
        {/* ---------------------------------------------------- */}
        {/* B. Main Verdict Banner */}
        {/* ---------------------------------------------------- */}
        <VerdictCard verdict={verdict} />

        {/* ---------------------------------------------------- */}
        {/* C. Summary Metrics Bar */}
        {/* ---------------------------------------------------- */}
        <div className="grid grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="border-r border-slate-100">
            <span className="text-xs text-slate-500 block">Declarations Detected</span>
            <span className="text-lg font-black text-slate-900 mt-0.5 block">
              {verdict.passedChecks} / {verdict.totalChecks}
            </span>
          </div>
          <div className="border-r border-slate-100">
            <span className="text-xs text-slate-500 block">Needs Review</span>
            <span
              className={`text-lg font-black mt-0.5 block ${
                verdict.flaggedChecks > 0 ? 'text-amber-600' : 'text-emerald-600'
              }`}
            >
              {verdict.flaggedChecks}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block">OCR Engine</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
              Completed (Client)
            </span>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* Scanned Image vs Extracted Declarations Card */}
        {/* ---------------------------------------------------- */}
        {imagePreviewUrl && (
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-gov-600" />
                Scanned Package Photograph
              </h3>
              <button
                type="button"
                onClick={() => setIsImageExpanded(true)}
                className="text-xs text-gov-600 hover:text-gov-800 font-semibold flex items-center gap-1"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Enlarge Photo</span>
              </button>
            </div>

            <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-200">
              <img
                src={imagePreviewUrl}
                alt="Captured label"
                className="w-full h-full object-contain cursor-pointer hover:opacity-95 transition"
                onClick={() => setIsImageExpanded(true)}
              />
              <span className="absolute bottom-2 right-2 bg-black/75 backdrop-blur-md text-white text-[10px] px-2.5 py-1 rounded-full border border-white/20">
                Click to inspect original image
              </span>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* Detected Declarations Grid */}
        {/* ---------------------------------------------------- */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gov-600" />
                Mandatory Declarations (Rule 6)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluated against Legal Metrology (Packaged Commodities) Rules, 2011 statutory provisions.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 hidden sm:inline-block">
              Evidence-Based Matching
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {declarationFields.map((field) => {
              const detected = Boolean(field.value && field.value.trim().length > 0);
              const isAmbiguous = Boolean(field.isAmbiguous);

              return (
                <div key={field.key} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5 border border-slate-100">
                      {field.icon}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 block">
                        {field.label}
                      </span>
                      <span className="text-sm font-bold text-slate-900 mt-0.5 block break-words max-w-md">
                        {detected ? field.value : 'Not detected on scanned label'}
                      </span>
                    </div>
                  </div>

                  <div className="self-end sm:self-center">
                    {detected && !isAmbiguous ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Detected
                      </span>
                    ) : detected && isAmbiguous ? (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5" /> Needs Review
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full border border-slate-200">
                        <AlertCircle className="w-3.5 h-3.5 text-slate-500" /> Not Detected
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* Detailed Review Items (Evidence-Based) */}
        {/* ---------------------------------------------------- */}
        {verdict.potentialViolations.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Items Flagged for Review ({verdict.potentialViolations.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Specific potential issues based on missing or ambiguous declarations.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {verdict.potentialViolations.map((violation) => (
                <ViolationCard key={violation.ruleId} violation={violation} />
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-emerald-950">All Standard Declarations Detected</h4>
            <p className="text-xs text-emerald-800 mt-1 max-w-md mx-auto">
              The scanned label image contains legible representations for all mandatory Rule 6 declarations configured for screening.
            </p>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* OCR Quality & Language Assessment Pill */}
        {/* ---------------------------------------------------- */}
        {ocrQuality && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-white rounded-2xl border border-slate-200 text-xs shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                OCR Signal Quality:
              </span>
              <span
                className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                  ocrQuality === 'GOOD'
                    ? 'bg-emerald-100 text-emerald-800'
                    : ocrQuality === 'FAIR'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {ocrQuality}
              </span>
              {typeof ocrConfidence === 'number' && (
                <span className="text-slate-500 text-[11px]">
                  ({Math.round(ocrConfidence)}% char confidence)
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              {ocrLanguage && (
                <span>
                  Language: <strong className="text-slate-700">{ocrLanguage}</strong>
                </span>
              )}
              {ocrAttempts && (
                <span>
                  Passes: <strong className="text-slate-700">{ocrAttempts}</strong>
                </span>
              )}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* Raw Scanned OCR Text Inspector */}
        {/* ---------------------------------------------------- */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => setShowRawOcr(!showRawOcr)}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition"
          >
            <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Raw Scanned OCR Text ({extractedLabel.rawText.length} characters)
            </span>
            {showRawOcr ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showRawOcr && (
            <div className="px-5 pb-5 pt-1 border-t border-slate-100 bg-slate-50/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] text-slate-500">
                  Unfiltered Tesseract.js character recognition output:
                </span>
                <button
                  type="button"
                  onClick={handleCopyRaw}
                  className="flex items-center gap-1 text-xs text-gov-700 hover:text-gov-800 font-semibold py-1 px-2.5 bg-white border border-slate-200 rounded-lg shadow-2xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Text'}</span>
                </button>
              </div>
              <pre className="text-xs font-mono bg-slate-900 text-slate-200 p-4 rounded-xl overflow-x-auto max-h-56 whitespace-pre-wrap leading-relaxed">
                {extractedLabel.rawText || '(No text could be extracted)'}
              </pre>
            </div>
          )}
        </div>

        {/* ---------------------------------------------------- */}
        {/* OCR Quality Notice & Legal Disclaimer */}
        {/* ---------------------------------------------------- */}
        <div className="p-4 bg-slate-200/60 rounded-2xl border border-slate-300/60 text-xs text-slate-600 space-y-1.5">
          <div className="flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <p>
              <strong>OCR Quality Notice:</strong> Results are based on text detected from the scanned image. Poor lighting, glare, blur, curved packaging, or partially visible labels may affect accuracy.
            </p>
          </div>
          <div className="flex items-start gap-2 pt-1 border-t border-slate-300/40 text-[11px] text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-gov-600 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Automated Screening Notice:</strong> This application is an automated consumer assistance screening tool and does not issue legal certifications or official regulatory determinations.
            </p>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* Primary Action Buttons */}
        {/* ---------------------------------------------------- */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          {verdict.potentialViolations.length > 0 && (
            <button
              type="button"
              onClick={() =>
                navigate('/report', {
                  state: {
                    extractedLabel,
                    verdict,
                    imageBlob,
                  },
                })
              }
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-900/15 transition active:scale-[0.98]"
            >
              <Flag className="w-5 h-5" />
              <span>Report an Issue</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="flex-1 bg-gov-700 hover:bg-gov-800 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-gov-900/15 transition active:scale-[0.98]"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Scan Another Product</span>
          </button>
        </div>
      </main>

      {/* ---------------------------------------------------- */}
      {/* Expanded Image Modal / Lightbox */}
      {/* ---------------------------------------------------- */}
      {isImageExpanded && imagePreviewUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4">
          <div className="flex justify-between items-center text-white pb-2">
            <span className="text-xs font-semibold text-slate-300">Original Package Photo</span>
            <button
              type="button"
              onClick={() => setIsImageExpanded(false)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <img
              src={imagePreviewUrl}
              alt="Expanded package label"
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setIsImageExpanded(false)}
              className="px-6 py-2.5 bg-slate-800 text-slate-200 text-xs font-bold rounded-xl"
            >
              Close Viewer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
