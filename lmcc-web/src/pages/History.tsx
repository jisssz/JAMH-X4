import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  FileText,
  ChevronRight,
  Copy,
  Check,
  PlusCircle,
  Clock,
  ShieldAlert,
  ShieldCheck,
  WifiOff,
  CloudUpload,
  CheckCheck,
} from 'lucide-react';
import { getReports } from '../services/api';
import { getLocalReports, LocalReport } from '../services/storage/localReports';

interface HistoryItem {
  id: string; // server ID or localId
  origin: 'server' | 'local_pending' | 'local_synced';
  createdAt: string;
  verdict: 'PASS' | 'REVIEW';
  productName?: string;
  mrp?: string;
  netQuantity?: string;
  dateDeclaration?: string;
  issueCount: number;
  serverId?: string | null;
  lastError?: string | null;
}

export const History: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOfflineView, setIsOfflineView] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    setIsOfflineView(false);

    let localList: LocalReport[] = [];
    try {
      localList = await getLocalReports();
    } catch (e) {
      console.warn('Failed to read local reports:', e);
    }

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (!isOnline) {
      // Offline mode: show local IndexedDB reports
      setIsOfflineView(true);
      const mappedLocal: HistoryItem[] = localList.map((r) => ({
        id: r.localId,
        origin: r.syncStatus === 'synced' ? 'local_synced' : 'local_pending',
        createdAt: r.createdAt,
        verdict: r.payload.verdict,
        productName: r.payload.productName,
        mrp: r.payload.mrp,
        netQuantity: r.payload.netQuantity,
        dateDeclaration: r.payload.dateDeclaration,
        issueCount: r.payload.issueCount || (r.payload.issues ? r.payload.issues.length : 0),
        serverId: r.serverId,
        lastError: r.lastError,
      }));
      setItems(mappedLocal);
      setLoading(false);
      return;
    }

    try {
      const serverReports = await getReports(50);
      const serverIds = new Set(serverReports.map((s) => s.id));

      // Separate local pending reports that haven't been synced or confirmed by server
      const pendingLocal: HistoryItem[] = localList
        .filter((l) => l.syncStatus === 'pending' || (l.serverId && !serverIds.has(l.serverId)))
        .map((r) => ({
          id: r.localId,
          origin: 'local_pending',
          createdAt: r.createdAt,
          verdict: r.payload.verdict,
          productName: r.payload.productName,
          mrp: r.payload.mrp,
          netQuantity: r.payload.netQuantity,
          dateDeclaration: r.payload.dateDeclaration,
          issueCount: r.payload.issueCount || (r.payload.issues ? r.payload.issues.length : 0),
          serverId: r.serverId,
          lastError: r.lastError,
        }));

      const mappedServer: HistoryItem[] = serverReports.map((s) => ({
        id: s.id,
        origin: 'server',
        createdAt: s.createdAt,
        verdict: s.verdict as 'PASS' | 'REVIEW',
        productName: s.productName,
        mrp: s.mrp,
        netQuantity: s.netQuantity,
        dateDeclaration: s.dateDeclaration,
        issueCount: s.issueCount,
        serverId: s.id,
      }));

      // Combine with pending local reports at the very top
      setItems([...pendingLocal, ...mappedServer]);
    } catch (err: unknown) {
      // Backend request failed; fall back to local IndexedDB reports
      setIsOfflineView(true);
      if (localList.length > 0) {
        const mappedLocal: HistoryItem[] = localList.map((r) => ({
          id: r.localId,
          origin: r.syncStatus === 'synced' ? 'local_synced' : 'local_pending',
          createdAt: r.createdAt,
          verdict: r.payload.verdict,
          productName: r.payload.productName,
          mrp: r.payload.mrp,
          netQuantity: r.payload.netQuantity,
          dateDeclaration: r.payload.dateDeclaration,
          issueCount: r.payload.issueCount || (r.payload.issues ? r.payload.issues.length : 0),
          serverId: r.serverId,
          lastError: r.lastError,
        }));
        setItems(mappedLocal);
      } else {
        const msg = err instanceof Error ? err.message : 'Unable to load report history.';
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 text-sm font-medium"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Home</span>
          </button>
          <div className="text-center">
            <h1 className="text-sm font-bold text-slate-800">Report History</h1>
            <span className="text-[10px] text-slate-500 font-medium">Archived Compliance Screenings</span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="flex items-center gap-1 text-gov-700 hover:text-gov-800 text-xs font-bold py-1.5 px-3 bg-gov-50 hover:bg-gov-100 rounded-lg border border-gov-200 transition"
            aria-label="Scan New Product"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Scan</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-2xl w-full mx-auto px-4 py-6 flex-1">
        {loading ? (
          /* Loading State */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gov-50 text-gov-600 flex items-center justify-center mb-4 border border-gov-100 shadow-sm">
              <RefreshCw className="w-6 h-6 animate-spin text-gov-700" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Loading reports...</h3>
            <p className="text-xs text-slate-500 mt-1">Retrieving screening observations from registry</p>
          </div>
        ) : error ? (
          /* Error State */
          <div className="bg-white rounded-3xl p-8 border border-red-200 shadow-sm text-center max-w-md mx-auto my-8">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-100">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Unable to load report history.</h3>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              {error} Check your connection or verify that the backend service is running.
            </p>
            <button
              type="button"
              onClick={fetchHistory}
              className="w-full py-3 bg-gov-700 hover:bg-gov-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
          </div>
        ) : items.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center max-w-md mx-auto my-8">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No reports yet</h3>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Scan a packaged product and submit a report to see it here.
            </p>
            <button
              type="button"
              onClick={() => navigate('/scan')}
              className="w-full py-3.5 bg-gov-700 hover:bg-gov-800 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-gov-900/15 transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Scan Product</span>
            </button>
          </div>
        ) : (
          /* Report List Cards */
          <div className="space-y-3.5">
            {isOfflineView && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-center gap-2 text-xs text-amber-800">
                <WifiOff className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Offline mode — viewing reports stored on this device.</span>
              </div>
            )}

            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Recent Submissions ({items.length})
              </span>
              <button
                type="button"
                onClick={fetchHistory}
                className="text-[11px] font-semibold text-gov-700 hover:text-gov-800 flex items-center gap-1"
                title="Refresh history"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            {items.map((report) => {
              const isPass = report.verdict === 'PASS';
              const hasIssues = report.issueCount > 0;

              return (
                <div
                  key={report.id}
                  onClick={() => navigate(`/history/${report.id}`)}
                  className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-gov-400 rounded-2xl p-4 shadow-sm transition cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: Verdict badge & product info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        {/* 1. Screening Verdict Badge */}
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            isPass
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isPass ? (
                            <>
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              PASS
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="w-3 h-3 text-amber-600" />
                              REVIEW
                            </>
                          )}
                        </span>

                        {/* 2. Sync / Storage Origin Badge */}
                        {report.origin === 'local_pending' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Pending sync
                          </span>
                        )}
                        {report.origin === 'local_synced' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-300">
                            <CheckCheck className="w-3 h-3 text-blue-600" />
                            Synced
                          </span>
                        )}
                        {report.origin === 'server' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                            <CloudUpload className="w-3 h-3 text-gov-600" />
                            Server report
                          </span>
                        )}

                        <span className="text-[11px] text-slate-500 flex items-center gap-1 ml-auto">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatDate(report.createdAt)}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {report.productName || 'General Packaged Commodity'}
                      </h3>

                      {/* Product Declarations Snippet */}
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                        {report.mrp && (
                          <span>
                            <strong>MRP:</strong> {report.mrp}
                          </span>
                        )}
                        {report.netQuantity && (
                          <span>
                            <strong>Net:</strong> {report.netQuantity}
                          </span>
                        )}
                        {report.dateDeclaration && (
                          <span>
                            <strong>Date:</strong> {report.dateDeclaration}
                          </span>
                        )}
                      </div>

                      {/* Issue summary */}
                      <div className="mt-2 text-xs">
                        {hasIssues ? (
                          <span className="text-amber-700 font-semibold">
                            {report.issueCount} {report.issueCount === 1 ? 'item requires' : 'items require'} review
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-semibold">
                            All mandatory declarations detected
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Chevron */}
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-gov-700 group-hover:translate-x-0.5 transition flex-shrink-0 mt-2" />
                  </div>

                  {/* Card Footer: Copyable Report ID */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-mono truncate mr-2">
                      {report.origin === 'local_pending' ? 'Local ID' : 'Report ID'}: {report.id}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleCopyId(e, report.id)}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold flex items-center gap-1 flex-shrink-0 transition"
                      aria-label="Copy Report ID"
                      title="Copy full Report ID"
                    >
                      {copiedId === report.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-[10px] text-emerald-700">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span className="text-[10px]">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

