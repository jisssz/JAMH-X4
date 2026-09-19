import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Package,
  FileText,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  Clock,
  Camera,
} from 'lucide-react';
import { getReport, ReportRead } from '../services/api';
import { getLocalReport } from '../services/storage/localReports';
import { getAuthoritySubmissionStatus } from '../services/authority/authoritySubmissionService';
import { registerSyncListener } from '../services/sync/reportSync';
import SectionLabel from '../components/ui/SectionLabel';

export const ReportDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<ReportRead | null>(null);
  const [localInfo, setLocalInfo] = useState<{
    isLocal: boolean;
    syncStatus: 'pending' | 'synced' | 'failed';
    serverId: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [showRawOcr, setShowRawOcr] = useState(false);
  const [copiedOcr, setCopiedOcr] = useState(false);

  const authorityStatus = getAuthoritySubmissionStatus(id || '');

  const fetchDetail = async () => {
    if (!id) {
      setError('Report ID is missing.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    // If ID is a local identifier, check IndexedDB first
    if (id.startsWith('local_')) {
      try {
        const local = await getLocalReport(id);
        if (local) {
          setReport({
            id: local.localId,
            createdAt: local.createdAt,
            verdict: local.payload.verdict,
            productName: local.payload.productName,
            mrp: local.payload.mrp,
            netQuantity: local.payload.netQuantity,
            manufacturer: local.payload.manufacturer,
            dateDeclaration: local.payload.dateDeclaration,
            consumerCare: local.payload.consumerCare,
            issueCount: local.payload.issueCount || (local.payload.issues ? local.payload.issues.length : 0),
            issues: local.payload.issues || [],
            rawOcr: local.payload.rawOcr,
            userRemarks: local.payload.userRemarks,
          });
          setLocalInfo({
            isLocal: true,
            syncStatus: local.syncStatus,
            serverId: local.serverId || null,
          });
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Failed to read local report details:', e);
      }
    }

    try {
      const data = await getReport(id);
      setReport(data);
      setLocalInfo({
        isLocal: false,
        syncStatus: 'synced',
        serverId: data.id,
      });
    } catch (err: unknown) {
      try {
        const local = await getLocalReport(id);
        if (local) {
          setReport({
            id: local.localId,
            createdAt: local.createdAt,
            verdict: local.payload.verdict,
            productName: local.payload.productName,
            mrp: local.payload.mrp,
            netQuantity: local.payload.netQuantity,
            manufacturer: local.payload.manufacturer,
            dateDeclaration: local.payload.dateDeclaration,
            consumerCare: local.payload.consumerCare,
            issueCount: local.payload.issueCount || (local.payload.issues ? local.payload.issues.length : 0),
            issues: local.payload.issues || [],
            rawOcr: local.payload.rawOcr,
            userRemarks: local.payload.userRemarks,
          });
          setLocalInfo({
            isLocal: true,
            syncStatus: local.syncStatus,
            serverId: local.serverId || null,
          });
          setLoading(false);
          return;
        }
      } catch {
        // continue to error handler
      }

      const msg = err instanceof Error ? err.message : 'Unable to load report.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();

    const unsubscribe = registerSyncListener((isSyncing) => {
      if (!isSyncing) {
        fetchDetail();
      }
    });

    const handleFocus = () => {
      fetchDetail();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [id]);

  const handleCopyId = () => {
    if (id) {
      navigator.clipboard.writeText(id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleCopyOcr = () => {
    if (report?.rawOcr) {
      navigator.clipboard.writeText(report.rawOcr);
      setCopiedOcr(true);
      setTimeout(() => setCopiedOcr(false), 2000);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-[#06080e] text-slate-100 flex flex-col justify-between pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#06080e]/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-sans font-medium py-1.5 px-3 rounded-full bg-white/[0.04] border border-white/[0.08] transition cursor-pointer"
            aria-label="Back to History"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>History</span>
          </button>
          <div className="text-center">
            <span className="text-xs font-medium text-slate-400">Historical Screening Record</span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="flex items-center gap-1.5 text-slate-950 bg-white hover:bg-slate-100 text-xs font-medium py-1.5 px-3 rounded-full transition cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-2xl w-full mx-auto px-4 py-8 flex-1 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] text-slate-300 flex items-center justify-center mb-4 border border-white/[0.08]">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
            <h3 className="text-sm font-medium text-white">Loading report...</h3>
            <p className="text-xs text-slate-400 mt-1">Retrieving screening record from registry</p>
          </div>
        ) : error || !report ? (
          <div className="bg-[#090d16] rounded-2xl p-8 border border-red-500/20 text-center max-w-md mx-auto my-8">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-medium text-white mb-1">Report not found</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              {error || 'The requested screening report could not be found or the service is unreachable.'}
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={fetchDetail}
                className="w-full py-2.5 bg-white text-slate-950 hover:bg-slate-100 text-xs font-medium rounded-full flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/history')}
                className="w-full py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium rounded-full flex items-center justify-center transition border border-white/[0.08] cursor-pointer"
              >
                Back to History
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 1. Historical Disclaimer Banner */}
            <div className="bg-[#090d16] border border-white/[0.08] p-4 rounded-xl flex items-start gap-3 text-xs text-slate-400">
              <Scale className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-medium text-slate-300 text-[11px] block mb-0.5">
                  Statutory Screening Observation (Rule 6)
                </span>
                <p className="text-[11px] text-slate-400">
                  Archived automated screening observation under Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011. This record is advisory and does not constitute an official regulatory order.
                </p>
              </div>
            </div>

            {/* 2. Verdict Document Banner */}
            <div className="bg-[#090d16] rounded-2xl p-6 border border-white/[0.08] relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-mono font-medium px-2.5 py-1 rounded-full border ${
                      report.verdict === 'PASS'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {report.verdict === 'PASS' ? (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5" />
                    )}
                    <span>{report.verdict}</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {report.issueCount === 0 ? '0 issues' : `${report.issueCount} issue(s) flagged`}
                  </span>
                </div>
              </div>

              <h2 className="font-display text-2xl sm:text-3xl text-white font-normal tracking-tight mt-3">
                Screening result:{' '}
                <span className="font-serif italic text-slate-300">
                  {report.verdict === 'PASS' ? 'Compliant.' : 'Advisory Review.'}
                </span>
              </h2>

              <p className="text-xs text-slate-400 leading-relaxed font-sans mt-2">
                {report.verdict === 'PASS'
                  ? 'All mandatory packaging declarations (MRP, Net Qty, Dates, Manufacturer & Consumer Care) were identified on the scanned package.'
                  : `${report.issueCount} statutory declaration(s) required manual verification or were missing from the scanned text per Rule 6.`}
              </p>
            </div>

            {/* 3. Report Metadata & Copyable ID */}
            <div className="bg-[#090d16] p-5 rounded-2xl border border-white/[0.08] space-y-3">
              {/* Local Pending Notice Badge if unsynced */}
              {localInfo?.isLocal && localInfo?.syncStatus !== 'synced' && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-center gap-2 text-xs text-amber-300">
                  <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div>
                    <span className="font-medium block">Saved locally — queued for sync</span>
                    <span className="text-[11px] text-amber-200/80">This observation will sync automatically when connectivity is restored.</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between bg-black/30 p-3 rounded-xl border border-white/[0.06]">
                <div className="min-w-0 mr-2">
                  <span className="text-[10px] uppercase text-slate-500 block font-mono">
                    {localInfo?.isLocal && localInfo?.syncStatus !== 'synced'
                      ? 'Local Queue ID'
                      : 'Report Reference ID'}
                  </span>
                  <span className="text-xs font-mono font-medium text-white truncate block mt-0.5">
                    {localInfo?.serverId || report.id}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="px-2.5 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 border border-white/[0.08] rounded-lg text-xs font-medium flex items-center gap-1.5 transition flex-shrink-0 cursor-pointer"
                  aria-label="Copy Report ID"
                  title="Copy Report ID"
                >
                  {copiedId ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300 text-[11px] font-sans">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-sans">Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs pt-1 divide-x divide-white/[0.04]">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-mono">Recorded At</span>
                  <span className="text-slate-300 font-sans mt-0.5 block">{formatDate(report.createdAt)}</span>
                </div>
                <div className="pl-4">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-mono">Product Name</span>
                  <span className="text-white font-sans mt-0.5 truncate block font-medium">
                    {report.productName || 'Packaged Commodity'}
                  </span>
                </div>
              </div>

              {report.userRemarks && (
                <div className="pt-3 border-t border-white/[0.06] text-xs">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-mono mb-1">
                    User Remarks / Location
                  </span>
                  <p className="text-slate-300 bg-black/30 p-3 rounded-xl border border-white/[0.04] text-[11px] italic font-sans leading-relaxed">
                    "{report.userRemarks}"
                  </p>
                </div>
              )}
            </div>

            {/* 3b. Transparent 4-Stage Lifecycle Timeline */}
            <div className="bg-[#090d16] p-5 rounded-2xl border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300 tracking-wide font-sans">
                  Observation Lifecycle
                </span>
                <button
                  type="button"
                  onClick={fetchDetail}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition font-sans"
                  title="Refresh Status"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="space-y-3 pt-1">
                {/* Stage 1: Screened */}
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-white">1. Screened on Device</span>
                      <span className="text-[10px] text-emerald-400 font-mono">Completed</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Client-side OCR and Rule 6 compliance assessment executed on device.
                    </p>
                  </div>
                </div>

                {/* Stage 2: Saved Locally */}
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-white">2. Persisted in Local Storage</span>
                      <span className="text-[10px] text-emerald-400 font-mono">Completed</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Observation record stored safely in browser IndexedDB.
                    </p>
                  </div>
                </div>

                {/* Stage 3: Submitted to JAMH X4 */}
                <div className="flex items-start gap-3">
                  {localInfo?.isLocal && localInfo?.syncStatus !== 'synced' ? (
                    <div className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Clock className="w-3 h-3" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-white">3. Compliance Registry</span>
                      {localInfo?.isLocal && localInfo?.syncStatus !== 'synced' ? (
                        <span className="text-[10px] text-amber-400 font-mono">Queued</span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-mono">Synchronized</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {localInfo?.isLocal && localInfo?.syncStatus !== 'synced'
                        ? 'Waiting for network connection to synchronize with the backend registry.'
                        : `Persisted in central database. Registry ID: ${localInfo?.serverId || report.id}`}
                    </p>
                  </div>
                </div>

                {/* Stage 4: Official Department Submission */}
                <div className="flex items-start gap-3 opacity-60">
                  <div className="w-5 h-5 rounded-full bg-white/[0.04] text-slate-500 border border-white/[0.08] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="w-1 h-1 rounded-full bg-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-400">4. Official Department Channel</span>
                      <span className="text-[10px] text-slate-500 font-mono">Pending Integration</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      {authorityStatus.message}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Product Declarations Summary */}
            <div className="bg-[#090d16] rounded-2xl p-6 border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-medium text-white tracking-wide">
                    Mandatory Declarations Recorded
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">Rule 6 Checklist</span>
              </div>

              <div className="divide-y divide-white/[0.06] text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-400">Maximum Retail Price</span>
                  <span className="font-mono text-white font-medium">
                    {report.mrp || <span className="text-slate-600 font-normal italic">Not detected</span>}
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-400">Net Quantity</span>
                  <span className="font-mono text-white font-medium">
                    {report.netQuantity || <span className="text-slate-600 font-normal italic">Not detected</span>}
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-400">Mfg / Packing Date</span>
                  <span className="font-mono text-white font-medium">
                    {report.dateDeclaration || <span className="text-slate-600 font-normal italic">Not detected</span>}
                  </span>
                </div>

                <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-slate-400">Consumer Care</span>
                  <span className="font-mono text-white font-medium text-right break-words max-w-xs">
                    {report.consumerCare || <span className="text-slate-600 font-normal italic">Not detected</span>}
                  </span>
                </div>

                <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-slate-400">Manufacturer / Packer</span>
                  <span className="font-mono text-white font-medium text-right break-words max-w-xs">
                    {report.manufacturer || <span className="text-slate-600 font-normal italic">Not detected</span>}
                  </span>
                </div>
              </div>
            </div>

            {/* 5. Flagged Review Items / Issues */}
            <div className="space-y-3">
              <SectionLabel className="px-1">Compliance Observations</SectionLabel>

              {report.issues && report.issues.length > 0 ? (
                report.issues.map((issue, idx) => (
                  <div
                    key={`${issue.ruleId}-${idx}`}
                    className="bg-[#090d16] rounded-2xl p-5 border border-amber-500/20 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          {issue.ruleId}
                        </span>
                        <h4 className="text-xs font-medium text-white">{issue.title}</h4>
                      </div>
                      <span className="text-[10px] font-mono uppercase text-slate-500">
                        {issue.severity}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                      {issue.explanation}
                    </p>

                    {issue.evidence && (
                      <div className="text-xs space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase font-mono block">
                          Recorded Evidence Snippet:
                        </span>
                        <div className="text-[11px] font-mono bg-black/30 p-2.5 rounded-xl border border-white/[0.04] text-amber-200/90 break-words">
                          {issue.evidence}
                        </div>
                      </div>
                    )}

                    {issue.recommendation && (
                      <div className="text-xs text-slate-400 font-sans">
                        <span className="text-slate-300 font-medium">Recommendation: </span> {issue.recommendation}
                      </div>
                    )}

                    {issue.gazetteReference && (
                      <div className="pt-2 border-t border-white/[0.04] text-[11px] text-slate-500 flex items-center gap-1.5 font-mono">
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                        <span>Citation: {issue.gazetteReference}</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="bg-[#090d16] border border-emerald-500/20 p-4 rounded-xl text-xs text-emerald-400 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Zero compliance issues were flagged during this screening.</span>
                </div>
              )}
            </div>

            {/* 6. Raw OCR Text Accordion */}
            {report.rawOcr && (
              <div className="bg-[#090d16] rounded-2xl border border-white/[0.08] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowRawOcr(!showRawOcr)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-medium text-slate-300">
                      Recognized Raw OCR Text
                    </span>
                  </div>
                  {showRawOcr ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {showRawOcr && (
                  <div className="p-4 pt-0 border-t border-white/[0.06] space-y-3 font-mono">
                    <div className="flex justify-between items-center pt-3">
                      <span className="text-[11px] text-slate-500">
                        {report.rawOcr.length} characters recognized
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyOcr}
                        className="px-2.5 py-1 bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 text-xs font-medium rounded-lg flex items-center gap-1.5 transition border border-white/[0.08] cursor-pointer"
                      >
                        {copiedOcr ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-300 text-[10px]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[10px]">Copy Text</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="text-xs font-mono bg-black/40 text-slate-300 p-3 rounded-xl overflow-x-auto max-h-60 leading-relaxed whitespace-pre-wrap border border-white/[0.04]">
                      {report.rawOcr}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* 7. Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => navigate('/history')}
                className="flex-1 py-3 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-medium rounded-full flex items-center justify-center gap-2 transition border border-white/[0.08] cursor-pointer text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to History</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/scan')}
                className="flex-1 py-3 bg-white hover:bg-slate-100 text-slate-950 font-medium rounded-full flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Scan Another Package</span>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default ReportDetail;
