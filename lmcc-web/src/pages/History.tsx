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
  Search,
} from 'lucide-react';
import { getReports } from '../services/api';
import { getLocalReports, LocalReport } from '../services/storage/localReports';
import GlowBackground from '../components/ui/GlowBackground';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVerdict, setFilterVerdict] = useState<'ALL' | 'PASS' | 'REVIEW'>('ALL');

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

      setItems([...pendingLocal, ...mappedServer]);
    } catch (err: unknown) {
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

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesVerdict =
      filterVerdict === 'ALL' || item.verdict === filterVerdict;
    const matchesSearch =
      !searchQuery.trim() ||
      (item.productName && item.productName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.mrp && item.mrp.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesVerdict && matchesSearch;
  });

  const passCount = items.filter((i) => i.verdict === 'PASS').length;
  const reviewCount = items.filter((i) => i.verdict === 'REVIEW').length;

  return (
    <div className="min-h-screen bg-[#05070b] text-slate-100 flex flex-col justify-between pb-12 selection:bg-emerald-500 selection:text-black">
      <GlowBackground variant="subtle" />

      {/* Top Floating Header */}
      <header className="sticky top-3 sm:top-5 z-40 max-w-4xl w-full mx-auto px-4">
        <div className="px-4 py-3 rounded-full bg-slate-950/80 border border-white/10 backdrop-blur-2xl shadow-xl flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white text-xs font-mono font-semibold py-1.5 px-3 rounded-full bg-white/5 border border-white/10 transition cursor-pointer"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>HOME</span>
          </button>

          <div className="text-center">
            <h1 className="text-xs sm:text-sm font-black text-white tracking-wide uppercase">
              Scan History
            </h1>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:block">
              Archived Compliance Screenings
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="flex items-center gap-1.5 text-slate-950 bg-white hover:bg-slate-100 text-xs font-bold py-1.5 px-3 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.3)] transition cursor-pointer"
            aria-label="Scan New Product"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Scan</span>
            <span className="sm:hidden">Scan</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-4xl w-full mx-auto px-4 py-8 flex-1 space-y-6">
        {/* Analytics Summary Bar */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-slate-900/80 p-4 border border-white/10 backdrop-blur-xl text-center font-mono">
            <span className="text-[10px] uppercase text-slate-400 block mb-1">Total Scanned</span>
            <span className="text-2xl font-black text-white">{items.length}</span>
          </div>
          <div className="rounded-2xl bg-slate-900/80 p-4 border border-white/10 backdrop-blur-xl text-center font-mono">
            <span className="text-[10px] uppercase text-slate-400 block mb-1">Compliant</span>
            <span className="text-2xl font-black text-emerald-400">{passCount}</span>
          </div>
          <div className="rounded-2xl bg-slate-900/80 p-4 border border-white/10 backdrop-blur-xl text-center font-mono">
            <span className="text-[10px] uppercase text-slate-400 block mb-1">Review Flagged</span>
            <span className="text-2xl font-black text-amber-400">{reviewCount}</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-900/80 p-3 rounded-2xl border border-white/10 backdrop-blur-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by product, price, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-white/30"
            />
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => setFilterVerdict('ALL')}
              className={`px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                filterVerdict === 'ALL'
                  ? 'bg-white text-slate-950 font-bold border-white'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
              }`}
            >
              ALL
            </button>
            <button
              type="button"
              onClick={() => setFilterVerdict('PASS')}
              className={`px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                filterVerdict === 'PASS'
                  ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:text-emerald-400'
              }`}
            >
              PASS
            </button>
            <button
              type="button"
              onClick={() => setFilterVerdict('REVIEW')}
              className={`px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                filterVerdict === 'REVIEW'
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:text-amber-400'
              }`}
            >
              REVIEW
            </button>
          </div>
        </div>

        {/* Status Indicators */}
        {isOfflineView && (
          <div className="bg-amber-950/30 border border-amber-500/30 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs text-amber-300 font-mono backdrop-blur-xl">
            <WifiOff className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Offline mode — viewing reports stored locally in IndexedDB on this device.</span>
          </div>
        )}

        {/* Content States */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 text-emerald-400 flex items-center justify-center mb-4 border border-white/10 shadow-lg">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <h3 className="text-base font-bold text-white font-mono uppercase">Loading reports...</h3>
            <p className="text-xs text-slate-400 mt-1 font-mono">Retrieving screening observations from registry</p>
          </div>
        ) : error ? (
          <div className="bg-slate-900/80 rounded-3xl p-8 border border-red-500/30 text-center max-w-md mx-auto my-8 backdrop-blur-xl">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Unable to load report history</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed font-mono">
              {error} Check your connection or verify backend service availability.
            </p>
            <button
              type="button"
              onClick={fetchHistory}
              className="w-full py-3 bg-white text-slate-950 hover:bg-slate-100 text-xs font-bold rounded-full flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-slate-900/80 rounded-3xl p-8 border border-white/10 text-center max-w-md mx-auto my-8 backdrop-blur-xl">
            <div className="w-14 h-14 rounded-2xl bg-white/5 text-slate-400 flex items-center justify-center mx-auto mb-4 border border-white/10">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No matching reports</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed font-mono">
              {items.length === 0
                ? 'Scan a packaged product and submit a report to archive it here.'
                : 'No reports match your current search and filter criteria.'}
            </p>
            <button
              type="button"
              onClick={() => navigate('/scan')}
              className="w-full py-3.5 bg-white text-slate-950 hover:bg-slate-100 text-sm font-bold rounded-full flex items-center justify-center gap-2 transition cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.25)]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Scan Product</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                Reports ({filteredItems.length})
              </span>
              <button
                type="button"
                onClick={fetchHistory}
                className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                title="Refresh history"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            {filteredItems.map((report) => {
              const isPass = report.verdict === 'PASS';
              const hasIssues = report.issueCount > 0;

              return (
                <div
                  key={report.id}
                  onClick={() => navigate(`/history/${report.id}`)}
                  className="bg-slate-900/80 hover:bg-slate-900 border border-white/10 hover:border-white/20 rounded-3xl p-5 shadow-xl backdrop-blur-xl transition cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Product & Verdict Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap font-mono">
                        {/* 1. Screening Verdict Badge */}
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                            isPass
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {isPass ? (
                            <>
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              PASS
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="w-3 h-3 text-amber-400" />
                              REVIEW
                            </>
                          )}
                        </span>

                        {/* 2. Storage Origin Badge */}
                        {report.origin === 'local_pending' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            <Clock className="w-3 h-3 text-amber-400" />
                            Pending Sync
                          </span>
                        )}
                        {report.origin === 'local_synced' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-sky-500/10 text-sky-300 border border-sky-500/20">
                            <CheckCheck className="w-3 h-3 text-sky-400" />
                            Synced
                          </span>
                        )}
                        {report.origin === 'server' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-white/5 text-slate-300 border border-white/10">
                            <CloudUpload className="w-3 h-3 text-slate-400" />
                            Server Record
                          </span>
                        )}

                        <span className="text-[11px] text-slate-500 flex items-center gap-1 ml-auto">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {formatDate(report.createdAt)}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white truncate">
                        {report.productName || 'General Packaged Commodity'}
                      </h3>

                      {/* Product Declarations Snippet */}
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-400 flex-wrap font-mono">
                        {report.mrp && (
                          <span>
                            <strong className="text-slate-300">MRP:</strong> {report.mrp}
                          </span>
                        )}
                        {report.netQuantity && (
                          <span>
                            <strong className="text-slate-300">Net:</strong> {report.netQuantity}
                          </span>
                        )}
                        {report.dateDeclaration && (
                          <span>
                            <strong className="text-slate-300">Date:</strong> {report.dateDeclaration}
                          </span>
                        )}
                      </div>

                      {/* Issue summary */}
                      <div className="mt-2 text-xs font-mono">
                        {hasIssues ? (
                          <span className="text-amber-400">
                            {report.issueCount} {report.issueCount === 1 ? 'item requires' : 'items require'} review
                          </span>
                        ) : (
                          <span className="text-emerald-400">
                            All mandatory declarations detected
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Chevron */}
                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition flex-shrink-0 mt-2" />
                  </div>

                  {/* Card Footer: Copyable Report ID */}
                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span className="truncate mr-2">
                      {report.origin === 'local_pending' ? 'Local ID' : 'Report ID'}: {report.id}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleCopyId(e, report.id)}
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-md font-semibold flex items-center gap-1 flex-shrink-0 transition border border-white/10 cursor-pointer"
                      aria-label="Copy Report ID"
                      title="Copy full Report ID"
                    >
                      {copiedId === report.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-[10px] text-emerald-300">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span className="text-[10px]">Copy ID</span>
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

export default History;
