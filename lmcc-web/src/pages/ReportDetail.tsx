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
} from 'lucide-react';
import { getReport, ReportRead } from '../services/api';
import { getLocalReport, getLocalReports } from '../services/storage/localReports';

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
        console.warn('Error fetching local report:', e);
      }
    }

    try {
      const data = await getReport(id);
      setReport(data);
      setLocalInfo({ isLocal: false, syncStatus: 'synced', serverId: data.id });
    } catch (err: unknown) {
      // Fallback: check if report exists in local IndexedDB (matching either localId or serverId)
      try {
        const locals = await getLocalReports();
        const matching = locals.find((l) => l.localId === id || l.serverId === id);
        if (matching) {
          setReport({
            id: matching.localId,
            createdAt: matching.createdAt,
            verdict: matching.payload.verdict,
            productName: matching.payload.productName,
            mrp: matching.payload.mrp,
            netQuantity: matching.payload.netQuantity,
            manufacturer: matching.payload.manufacturer,
            dateDeclaration: matching.payload.dateDeclaration,
            consumerCare: matching.payload.consumerCare,
            issueCount: matching.payload.issueCount || (matching.payload.issues ? matching.payload.issues.length : 0),
            issues: matching.payload.issues || [],
            rawOcr: matching.payload.rawOcr,
            userRemarks: matching.payload.userRemarks,
          });
          setLocalInfo({
            isLocal: true,
            syncStatus: matching.syncStatus,
            serverId: matching.serverId || null,
          });
          setLoading(false);
          return;
        }
      } catch {
        // Fallback to reporting server error
      }
      const msg = err instanceof Error ? err.message : 'Report not found.';
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
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between pb-12">
      {/* Top Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 text-sm font-medium"
            aria-label="Back to History"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>History</span>
          </button>
          <div className="text-center">
            <h1 className="text-sm font-bold text-slate-800">Report Details</h1>
            <span className="text-[10px] text-slate-500 font-medium">Historical Screening Record</span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="text-xs font-bold text-gov-700 hover:text-gov-800 py-1.5 px-3 bg-gov-50 hover:bg-gov-100 rounded-lg border border-gov-200 transition"
          >
            Scan
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-2xl w-full mx-auto px-4 py-6 flex-1 space-y-5">
        {loading ? (
          /* Loading State */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gov-50 text-gov-600 flex items-center justify-center mb-4 border border-gov-100 shadow-sm">
              <RefreshCw className="w-6 h-6 animate-spin text-gov-700" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Loading report...</h3>
            <p className="text-xs text-slate-500 mt-1">Retrieving report details from registry</p>
          </div>
        ) : error || !report ? (
          /* Error State */
          <div className="bg-white rounded-3xl p-8 border border-red-200 shadow-sm text-center max-w-md mx-auto my-8">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-100">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Report not found.</h3>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              {error || 'The requested screening report could not be found or the server is unavailable.'}
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={fetchDetail}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/history')}
                className="w-full py-3 bg-gov-700 hover:bg-gov-800 text-white text-xs font-bold rounded-xl flex items-center justify-center transition"
              >
                Back to History
              </button>
            </div>
          </div>
        ) : (
          /* Loaded Report View */
          <>
            {/* 1. Historical Disclaimer Banner */}
            <div className="bg-slate-800 text-slate-200 p-4 rounded-2xl flex items-start gap-3 text-xs shadow-sm">
              <Scale className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold text-white uppercase tracking-wider text-[11px] block mb-0.5">
                  Historical screening report
                </span>
                <p className="text-slate-300 text-[11px]">
                  Archived automated screening observation under Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011. This record does not constitute an official legal determination or regulatory certification.
                </p>
              </div>
            </div>

            {/* 2. Verdict Banner Card */}
            <div
              className={`p-6 rounded-3xl border shadow-sm ${
                report.verdict === 'PASS'
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-amber-50 border-amber-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {report.verdict === 'PASS' ? (
                    <ShieldCheck className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <ShieldAlert className="w-6 h-6 text-amber-600" />
                  )}
                  <h2
                    className={`text-xl font-black ${
                      report.verdict === 'PASS' ? 'text-emerald-900' : 'text-amber-900'
                    }`}
                  >
                    SCREENING VERDICT: {report.verdict}
                  </h2>
                </div>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                    report.verdict === 'PASS'
                      ? 'bg-emerald-200 text-emerald-900'
                      : 'bg-amber-200 text-amber-900'
                  }`}
                >
                  {report.issueCount === 0 ? 'No Issues Flagged' : `${report.issueCount} Flagged Item(s)`}
                </span>
              </div>
              <p
                className={`text-xs leading-relaxed ${
                  report.verdict === 'PASS' ? 'text-emerald-800' : 'text-amber-800'
                }`}
              >
                {report.verdict === 'PASS'
                  ? 'All mandatory packaging declarations (MRP, Net Qty, Dates, Manufacturer & Consumer Care) were identified on the label during this screening.'
                  : `${report.issueCount} statutory declaration(s) required manual verification or were missing from the scanned text per Rule 6.`}
              </p>
            </div>

            {/* 3. Report Metadata & Copyable ID */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              {/* Local Pending Notice Badge if unsynced */}
              {localInfo?.isLocal && localInfo?.syncStatus !== 'synced' && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-center gap-2 text-xs text-amber-800">
                  <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <div>
                    <span className="font-bold block">Saved locally — waiting for connection</span>
                    <span className="text-[11px] text-amber-700">This observation will sync automatically when online.</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div className="min-w-0 mr-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {localInfo?.isLocal && localInfo?.syncStatus !== 'synced'
                      ? 'Local Queue Reference ID'
                      : 'Report Reference ID'}
                  </span>
                  <span className="text-xs font-mono font-bold text-gov-900 truncate block">
                    {localInfo?.serverId || report.id}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition flex-shrink-0"
                  aria-label="Copy Report ID"
                  title="Copy Report ID"
                >
                  {copiedId ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy ID</span>
                    </>
                  )}
                </button>
              </div>

              {localInfo?.serverId && localInfo?.isLocal && (
                <div className="text-[11px] text-slate-500 flex items-center gap-1 px-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Synchronized with server (Server ID: {localInfo.serverId})</span>
                </div>
              )}


              <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 pt-1">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recorded At</span>
                  <span className="font-medium text-slate-800">{formatDate(report.createdAt)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Product Name</span>
                  <span className="font-medium text-slate-800 truncate block">
                    {report.productName || 'Unspecified'}
                  </span>
                </div>
              </div>

              {report.userRemarks && (
                <div className="pt-2 border-t border-slate-100 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    User Remarks / Location
                  </span>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                    "{report.userRemarks}"
                  </p>
                </div>
              )}
            </div>

            {/* 4. Product Declarations Summary Grid */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4 text-gov-600" />
                Mandatory Declarations Recorded
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Maximum Retail Price</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                    {report.mrp || <span className="text-slate-400 font-normal italic">Not detected</span>}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Net Quantity</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                    {report.netQuantity || <span className="text-slate-400 font-normal italic">Not detected</span>}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Mfg / Packing Date</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                    {report.dateDeclaration || <span className="text-slate-400 font-normal italic">Not detected</span>}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Consumer Care Cell</span>
                  <span className="font-medium text-slate-800 mt-0.5 block break-words">
                    {report.consumerCare || <span className="text-slate-400 font-normal italic">Not detected</span>}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 sm:col-span-2">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Manufacturer / Packer / Importer</span>
                  <span className="font-medium text-slate-800 mt-0.5 block break-words">
                    {report.manufacturer || <span className="text-slate-400 font-normal italic">Not detected</span>}
                  </span>
                </div>
              </div>
            </div>

            {/* 5. Flagged Review Items / Issues */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Detailed Review Items ({report.issueCount})
                </h3>
              </div>

              {report.issues && report.issues.length > 0 ? (
                report.issues.map((issue, idx) => (
                  <div
                    key={`${issue.ruleId}-${idx}`}
                    className="bg-white rounded-3xl p-5 border border-amber-200 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {issue.ruleId}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-amber-100 text-amber-800">
                            {issue.severity}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{issue.title}</h4>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed bg-amber-50/70 p-3 rounded-xl border border-amber-100">
                      {issue.explanation}
                    </p>

                    {issue.evidence && (
                      <div className="text-xs space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Recorded Evidence Snippet:
                        </span>
                        <div className="font-mono text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-800 break-words">
                          {issue.evidence}
                        </div>
                      </div>
                    )}

                    {issue.recommendation && (
                      <div className="text-xs text-slate-600">
                        <strong>Recommendation:</strong> {issue.recommendation}
                      </div>
                    )}

                    {issue.gazetteReference && (
                      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1">
                        <ExternalLink className="w-3 h-3 text-gov-600" />
                        <span>
                          <strong>Statutory Citation:</strong> {issue.gazetteReference}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span>Zero compliance issues were flagged for this package during automated screening.</span>
                </div>
              )}
            </div>

            {/* 6. Raw OCR Text Accordion (Collapsible) */}
            {report.rawOcr && (
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowRawOcr(!showRawOcr)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gov-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Stored Raw OCR Text
                    </span>
                  </div>
                  {showRawOcr ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </button>

                {showRawOcr && (
                  <div className="p-4 pt-0 border-t border-slate-100 space-y-3">
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-[11px] text-slate-500">
                        {report.rawOcr.length} characters recognized
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyOcr}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1 transition"
                      >
                        {copiedOcr ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Raw Text</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="text-[11px] font-mono bg-slate-900 text-slate-100 p-4 rounded-2xl overflow-x-auto max-h-60 leading-relaxed whitespace-pre-wrap">
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
                className="flex-1 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-2xl flex items-center justify-center gap-2 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to History</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/scan')}
                className="flex-1 py-3.5 bg-gov-700 hover:bg-gov-800 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-gov-900/15 transition active:scale-[0.98]"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Scan Another Product</span>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
