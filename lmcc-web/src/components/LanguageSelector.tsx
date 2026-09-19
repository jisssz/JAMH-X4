import React, { useState, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
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
    <div className="relative inline-block text-left">
      <div className="flex items-center gap-2.5">
        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/[0.08] backdrop-blur-md transition text-xs font-sans font-medium cursor-pointer shadow-sm"
          aria-expanded={isOpen}
        >
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-white">{selected.label}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Quiet Offline Indicator */}
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-sans text-slate-400"
          title={
            selected.offlineStatus === 'offline_ready'
              ? 'Cached on device - works fully offline'
              : 'Downloads ~4MB model once on first use, then cached'
          }
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              selected.offlineStatus === 'offline_ready' ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
          <span>{selected.offlineStatus === 'offline_ready' ? 'Offline ready' : '1st use online'}</span>
        </span>
      </div>

      {/* Dropdown Options */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-72 bg-[#090d16]/95 border border-white/[0.1] rounded-2xl shadow-2xl z-50 overflow-hidden py-1 backdrop-blur-2xl divide-y divide-white/[0.04]">
            <div className="px-3.5 py-2 text-[10px] font-sans font-medium uppercase tracking-wider text-slate-400">
              Select OCR Language / Script
            </div>
            <div className="max-h-60 overflow-y-auto">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isCurrent = lang.code === selected.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelect(lang)}
                    className={`w-full px-3.5 py-2 text-left flex items-center justify-between text-xs transition cursor-pointer font-sans ${
                      isCurrent
                        ? 'bg-white/[0.08] text-white'
                        : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                    }`}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 font-medium">
                        <span>{lang.label}</span>
                        <span className="text-slate-400 text-[11px]">({lang.nativeLabel})</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-sans">
                        {lang.script} script
                      </span>
                    </div>

                    <div className="flex items-center gap-2 ml-2">
                      {lang.offlineStatus === 'offline_ready' ? (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                          Offline
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                          Online 1st
                        </span>
                      )}
                      {isCurrent && <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="px-3.5 py-2 text-[10px] text-slate-500 font-sans">
              English is precached locally. Regional scripts cache on first use.
            </div>
          </div>
        </>
      )}
    </div>
  );
};
