import { createWorker, Worker } from 'tesseract.js';
import { OcrProgressCallback, OcrService, OcrOptions, OcrResult } from './OcrService';
import { preprocessImageForOcr } from '../../utils/imagePreprocess';
import { assessOcrQuality } from './ocrQuality';
import { getSelectedLanguage } from './ocrLanguages';

export class TesseractOcrService implements OcrService {
  /**
   * Recognizes text from a packaged product label using Tesseract.js inside a browser Web Worker.
   * Returns raw extracted text string for backward compatibility.
   */
  async recognize(
    image: Blob | File,
    onProgress?: OcrProgressCallback,
    options?: OcrOptions
  ): Promise<string> {
    const result = await this.recognizeWithQuality(image, onProgress, options);
    return result.text;
  }

  /**
   * Comprehensive OCR execution with:
   * - Configurable language support (English, Hindi, regional scripts)
   * - Controlled 2-pass retry strategy: Pass 1 (standard) -> Pass 2 (high_contrast fallback if quality is POOR)
   * - OCR Quality Assessment (GOOD / FAIR / POOR) based on confidence, length, and declaration keywords
   */
  async recognizeWithQuality(
    image: Blob | File,
    onProgress?: OcrProgressCallback,
    options?: OcrOptions
  ): Promise<OcrResult> {
    let worker: Worker | null = null;
    const lang = options?.language || getSelectedLanguage().tesseractCode || 'eng';
    const maxAttempts = options?.maxAttempts ?? 2;

    try {
      if (onProgress) {
        onProgress(0.05, `Preparing label image for recognition (${lang})...`);
      }

      // Initialize Tesseract.js Worker with chosen language using precached local worker script
      worker = await createWorker(lang, 1, {
        workerPath: '/tesseract/worker.min.js',
        logger: (m) => {
          if (!onProgress) return;

          const rawStatus = (m.status || '').toLowerCase();
          const rawProgress = typeof m.progress === 'number' ? m.progress : 0;

          let displayMsg = 'Processing label...';
          let computedProgress = 0.2;

          if (rawStatus.includes('loading tesseract core')) {
            displayMsg = 'Loading OCR WebAssembly core...';
            computedProgress = 0.12 + rawProgress * 0.12;
          } else if (rawStatus.includes('loading language')) {
            displayMsg = `Loading ${lang} language model data...`;
            computedProgress = 0.25 + rawProgress * 0.15;
          } else if (rawStatus.includes('initializing api')) {
            displayMsg = 'Initializing recognition engine...';
            computedProgress = 0.42 + rawProgress * 0.08;
          } else if (rawStatus.includes('recognizing text')) {
            displayMsg = `Recognizing text declarations (${Math.round(rawProgress * 100)}%)...`;
            computedProgress = 0.5 + rawProgress * 0.35;
          } else {
            displayMsg = rawStatus ? rawStatus.replace(/_/g, ' ') : 'Analyzing image...';
            computedProgress = Math.min(0.92, 0.2 + rawProgress * 0.6);
          }

          onProgress(Math.min(0.94, Math.max(0.05, computedProgress)), displayMsg);
        },
      });

      // ==========================================
      // PASS 1: Standard Preprocessing
      // ==========================================
      if (onProgress) {
        onProgress(0.48, 'Running primary OCR pass (standard contrast)...');
      }

      const pass1Image = await preprocessImageForOcr(image, { mode: 'standard' });
      const ret1 = await worker.recognize(pass1Image);
      const text1 = ret1.data.text || '';
      const conf1 = typeof ret1.data.confidence === 'number' ? ret1.data.confidence : 0;
      const assessment1 = assessOcrQuality(text1, conf1);

      let bestResult: OcrResult = {
        text: text1,
        confidence: conf1,
        quality: assessment1.quality,
        language: lang,
        attempts: 1,
        preprocessingMode: 'standard',
      };

      // ==========================================
      // PASS 2 (Fallback): If Pass 1 is POOR & retry allowed
      // ==========================================
      if (maxAttempts > 1 && assessment1.quality === 'POOR') {
        if (onProgress) {
          onProgress(0.68, 'Low contrast text detected. Running enhanced binarization pass...');
        }

        const pass2Image = await preprocessImageForOcr(image, { mode: 'high_contrast' });
        const ret2 = await worker.recognize(pass2Image);
        const text2 = ret2.data.text || '';
        const conf2 = typeof ret2.data.confidence === 'number' ? ret2.data.confidence : 0;
        const assessment2 = assessOcrQuality(text2, conf2);

        // Compare Pass 1 and Pass 2:
        // Pick Pass 2 if it found more declaration keywords or significantly higher confidence
        const choosePass2 =
          assessment2.keywordHits.length > assessment1.keywordHits.length ||
          (assessment2.keywordHits.length === assessment1.keywordHits.length && conf2 > conf1) ||
          (text1.trim().length === 0 && text2.trim().length > 0);

        if (choosePass2) {
          bestResult = {
            text: text2,
            confidence: conf2,
            quality: assessment2.quality,
            language: lang,
            attempts: 2,
            preprocessingMode: 'high_contrast',
          };
        } else {
          bestResult.attempts = 2;
        }
      }

      if (onProgress) {
        onProgress(1.0, `Text extraction complete (Quality: ${bestResult.quality})`);
      }

      return bestResult;
    } catch (error) {
      console.error('Tesseract OCR engine error:', error);
      throw new Error(
        error instanceof Error
          ? `Text recognition encountered an issue: ${error.message}`
          : 'Unable to recognize text from the provided image. Please check image clarity and retry.'
      );
    } finally {
      // Always cleanly terminate worker to free WebAssembly memory
      if (worker) {
        try {
          await worker.terminate();
        } catch (err) {
          console.warn('Worker termination warning:', err);
        }
      }
    }
  }
}

export const defaultOcrService: TesseractOcrService = new TesseractOcrService();
