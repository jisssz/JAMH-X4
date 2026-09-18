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
import GlowBackground from '../components/ui/GlowBackground';
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
    <div className="min-h-screen bg-[#05070b] text-slate-100 flex flex-col justify-between pb-12 selection:bg-emerald-500 selection:text-black">
      <GlowBackground variant="subtle" />

      {/* Top Floating Header */}
      <header className="sticky top-3 sm:top-5 z-40 max-w-2xl w-full mx-auto px-4">
        <div className="px-4 py-3 rounded-full bg-slate-950/80 border border-white/10 backdrop-blur-2xl shadow-xl flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white text-xs font-mono font-semibold py-1.5 px-3 rounded-full bg-white/5 border border-white/10 transition cursor-pointer"
            aria-label="Back to History"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>HISTORY</span>
          </button>
          <div className="text-center">
            <h1 className="text-xs sm:text-sm font-black text-white tracking-wide uppercase">Report Details</h1>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:block">Historical Record</span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="flex items-center gap-1.5 text-slate-950 bg-white hover:bg-slate-100 text-xs font-bold py-1.5 px-3 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.3)] transition cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-2xl w-full mx-auto px-4 py-8 flex-1 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center font-mono">
            <div className="w-12 h-12 rounded-2xl bg-white/5 text-emerald-400 flex items-center justify-center mb-4 border border-white/10 shadow-lg">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <h3 className="text-base font-bold text-white uppercase">Loading report...</h3>
            <p className="text-xs text-slate-400 mt-1">Retrieving report details from registry</p>
          </div>
        ) : error || !report ? (
          <div className="bg-slate-900/80 rounded-3xl p-8 border border-red-500/30 text-center max-w-md mx-auto my-8 backdrop-blur-xl">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Report not found</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed font-mono">
              {error || 'The requested screening report could not be found or the service is unavailable.'}
            </p>
            <div className="space-y-2 font-mono">
              <button
                type="button"
                onClick={fetchDetail}
                className="w-full py-3 bg-white text-slate-950 hover:bg-slate-100 text-xs font-bold rounded-full flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/history')}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-full flex items-center justify-center transition border border-white/10 cursor-pointer"
              >
                Back to History
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 1. Historical Disclaimer Banner */}
            <div className="bg-slate-900/80 border border-white/10 p-4 rounded-2xl flex items-start gap-3 text-xs backdrop-blur-xl font-mono text-slate-300">
              <Scale className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold text-white uppercase tracking-wider text-[11px] block mb-0.5">
                  Historical Screening Report
                </span>
                <p className="text-slate-400 text-[11px]">
                  Archived automated screening observation under Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011. This record does not constitute an official legal determination or regulatory certification.
                </p>
              </div>
            </div>

            {/* 2. Verdict Banner Card */}
            <div
              className={`p-6 sm:p-7 rounded-[2rem] border backdrop-blur-2xl shadow-2xl relative overflow-hidden ${
                report.verdict === 'PASS'
                  ? 'bg-gradient-to-b from-slate-900/90 to-emerald-950/40 border-emerald-500/40 shadow-[0_0_40px_-15px_rgba(16,185,129,0.3)]'
                  : 'bg-gradient-to-b from-slate-900/90 to-amber-950/40 border-amber-500/40 shadow-[0_0_40px_-15px_rgba(245,158,11,0.3)]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  {report.verdict === 'PASS' ? (
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <ShieldAlert className="w-6 h-6 text-amber-400" />
                  )}
                  <h2 className="text-xl font-black text-white tracking-tight">
                    SCREENING VERDICT: {report.verdict}
                  </h2>
                </div>
                <span
                  className={`text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${
                    report.verdict === 'PASS'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {report.issueCount === 0 ? 'No Issues Flagged' : `${report.issueCount} Flagged Item(s)`}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans mt-2">
                {report.verdict === 'PASS'
                  ? 'All mandatory packaging declarations (MRP, Net Qty, Dates, Manufacturer & Consumer Care) were identified on the label during this screening.'
                  : `${report.issueCount} statutory declaration(s) required manual verification or were missing from the scanned text per Rule 6.`}
              </p>
            </div>

            {/* 3. Report Metadata & Copyable ID */}
            <div className="bg-slate-900/80 p-6 rounded-[2rem] border border-white/10 shadow-2xl backdrop-blur-xl space-y-4 font-mono">
              {/* Local Pending Notice Badge if unsynced */}
              {localInfo?.isLocal && localInfo?.syncStatus !== 'synced' && (
                <div className="bg-amber-950/30 border border-amber-500/30 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs text-amber-300">
                  <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div>
                    <span className="font-bold block">Saved locally — queued for sync</span>
                    <span className="text-[11px] text-amber-200/80">This observation will sync automatically when online.</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between bg-black/40 p-3.5 rounded-2xl border border-white/10">
                <div className="min-w-0 mr-2">
                  <span className="text-[10px] uppercase text-slate-400 block tracking-wider">
                    {localInfo?.isLocal && localInfo?.syncStatus !== 'synced'
                      ? 'Local Queue Reference ID'
                      : 'Report Reference ID'}
                  </span>
                  <span className="text-xs font-bold text-white truncate block mt-0.5">
                    {localInfo?.serverId || report.id}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition flex-shrink-0 cursor-pointer"
                  aria-label="Copy Report ID"
                  title="Copy Report ID"
                >
                  {copiedId ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300 text-[10px]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="text-[10px]">Copy ID</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Recorded At</span>
                  <span className="font-medium text-white">{formatDate(report.createdAt)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Product Name</span>
                  <span className="font-medium text-white truncate block">
                    {report.productName || 'Unspecified'}
                  </span>
                </div>
              </div>

              {report.userRemarks && (
                <div className="pt-3 border-t border-white/5 text-xs">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                    User Remarks / Location
                  </span>
                  <p className="text-slate-300 bg-black/40 p-3 rounded-xl border border-white/5 italic">
                    "{report.userRemarks}"
                  </p>
                </div>
              )}
            </div>

            {/* 4. Product Declarations Summary Grid */}
            <div className="bg-slate-900/80 p-6 rounded-[2rem] border border-white/10 shadow-2xl backdrop-blur-xl space-y-4">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                  Mandatory Declarations Recorded
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3.5 bg-black/40 rounded-2xl border border-white/5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Maximum Retail Price</span>
                  <span className="font-bold text-white text-sm mt-0.5 block">
                    {report.mrp || <span className="text-slate-500 font-normal italic">Not detected</span>}
                  </span>
                </div>

                <div className="p-3.5 bg-black/40 rounded-2xl border border-white/5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Net Quantity</span>
                  <span className="font-bold text-white text-sm mt-0.5 block">
                    {report.netQuantity || <span className="text-slate-500 font-normal italic">Not detected</span>}
                  </span>
                </div>

                <div className="p-3.5 bg-black/40 rounded-2xl border border-white/5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Mfg / Packing Date</span>
                  <span className="font-bold text-white text-sm mt-0.5 block">
                    {report.dateDeclaration || <span className="text-slate-500 font-normal italic">Not detected</span>}
                  </span>
                </div>

                <div className="p-3.5 bg-black/40 rounded-2xl border border-white/5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Consumer Care Cell</span>
                  <span className="font-medium text-white mt-0.5 block break-words">
                    {report.consumerCare || <span className="text-slate-500 font-normal italic">Not detected</span>}
                  </span>
                </div>

                <div className="p-3.5 bg-black/40 rounded-2xl border border-white/5 sm:col-span-2">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Manufacturer / Packer / Importer</span>
                  <span className="font-medium text-white mt-0.5 block break-words">
                    {report.manufacturer || <span className="text-slate-500 font-normal italic">Not detected</span>}
                  </span>
                </div>
              </div>
            </div>

            {/* 5. Flagged Review Items / Issues */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <SectionLabel glow className="mb-1">/RECORDED ISSUES</SectionLabel>
              </div>

              {report.issues && report.issues.length > 0 ? (
                report.issues.map((issue, idx) => (
                  <div
                    key={`${issue.ruleId}-${idx}`}
                    className="bg-slate-900/80 rounded-3xl p-5 sm:p-6 border border-amber-500/30 shadow-xl backdrop-blur-xl space-y-3 font-mono"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">
                            {issue.ruleId}
                          </span>
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            {issue.severity}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white font-sans">{issue.title}</h4>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed bg-black/40 p-3.5 rounded-xl border border-white/5 font-sans">
                      {issue.explanation}
                    </p>

                    {issue.evidence && (
                      <div className="text-xs space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Recorded Evidence Snippet:
                        </span>
                        <div className="text-[11px] bg-black/60 p-3 rounded-xl border border-white/10 text-amber-200 break-words">
                          {issue.evidence}
                        </div>
                      </div>
                    )}

                    {issue.recommendation && (
                      <div className="text-xs text-slate-300 font-sans">
                        <strong className="text-white">Recommendation: </strong> {issue.recommendation}
                      </div>
                    )}

                    {issue.gazetteReference && (
                      <div className="pt-2 border-t border-white/5 text-[11px] text-emerald-400 flex items-center gap-1.5">
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Statutory Citation: {issue.gazetteReference}</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="bg-emerald-950/20 border border-emerald-500/30 p-5 rounded-3xl text-xs text-emerald-300 flex items-center gap-2.5 font-mono">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>Zero compliance issues were flagged for this package during automated screening.</span>
                </div>
              )}
            </div>

            {/* 6. Raw OCR Text Accordion (Collapsible) */}
            {report.rawOcr && (
              <div className="bg-slate-900/80 rounded-[2rem] border border-white/10 overflow-hidden shadow-xl backdrop-blur-xl">
                <button
                  type="button"
                  onClick={() => setShowRawOcr(!showRawOcr)}
                  className="w-full p-5 flex items-center justify-between text-left hover:bg-white/5 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2 font-mono">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Stored Raw OCR Text
                    </span>
                  </div>
                  {showRawOcr ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {showRawOcr && (
                  <div className="p-5 pt-0 border-t border-white/5 space-y-3 font-mono">
                    <div className="flex justify-between items-center pt-3">
                      <span className="text-[11px] text-slate-400">
                        {report.rawOcr.length} characters recognized
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyOcr}
                        className="px-3 py-1 bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-medium rounded-full flex items-center gap-1.5 transition border border-white/10 cursor-pointer"
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
                    <pre className="text-xs font-mono bg-black/80 text-slate-200 p-4 rounded-2xl overflow-x-auto max-h-60 leading-relaxed whitespace-pre-wrap border border-white/5">
                      {report.rawOcr}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* 7. Action Buttons */}
            <div className="pt-3 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => navigate('/history')}
                className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-slate-200 font-bold rounded-full flex items-center justify-center gap-2 transition border border-white/10 cursor-pointer text-xs font-mono"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>BACK TO HISTORY</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/scan')}
                className="flex-1 py-3.5 bg-white hover:bg-slate-100 text-slate-950 font-bold rounded-full flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.3)] transition active:scale-[0.98] cursor-pointer text-xs font-mono"
              >
                <RotateCcw className="w-4 h-4" />
                <span>SCAN ANOTHER PRODUCT</span>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default ReportDetail;
