import { ReportCreatePayload } from '../api';

export type SyncStatus = 'pending' | 'synced' | 'failed';
export type ReportLifecycleState = 'LOCAL_ONLY' | 'QUEUED' | 'SYNCING' | 'SUBMITTED' | 'FAILED';

export interface LocalReport {
  localId: string;
  payload: ReportCreatePayload;
  createdAt: string; // ISO timestamp
  syncStatus: SyncStatus;
  serverId?: string | null;
  retryCount: number;
  lastError?: string | null;
  syncedAt?: string | null;
}

export function getReportLifecycleState(
  report: { syncStatus: SyncStatus; serverId?: string | null },
  isCurrentlySyncing: boolean = false
): ReportLifecycleState {
  if (report.serverId || report.syncStatus === 'synced') {
    return 'SUBMITTED';
  }
  if (isCurrentlySyncing) {
    return 'SYNCING';
  }
  if (report.syncStatus === 'failed') {
    return 'FAILED';
  }
  return 'QUEUED';
}

const DB_NAME = 'lmcc_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'queued_reports';

// In-memory store fallback for SSR / testing environments without IndexedDB
const memoryStore = new Map<string, LocalReport>();

function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      return reject(new Error('IndexedDB not available in current environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'localId' });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

/**
 * Saves a new compliance observation into local IndexedDB queue.
 * Strictly persists only metadata, declarations, and structured issues (no images/PII).
 */
export async function saveLocalReport(payload: ReportCreatePayload): Promise<LocalReport> {
  const localId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const enrichedPayload: ReportCreatePayload = {
    ...payload,
    localReportId: payload.localReportId || localId,
  };

  const report: LocalReport = {
    localId,
    payload: enrichedPayload,
    createdAt: new Date().toISOString(),
    syncStatus: 'pending',
    serverId: null,
    retryCount: 0,
    lastError: null,
  };

  if (!isIndexedDBAvailable()) {
    memoryStore.set(localId, report);
    return report;
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.add(report);

      request.onsuccess = () => resolve(report);
      request.onerror = () => reject(request.error || new Error('Failed to save report locally'));
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('IndexedDB write error, using fallback:', err);
    memoryStore.set(localId, report);
    return report;
  }
}

/**
 * Retrieves all locally saved reports ordered by creation date (newest first).
 */
export async function getLocalReports(): Promise<LocalReport[]> {
  if (!isIndexedDBAvailable()) {
    return Array.from(memoryStore.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = (request.result as LocalReport[]) || [];
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(results);
      };
      request.onerror = () => reject(request.error || new Error('Failed to read local reports'));
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('IndexedDB read error, using fallback:', err);
    return Array.from(memoryStore.values());
  }
}

/**
 * Retrieves a single locally saved report by local ID.
 */
export async function getLocalReport(localId: string): Promise<LocalReport | null> {
  if (!isIndexedDBAvailable()) {
    return memoryStore.get(localId) || null;
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(localId);

      request.onsuccess = () => resolve((request.result as LocalReport) || null);
      request.onerror = () => reject(request.error || new Error('Failed to read local report'));
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('IndexedDB read error, using fallback:', err);
    return memoryStore.get(localId) || null;
  }
}

/**
 * Retrieves only reports currently queued for backend synchronization.
 */
export async function getPendingLocalReports(): Promise<LocalReport[]> {
  const allReports = await getLocalReports();
  return allReports.filter((r) => r.syncStatus === 'pending' || r.syncStatus === 'failed');
}

/**
 * Updates the synchronization status and server ID for a local report.
 */
export async function updateLocalReportStatus(
  localId: string,
  status: SyncStatus,
  serverId?: string | null,
  errorMessage?: string | null
): Promise<void> {
  const existing = await getLocalReport(localId);
  if (!existing) return;

  const updated: LocalReport = {
    ...existing,
    syncStatus: status,
    serverId: serverId ?? existing.serverId,
    lastError: errorMessage ?? existing.lastError,
    retryCount: status === 'failed' ? existing.retryCount + 1 : existing.retryCount,
    syncedAt: status === 'synced' ? new Date().toISOString() : existing.syncedAt,
  };

  if (!isIndexedDBAvailable()) {
    memoryStore.set(localId, updated);
    return;
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(updated);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error('Failed to update local report'));
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('IndexedDB update error, using fallback:', err);
    memoryStore.set(localId, updated);
  }
}

/**
 * Deletes a local report from storage.
 */
export async function deleteLocalReport(localId: string): Promise<void> {
  if (!isIndexedDBAvailable()) {
    memoryStore.delete(localId);
    return;
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(localId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error('Failed to delete local report'));
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('IndexedDB delete error, using fallback:', err);
    memoryStore.delete(localId);
  }
}
