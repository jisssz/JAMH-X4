import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle2, AlertTriangle, Building, MapPin, FileText, RefreshCw, Copy, Check } from 'lucide-react';
import { ExtractedLabel } from '../models/ExtractedLabel';
import { Verdict } from '../models/Verdict';
import { submitReport, ReportCreatePayload } from '../services/api';
import { saveLocalReport } from '../services/storage/localReports';

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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-2">No Report Data Available</h2>
        <p className="text-xs text-slate-500 mb-6">
          Please complete a scan before submitting a compliance observation.
        </p>
        <button
          type="button"
          onClick={() => navigate('/scan')}
          className="bg-gov-700 hover:bg-gov-800 text-white text-sm font-semibold px-6 py-3 rounded-xl transition"
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
      // If offline, directly queue report locally in IndexedDB
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        const local = await saveLocalReport(payload);
        setSubmittedReportId(local.localId);
        setIsSavedLocally(true);
        setSubmitSuccess(true);
        return;
      }

      // Try online submission to backend
      const response = await submitReport(payload);
      setSubmittedReportId(response.id);
      setIsSavedLocally(false);
      setSubmitSuccess(true);
    } catch (err: unknown) {
      // Graceful offline fallback: save to IndexedDB so observation is never lost
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
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isSavedLocally ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
            }`}
          >
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-1">
            {isSavedLocally ? 'Report Saved Locally' : 'Report Recorded'}
          </h2>
          <p className="text-xs text-slate-600 mb-5 leading-relaxed">
            {isSavedLocally
              ? 'Report saved on this device and will sync when you are online.'
              : 'Your observation has been registered in the compliance database for inspection and verification.'}
          </p>

          {/* Reference ID card */}
          {submittedReportId && (
            <div className="bg-slate-100 p-3.5 rounded-xl border border-slate-200 mb-5 flex items-center justify-between">
              <div className="text-left truncate mr-2">
                <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
                  {isSavedLocally ? 'Local Queue Reference ID' : 'Report Reference ID'}
                </span>
                <span className="text-xs font-mono font-bold text-gov-800 truncate block">
                  {submittedReportId}
                </span>
              </div>
              <button
                type="button"
                onClick={copyReportId}
                className="p-2 rounded-lg bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs flex items-center gap-1 transition"
                title="Copy ID"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span className="text-[10px] font-semibold">{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}


          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left text-xs space-y-2 mb-6 text-slate-600">
            <div>
              <strong>Product: </strong> {productName || 'Packaged Commodity'}
            </div>
            <div>
              <strong>Screening Verdict: </strong>{' '}
              <span className={`font-bold ${verdict.overallStatus === 'PASS' ? 'text-emerald-600' : 'text-amber-600'}`}>
                {verdict.overallStatus}
              </span>
            </div>
            <div>
              <strong>Flagged Issues: </strong> {verdict.potentialViolations.length} item(s)
            </div>
            <div>
              <strong>Timestamp: </strong> {new Date().toLocaleString()}
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => navigate('/history')}
              className="w-full py-3.5 bg-gov-700 hover:bg-gov-800 text-white font-bold rounded-2xl shadow-lg shadow-gov-900/15 transition active:scale-[0.98]"
            >
              View Report History
            </button>
            <button
              type="button"
              onClick={() => navigate('/scan')}
              className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-2xl shadow-xs transition active:scale-[0.98]"
            >
              Scan Another Product
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-2xl transition text-xs"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between pb-12">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 text-sm font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Results</span>
          </button>
          <h1 className="text-sm font-bold text-slate-800">Submit Observation</h1>
          <div className="w-6" />
        </div>
      </header>

      {/* Main Form */}
      <main className="max-w-2xl w-full mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Flagged Summary Box */}
          <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200">
            <h3 className="text-sm font-bold text-amber-900 mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Observed Non-Compliance ({verdict.potentialViolations.length})
            </h3>
            <ul className="mt-2 space-y-1.5 text-xs text-amber-800">
              {verdict.potentialViolations.map((v) => (
                <li key={v.ruleId} className="flex items-start gap-1.5">
                  <span className="font-bold">•</span>
                  <span>
                    <strong>{v.title}:</strong> {v.explanation}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Form Fields Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-gov-600" />
                Product or Brand Name (Optional)
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Parle-G Biscuit 100g or Brand Name"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gov-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gov-600" />
                Store / Location of Purchase (Optional)
              </label>
              <input
                type="text"
                value={storeLocation}
                onChange={(e) => setStoreLocation(e.target.value)}
                placeholder="e.g. Supermarket, Sector 14, New Delhi"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gov-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-gov-600" />
                Additional Remarks / Observations
              </label>
              <textarea
                rows={3}
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="Detail any additional package defects, smudged dates, or retailer overcharging."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gov-500"
              />
            </div>
          </div>

          {/* Error Message with Retry */}
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>Backend Connection Issue</span>
              </div>
              <p>{errorMessage}</p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold inline-flex items-center gap-1.5 text-xs transition"
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
            className="w-full py-4 bg-gov-700 hover:bg-gov-800 disabled:bg-slate-400 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-gov-900/15 transition active:scale-[0.98]"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Submitting report...
              </span>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Submit Compliance Observation</span>
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
};

