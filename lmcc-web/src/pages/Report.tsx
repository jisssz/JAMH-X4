import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle2, AlertTriangle, Building, MapPin, FileText, RefreshCw, Copy, Check } from 'lucide-react';
import { ExtractedLabel } from '../models/ExtractedLabel';
import { Verdict } from '../models/Verdict';
import { submitReport, ReportCreatePayload } from '../services/api';
import { saveLocalReport } from '../services/storage/localReports';
import GlowBackground from '../components/ui/GlowBackground';
import SectionLabel from '../components/ui/SectionLabel';

export const Report: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as {
    extractedLabel?: ExtractedLabel;
    verdict?: Verdict;
  } | null;

  const extractedLabel = state?.extractedLabel;
  const verdict = state?.verdict;

  const [productName, setProductName] = useState('');
  const [storeLocation, setStoreLocation] = useState('');
  const [userNotes, setUserNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isSavedLocally, setIsSavedLocally] = useState(false);
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!extractedLabel || !verdict) {
    return (
      <div className="min-h-screen bg-[#05070b] text-white flex flex-col items-center justify-center p-6 text-center selection:bg-emerald-500">
        <GlowBackground variant="subtle" />
        <h2 className="relative z-10 text-2xl font-black text-white mb-2 tracking-tight">No Report Data Available</h2>
        <p className="relative z-10 text-xs text-slate-400 mb-6 font-mono">
          Please complete a scan before submitting a compliance observation.
        </p>
        <button
          type="button"
          onClick={() => navigate('/scan')}
          className="relative z-10 bg-white text-slate-950 hover:bg-slate-100 text-xs font-bold px-6 py-3.5 rounded-full transition cursor-pointer"
        >
          Scan a Product
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      } catch (storageErr) {
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
      <div className="min-h-screen bg-[#05070b] text-white flex flex-col justify-center items-center p-6 selection:bg-emerald-500">
        <GlowBackground variant="subtle" />
        <div className="relative z-10 w-full max-w-md bg-slate-900/90 rounded-[2rem] p-8 border border-white/10 shadow-2xl backdrop-blur-2xl text-center">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border ${
              isSavedLocally
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}
          >
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-black text-white mb-1 tracking-tight">
            {isSavedLocally ? 'Report Saved Locally' : 'Report Recorded'}
          </h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed font-mono">
            {isSavedLocally
              ? 'Report saved on this device and will sync when you are online.'
              : 'Your observation has been registered in the compliance database for inspection and verification.'}
          </p>

          {/* Reference ID card */}
          {submittedReportId && (
            <div className="bg-black/40 p-4 rounded-2xl border border-white/10 mb-6 flex items-center justify-between font-mono">
              <div className="text-left truncate mr-2">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                  {isSavedLocally ? 'Local Reference ID' : 'Report Reference ID'}
                </span>
                <span className="text-xs text-white truncate block font-bold mt-0.5">
                  {submittedReportId}
                </span>
              </div>
              <button
                type="button"
                onClick={copyReportId}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 border border-white/10 text-xs flex items-center gap-1 transition cursor-pointer"
                title="Copy ID"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[10px]">{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}

          <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 text-left text-xs space-y-2 mb-6 font-mono text-slate-400">
            <div>
              <strong className="text-white">Product: </strong> {productName || 'Packaged Commodity'}
            </div>
            <div>
              <strong className="text-white">Screening Verdict: </strong>{' '}
              <span className={`font-bold ${verdict.overallStatus === 'PASS' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {verdict.overallStatus}
              </span>
            </div>
            <div>
              <strong className="text-white">Flagged Issues: </strong> {verdict.potentialViolations.length} item(s)
            </div>
            <div>
              <strong className="text-white">Timestamp: </strong> {new Date().toLocaleString()}
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => navigate('/history')}
              className="w-full py-3.5 bg-white text-slate-950 font-bold rounded-full shadow-[0_0_20px_rgba(255,255,255,0.25)] transition active:scale-[0.98] cursor-pointer"
            >
              View Report History
            </button>
            <button
              type="button"
              onClick={() => navigate('/scan')}
              className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-full transition active:scale-[0.98] cursor-pointer"
            >
              Scan Another Product
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full py-2.5 text-slate-400 hover:text-white font-mono rounded-full transition text-xs cursor-pointer"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070b] text-slate-100 flex flex-col justify-between pb-12 selection:bg-emerald-500 selection:text-black">
      <GlowBackground variant="subtle" />

      {/* Top Floating Header */}
      <header className="sticky top-3 sm:top-5 z-40 max-w-2xl w-full mx-auto px-4">
        <div className="px-4 py-3 rounded-full bg-slate-950/80 border border-white/10 backdrop-blur-2xl shadow-xl flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white text-xs font-mono font-semibold py-1.5 px-3 rounded-full bg-white/5 border border-white/10 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>BACK</span>
          </button>
          <h1 className="text-xs sm:text-sm font-black text-white tracking-wide uppercase">Submit Observation</h1>
          <div className="w-12" />
        </div>
      </header>

      {/* Main Form */}
      <main className="relative z-10 max-w-2xl w-full mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Flagged Summary Box */}
          <div className="bg-amber-950/20 rounded-3xl p-5 sm:p-6 border border-amber-500/30 backdrop-blur-xl">
            <SectionLabel glow className="mb-2">/POTENTIAL ISSUES</SectionLabel>
            <h3 className="text-base font-bold text-amber-300 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Observed Non-Compliance ({verdict.potentialViolations.length})
            </h3>
            <ul className="mt-3 space-y-2 text-xs text-slate-300 font-mono">
              {verdict.potentialViolations.map((v) => (
                <li key={v.ruleId} className="flex items-start gap-2 bg-black/40 p-2.5 rounded-xl border border-white/5">
                  <span className="font-bold text-amber-400">•</span>
                  <span>
                    <strong className="text-white">{v.title}:</strong> {v.explanation}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Form Fields Card */}
          <div className="bg-slate-900/80 rounded-[2rem] p-6 sm:p-7 border border-white/10 shadow-2xl backdrop-blur-2xl space-y-5">
            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-2 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-emerald-400" />
                Product or Brand Name (Optional)
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Parle-G Biscuit 100g or Brand Name"
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-2xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-white/30 font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-2 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Store / Location of Purchase (Optional)
              </label>
              <input
                type="text"
                value={storeLocation}
                onChange={(e) => setStoreLocation(e.target.value)}
                placeholder="e.g. Supermarket, Sector 14, New Delhi"
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-2xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-white/30 font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                Additional Remarks / Observations
              </label>
              <textarea
                rows={3}
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="Detail any additional package defects, smudged dates, or retailer overcharging."
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-2xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-white/30 font-sans"
              />
            </div>
          </div>

          {/* Error Message with Retry */}
          {errorMessage && (
            <div className="p-4 bg-red-950/30 border border-red-500/30 rounded-2xl text-xs text-red-300 space-y-2 font-mono">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>Backend Connection Issue</span>
              </div>
              <p>{errorMessage}</p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold inline-flex items-center gap-1.5 text-xs transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                  <span>Retry Submission</span>
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-white hover:bg-slate-100 disabled:bg-slate-700 text-slate-950 font-bold rounded-full flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(255,255,255,0.3)] transition active:scale-[0.98] cursor-pointer"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2 font-mono text-sm">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Submitting report...
              </span>
            ) : (
              <>
                <Send className="w-5 h-5 text-emerald-600" />
                <span>Submit Compliance Observation</span>
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
};

export default Report;
