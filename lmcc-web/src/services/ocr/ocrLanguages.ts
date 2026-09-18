/**
 * Language configuration and metadata for client-side Tesseract.js OCR.
 * Supports English and major Indian regional languages for packaged goods declarations.
 *
 * NOTE ON OFFLINE STATUS:
 * - 'offline_ready': English models and worker are precached locally or stored on first app install.
 * - 'online_first_use_required': Regional language traineddata is fetched on-demand from Tesseract CDN
 *   upon first use and then cached by the browser/Cache API/IndexedDB.
 */

export type OfflineSupportStatus = 'offline_ready' | 'online_first_use_required';

export interface OcrLanguageProfile {
  code: string;
  tesseractCode: string;
  label: string;
  nativeLabel: string;
  script: string;
  offlineStatus: OfflineSupportStatus;
  description: string;
}

export const SUPPORTED_LANGUAGES: OcrLanguageProfile[] = [
  {
    code: 'eng',
    tesseractCode: 'eng',
    label: 'English',
    nativeLabel: 'English',
    script: 'Latin',
    offlineStatus: 'offline_ready',
    description: 'Default language. Fast and pre-cached for offline operation.',
  },
  {
    code: 'hin',
    tesseractCode: 'hin',
    label: 'Hindi',
    nativeLabel: 'हिन्दी',
    script: 'Devanagari',
    offlineStatus: 'online_first_use_required',
    description: 'Devanagari script support. Downloads traineddata (~4 MB) on first use.',
  },
  {
    code: 'eng+hin',
    tesseractCode: 'eng+hin',
    label: 'Bilingual (English + Hindi)',
    nativeLabel: 'English + हिन्दी',
    script: 'Latin + Devanagari',
    offlineStatus: 'online_first_use_required',
    description: 'Recommended for standard pan-India dual-language packaging.',
  },
  {
    code: 'mal',
    tesseractCode: 'mal',
    label: 'Malayalam',
    nativeLabel: 'മലയാളം',
    script: 'Malayalam',
    offlineStatus: 'online_first_use_required',
    description: 'Malayalam script support. Downloads traineddata on first use.',
  },
  {
    code: 'tam',
    tesseractCode: 'tam',
    label: 'Tamil',
    nativeLabel: 'தமிழ்',
    script: 'Tamil',
    offlineStatus: 'online_first_use_required',
    description: 'Tamil script support. Downloads traineddata on first use.',
  },
  {
    code: 'kan',
    tesseractCode: 'kan',
    label: 'Kannada',
    nativeLabel: 'ಕನ್ನಡ',
    script: 'Kannada',
    offlineStatus: 'online_first_use_required',
    description: 'Kannada script support. Downloads traineddata on first use.',
  },
  {
    code: 'tel',
    tesseractCode: 'tel',
    label: 'Telugu',
    nativeLabel: 'తెలుగు',
    script: 'Telugu',
    offlineStatus: 'online_first_use_required',
    description: 'Telugu script support. Downloads traineddata on first use.',
  },
];

export const DEFAULT_LANGUAGE_CODE = 'eng';
const STORAGE_KEY = 'lmcc_ocr_language';
let memorySelectedCode: string = DEFAULT_LANGUAGE_CODE;

/**
 * Returns the currently active OCR language profile from localStorage or fallback to English.
 */
export function getSelectedLanguage(): OcrLanguageProfile {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedCode = window.localStorage.getItem(STORAGE_KEY);
      if (savedCode) {
        const found = SUPPORTED_LANGUAGES.find((l) => l.code === savedCode);
        if (found) return found;
      }
    } else if (memorySelectedCode) {
      const found = SUPPORTED_LANGUAGES.find((l) => l.code === memorySelectedCode);
      if (found) return found;
    }
  } catch (err) {
    console.warn('Unable to access localStorage for OCR language:', err);
  }
  return SUPPORTED_LANGUAGES[0];
}

/**
 * Updates and persists user's selected OCR language preference.
 */
export function setSelectedLanguage(code: string): OcrLanguageProfile {
  memorySelectedCode = code;
  const target = SUPPORTED_LANGUAGES.find((l) => l.code === code) || SUPPORTED_LANGUAGES[0];
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, target.code);
    }
  } catch (err) {
    console.warn('Unable to persist OCR language to localStorage:', err);
  }
  return target;
}

/**
 * Look up a profile by language code.
 */
export function getLanguageProfile(code: string): OcrLanguageProfile {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code) || SUPPORTED_LANGUAGES[0];
}
