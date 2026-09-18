import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { syncPendingReports, registerSyncListener } from '../services/sync/reportSync';
import { getPendingLocalReports } from '../services/storage/localReports';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessToast, setSyncSuccessToast] = useState(false);

  const refreshPendingCount = async () => {
    try {
      const pending = await getPendingLocalReports();
      setPendingCount(pending.length);
    } catch {
      // Ignore in non-browser context
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      refreshPendingCount();
    };
    const handleOffline = () => {
      setIsOnline(false);
      refreshPendingCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = registerSyncListener((syncing, count) => {
      setIsSyncing(syncing);
      setPendingCount(count);
      if (!syncing && count === 0 && pendingCount > 0) {
        setSyncSuccessToast(true);
        setTimeout(() => setSyncSuccessToast(false), 3000);
      }
    });

    refreshPendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, [pendingCount]);

  const handleManualSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await syncPendingReports();
      if (res.synced > 0) {
        setSyncSuccessToast(true);
        setTimeout(() => setSyncSuccessToast(false), 3000);
      }
    } finally {
      setIsSyncing(false);
      refreshPendingCount();
    }
  };

  if (isOnline && pendingCount === 0 && !syncSuccessToast) {
    // Normal online state without pending queue — keep UI completely clean
    return null;
  }

  return (
    <aside aria-label="Network and synchronization status" className="bg-slate-900 text-white text-xs px-3.5 py-2 border-b border-slate-800 flex items-center justify-between transition-all duration-300">
      <div className="flex items-center gap-2 max-w-lg mx-auto w-full justify-between">
        {!isOnline ? (
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <div className="flex items-center gap-1.5 font-medium">
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] text-amber-200 font-bold uppercase tracking-wider">Offline</span>
            </div>
            <span className="text-[11px] text-slate-300 hidden sm:inline">
              — Scanning works locally. Reports will sync when connection returns.
            </span>
          </div>
        ) : syncSuccessToast ? (
          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold">Queued reports synchronized successfully!</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] text-slate-300">
              {pendingCount} report{pendingCount === 1 ? '' : 's'} queued locally
            </span>
          </div>
        )}

        {/* Sync Action button when online and pending reports exist */}
        {isOnline && pendingCount > 0 && (
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1 bg-gov-700 hover:bg-gov-600 disabled:opacity-50 text-[10px] font-bold px-2 py-1 rounded-md transition"
            aria-label="Sync offline reports now"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        )}
      </div>
    </aside>
  );
};
