import { submitReport } from '../api';
import {
  getPendingLocalReports,
  updateLocalReportStatus,
} from '../storage/localReports';

export interface ReportSyncResult {
  total: number;
  synced: number;
  failed: number;
  errors: string[];
}

type SyncListener = (isSyncing: boolean, pendingCount: number) => void;
const listeners = new Set<SyncListener>();

let isSyncing = false;

export function registerSyncListener(listener: SyncListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners(pendingCount: number) {
  listeners.forEach((listener) => {
    try {
      listener(isSyncing, pendingCount);
    } catch (e) {
      console.warn('Sync listener notification error:', e);
    }
  });
}

/**
 * Synchronizes all pending locally queued reports with the FastAPI backend.
 * Avoids duplicate submissions and retains failed items in queue.
 */
export async function syncPendingReports(): Promise<ReportSyncResult> {
  if (isSyncing) {
    return { total: 0, synced: 0, failed: 0, errors: ['Sync already in progress'] };
  }

  // Check connectivity before attempting sync (only if explicitly false)
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { total: 0, synced: 0, failed: 0, errors: ['Device is offline'] };
  }


  const pending = await getPendingLocalReports();
  if (pending.length === 0) {
    return { total: 0, synced: 0, failed: 0, errors: [] };
  }

  isSyncing = true;
  notifyListeners(pending.length);

  const result: ReportSyncResult = {
    total: pending.length,
    synced: 0,
    failed: 0,
    errors: [],
  };

  for (const report of pending) {
    try {
      const response = await submitReport(report.payload);
      if (response && response.id) {
        await updateLocalReportStatus(report.localId, 'synced', response.id);
        result.synced += 1;
      } else {
        throw new Error('Server returned invalid report ID response');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown network synchronization error';
      await updateLocalReportStatus(report.localId, 'failed', null, errMsg);
      result.failed += 1;
      result.errors.push(`Report ${report.localId}: ${errMsg}`);
    }
  }

  isSyncing = false;
  const remaining = await getPendingLocalReports();
  notifyListeners(remaining.length);

  return result;
}

/**
 * Initializes automatic background synchronization on network connection restoration.
 */
export function initAutoSync(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => {
    // Brief delay to allow network routing to stabilize
    setTimeout(() => {
      syncPendingReports().catch((err) => {
        console.warn('Auto-sync execution error:', err);
      });
    }, 1500);
  };

  window.addEventListener('online', handleOnline);

  // Trigger initial check on app startup if online
  if (navigator.onLine) {
    syncPendingReports().catch(() => {});
  }

  return () => {
    window.removeEventListener('online', handleOnline);
  };
}
