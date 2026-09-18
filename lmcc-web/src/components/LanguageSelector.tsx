import React, { useState, useEffect } from 'react';
import { Globe, Check, CloudDownload, ChevronDown } from 'lucide-react';
import {
  SUPPORTED_LANGUAGES,
  OcrLanguageProfile,
  getSelectedLanguage,
  setSelectedLanguage,
} from '../services/ocr/ocrLanguages';

interface LanguageSelectorProps {
  onLanguageChange?: (lang: OcrLanguageProfile) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  onLanguageChange,
}) => {
  const [selected, setSelected] = useState<OcrLanguageProfile>(getSelectedLanguage());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setSelected(getSelectedLanguage());
  }, []);

  const handleSelect = (lang: OcrLanguageProfile) => {
    setSelectedLanguage(lang.code);
    setSelected(lang);
    setIsOpen(false);
    if (onLanguageChange) {
      onLanguageChange(lang);
    }
  };

  return (
    <div className="relative inline-block text-left w-full max-w-xs">
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-gov-400" />
          <span>OCR Language / Script</span>
        </label>
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
            selected.offlineStatus === 'offline_ready'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}
          title={
            selected.offlineStatus === 'offline_ready'
              ? 'Cached on device - works fully offline'
              : 'Downloads ~4MB model once on first use, then cached'
          }
        >
          {selected.offlineStatus === 'offline_ready' ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Offline Ready
            </>
          ) : (
            <>
              <CloudDownload className="w-2.5 h-2.5" />
              1st use online
            </>
          )}
        </span>
      </div>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-900/90 hover:bg-slate-800/90 text-white px-3.5 py-2.5 rounded-xl border border-slate-700/80 flex items-center justify-between shadow-sm transition text-xs font-medium focus:outline-none focus:ring-2 focus:ring-gov-500"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 truncate">
          <span className="font-semibold text-slate-100">{selected.label}</span>
          <span className="text-slate-400 text-[11px] truncate">({selected.nativeLabel})</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Options */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div className="absolute right-0 mt-2 w-full min-w-[260px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden py-1 divide-y divide-slate-800">
            <div className="max-h-60 overflow-y-auto">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isCurrent = lang.code === selected.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelect(lang)}
                    className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between text-xs transition ${
                      isCurrent
                        ? 'bg-gov-600/20 text-white'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 font-medium">
                        <span>{lang.label}</span>
                        <span className="text-slate-400 text-[11px]">({lang.nativeLabel})</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {lang.script} script • {lang.offlineStatus === 'offline_ready' ? 'Precached' : 'CDN cached'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 ml-2">
                      {lang.offlineStatus === 'offline_ready' ? (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">
                          Offline
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded">
                          Online 1st
                        </span>
                      )}
                      {isCurrent && <Check className="w-4 h-4 text-gov-400 flex-shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="px-3 py-2 bg-slate-950/60 text-[10px] text-slate-400">
              Honest status: English works completely offline. Regional models require network on first scan.
            </div>
          </div>
        </>
      )}
    </div>
  );
};
