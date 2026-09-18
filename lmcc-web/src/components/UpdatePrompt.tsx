import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export const UpdatePrompt: React.FC = () => {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    // Listen for custom SW update event if registered by registerSW
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // New service worker activated
      });
    }

    // Dynamic import to avoid SSR errors
    import('virtual:pwa-register')
      .then(({ registerSW }) => {
        const update = registerSW({
          onNeedRefresh() {
            setNeedRefresh(true);
          },
          onOfflineReady() {
            console.log('LMCC is ready for offline operation');
          },
        });
        setUpdateSW(() => update);
      })
      .catch(() => {
        // Running in dev or non-pwa environment
      });
  }, []);

  if (!needRefresh) {
    return null;
  }

  return (
    <aside aria-label="Application update available" className="fixed bottom-4 right-4 z-50 max-w-sm bg-gov-900 text-white p-4 rounded-2xl shadow-2xl border border-gov-700 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5">
      <div className="text-xs">
        <span className="font-bold block text-slate-100">Update Available</span>
        <span className="text-[11px] text-slate-300">A new version of LMCC is ready.</span>
      </div>
      <button
        type="button"
        onClick={() => updateSW && updateSW()}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow-md flex-shrink-0"
        aria-label="Refresh and update application"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Refresh</span>
      </button>
    </aside>
  );
};
