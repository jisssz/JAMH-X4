import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  AlertTriangle,
  Building2,
  MapPin,
  FileText,
  RefreshCw,
  Copy,
  Check,
  CheckSquare,
  Square,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { ExtractedLabel } from '../models/ExtractedLabel';
import { Verdict } from '../models/Verdict';
import { submitReport, ReportCreatePayload } from '../services/api';
import { saveLocalReport } from '../services/storage/localReports';
import SectionLabel from '../components/ui/SectionLabel';

export const Report: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as {
    extractedLabel?: ExtractedLabel;
    verdict?: Verdict;
    isPassConcern?: boolean;
  } | null;

  const extractedLabel = state?.extractedLabel;
  const verdict = state?.verdict;
  const isPassConcern = state?.isPassConcern ?? (verdict?.overallStatus === 'PASS');

  const [productName, setProductName] = useState('');
  const [storeLocation, setStoreLocation] = useState('');
  const [userNotes, setUserNotes] = useState('');
  const [confirmedVoluntary, setConfirmedVoluntary] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isSavedLocally, setIsSavedLocally] = useState(false);
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!extractedLabel || !verdict) {
    return (
      <div className="min-h-screen bg-[#06080e] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-8 rounded-2xl bg-[#090d16] border border-white/[0.08] shadow-2xl">
          <h2 className="font-display text-2xl text-white mb-2 font-normal">
            No report data <span className="font-serif italic text-slate-400">available.</span>
          </h2>
          <p className="text-xs text-slate-400 mb-6 font-sans leading-relaxed">
            Please complete a package scan before submitting a compliance observation.
          </p>
          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="w-full bg-white text-slate-950 hover:bg-slate-100 text-xs font-medium px-6 py-3 rounded-full transition cursor-pointer"
          >
            Start Package Scan
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmedVoluntary) {
      setErrorMessage('Please confirm voluntary submission of this observation before proceeding.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const remarksParts = [];
    if (storeLocation.trim()) {
      remarksParts.push(`Store Location: ${storeLocation.trim()}`);
    }
    if (userNotes.trim()) {
      remarksParts.push(userNotes.trim());
    }

    const payload: ReportCreatePayload = {
      verdict: verdict.overallStatus,
      productName: productName.trim() || undefined,
      mrp: extractedLabel.mrp,
      netQuantity: extractedLabel.netQuantity,
      manufacturer: extractedLabel.manufacturer,
      dateDeclaration: extractedLabel.manufactureDate || extractedLabel.packingDate,
      consumerCare: extractedLabel.consumerCare,
      issueCount: verdict.potentialViolations.length,
      issues: verdict.potentialViolations.map((v) => ({
        ruleId: v.ruleId,
        field: v.field,
        title: v.title,
        severity: v.severity,
        detectedValue: v.detectedValue,
        explanation: v.explanation,
        evidence: v.evidence,
        recommendation: v.recommendation,
        source: v.source,
        gazetteReference: v.gazetteReference,
      })),
      rawOcr: extractedLabel.rawText || undefined,
      userRemarks: remarksParts.length > 0 ? remarksParts.join(' | ') : undefined,
    };

    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        const local = await saveLocalReport(payload);
        setSubmittedReportId(local.localId);
        setIsSavedLocally(true);
        setSubmitSuccess(true);
        return;
      }

      const response = await submitReport(payload);
      setSubmittedReportId(response.id);
      setIsSavedLocally(false);
      setSubmitSuccess(true);
    } catch (err: unknown) {
      try {
        const local = await saveLocalReport(payload);
        setSubmittedReportId(local.localId);
        setIsSavedLocally(true);
        setSubmitSuccess(true);
      } catch {
        const msg = err instanceof Error ? err.message : 'Reporting backend service is unreachable';
        setErrorMessage(`${msg}. Scanned label details and entered notes are preserved.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyReportId = () => {
    if (submittedReportId) {
      navigator.clipboard.writeText(submittedReportId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-[#06080e] text-white flex flex-col justify-center items-center p-6">
        <div className="w-full max-w-md bg-[#090d16] rounded-2xl p-8 border border-white/[0.08] shadow-2xl text-left">
          <div className="flex items-center gap-3 mb-5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                isSavedLocally
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl text-white font-normal">
                {isSavedLocally ? 'Observation saved locally.' : 'Observation recorded.'}
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                {isSavedLocally
                  ? 'Queued on device for background synchronization.'
                  : 'Registered in compliance registry for verification.'}
              </p>
            </div>
          </div>

          {/* Reference ID card */}
          {submittedReportId && (
            <div className="bg-black/30 p-4 rounded-xl border border-white/[0.06] mb-5 flex items-center justify-between font-mono">
              <div className="text-left truncate mr-2">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                  {isSavedLocally ? 'Local Queue ID' : 'Server Reference ID'}
                </span>
                <span className="text-xs text-white truncate block font-medium mt-0.5">
                  {submittedReportId}
                </span>
              </div>
              <button
                type="button"
                onClick={copyReportId}
                className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 border border-white/[0.08] text-xs flex items-center gap-1.5 transition cursor-pointer"
                title="Copy ID"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[11px] font-sans">{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}

          <div className="bg-black/20 p-4 rounded-xl border border-white/[0.06] text-xs space-y-2 mb-6 font-sans text-slate-400 divide-y divide-white/[0.04]">
            <div className="flex justify-between items-center pb-2">
              <span>Product</span>
              <span className="text-white font-medium">{productName || 'Packaged Commodity'}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span>Screening Verdict</span>
              <span className={`font-medium ${verdict.overallStatus === 'PASS' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {verdict.overallStatus}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span>Flagged Items</span>
              <span className="text-white font-medium">{verdict.potentialViolations.length} issue(s)</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span>Timestamp</span>
              <span className="text-slate-300 font-mono text-[11px]">{new Date().toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => navigate('/history')}
              className="w-full py-3 bg-white text-slate-950 font-medium text-xs rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              View Report History
            </button>
            <button
              type="button"
              onClick={() => navigate('/scan')}
              className="w-full py-3 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white font-medium text-xs rounded-full transition cursor-pointer"
            >
              Scan Another Package
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full py-2.5 text-slate-400 hover:text-white font-sans text-xs transition cursor-pointer text-center block"
            >
              Return to Overview
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06080e] text-slate-100 flex flex-col justify-between pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#06080e]/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-sans font-medium py-1.5 px-3 rounded-full bg-white/[0.04] border border-white/[0.08] transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
          <span className="text-xs font-medium text-slate-400 tracking-wide">
            {isPassConcern ? 'Record Physical Concern' : 'Submit Compliance Filing'}
          </span>
          <div className="w-12" />
        </div>
      </header>

      {/* Main Form */}
      <main className="max-w-2xl w-full mx-auto px-4 py-8">
        <div className="mb-6">
          <SectionLabel className="mb-2">Statutory Filing</SectionLabel>
          <h1 className="font-display text-2xl sm:text-3xl text-white font-normal tracking-tight">
            Record an <span className="font-serif italic text-slate-300">observation.</span>
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-1 leading-relaxed">
            Voluntary consumer observation assisting statutory market surveillance under Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Summary Box: REVIEW issues vs PASS concern */}
          {verdict.potentialViolations.length > 0 ? (
            <div className="bg-[#090d16] rounded-2xl p-5 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-2 text-amber-400">
                <ShieldAlert className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider font-mono">
                  {verdict.potentialViolations.length} Flagged Declaration Item(s)
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans mb-3 leading-relaxed">
                The automated scanner flagged the following statutory declaration discrepancies. These will be appended to your filing.
              </p>
              <div className="space-y-2">
                {verdict.potentialViolations.map((v) => (
                  <div key={v.ruleId} className="bg-black/30 p-3 rounded-xl border border-white/[0.04] text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] text-amber-300 font-medium px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                        {v.ruleId}
                      </span>
                      <span className="text-white font-medium">{v.title}</span>
                    </div>
                    <p className="text-slate-400 font-sans text-[11px] leading-relaxed">
                      {v.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-[#090d16] rounded-2xl p-5 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider font-mono">
                  Automated Screening: PASS
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Mandatory declarations were detected by OCR. If you observed physical defects (e.g., dual stickers, obscured prices, smudged batch codes, or missing contact channels), detail them below.
              </p>
            </div>
          )}

          {/* Form Fields Card */}
          <div className="bg-[#090d16] rounded-2xl p-6 border border-white/[0.08] shadow-sm space-y-5">
            <div>
              <label className="block text-xs font-sans font-medium text-slate-300 mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                Product or Brand Name (Optional)
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Parle-G Biscuit 100g or Brand Name"
                className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.08] focus:border-white/25 rounded-xl text-xs text-white placeholder:text-slate-600 font-sans outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-sans font-medium text-slate-300 mb-2 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Store / Retailer Location (Optional)
              </label>
              <input
                type="text"
                value={storeLocation}
                onChange={(e) => setStoreLocation(e.target.value)}
                placeholder="e.g. Supermarket, Sector 14, New Delhi"
                className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.08] focus:border-white/25 rounded-xl text-xs text-white placeholder:text-slate-600 font-sans outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-sans font-medium text-slate-300 mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                {isPassConcern ? 'Observed Physical Concern' : 'Additional Remarks / Context'}
              </label>
              <textarea
                rows={3}
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder={
                  isPassConcern
                    ? 'Describe what you noticed on the package (e.g. sticker price higher than printed MRP, smudged batch code, missing customer care email).'
                    : 'Detail any additional package defects, smudged dates, or retailer overcharging.'
                }
                className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.08] focus:border-white/25 rounded-xl text-xs text-white placeholder:text-slate-600 font-sans outline-none transition"
              />
            </div>

            {/* Voluntary Confirmation Checkbox */}
            <div className="pt-3 border-t border-white/[0.06]">
              <label
                onClick={() => setConfirmedVoluntary(!confirmedVoluntary)}
                className="flex items-start gap-3 cursor-pointer text-xs font-sans text-slate-300 select-none"
              >
                <div className="mt-0.5 text-emerald-400 flex-shrink-0">
                  {confirmedVoluntary ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-600" />
                  )}
                </div>
                <span className="text-[11px] leading-relaxed text-slate-400">
                  I confirm voluntary submission of this packaging observation for consumer compliance monitoring. No personal data or full-resolution photos are transmitted.
                </span>
              </label>
            </div>
          </div>

          {/* Error Message with Retry */}
          {errorMessage && (
            <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-xl text-xs text-red-300 space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>Submission Notice</span>
              </div>
              <p className="text-[11px] leading-relaxed text-red-200/80">{errorMessage}</p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-full font-medium inline-flex items-center gap-1.5 text-xs transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                  <span>Retry Submission</span>
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !confirmedVoluntary}
            className="w-full py-3.5 bg-white hover:bg-slate-100 disabled:bg-white/[0.08] disabled:text-slate-600 text-slate-950 font-medium rounded-full flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer text-xs"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2 font-sans text-xs">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Recording observation...
              </span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 text-slate-900" />
                <span>Confirm & Submit Observation</span>
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
};

export default Report;
