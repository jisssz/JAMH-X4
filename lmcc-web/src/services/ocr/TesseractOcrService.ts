import { createWorker, Worker, PSM } from 'tesseract.js';
import { OcrProgressCallback, OcrService, OcrOptions, OcrResult } from './OcrService';
import { preprocessImageForOcr, createUpscaledImage, createOverlappingTiles } from '../../utils/imagePreprocess';
import { assessOcrQuality } from './ocrQuality';
import { getSelectedLanguage } from './ocrLanguages';
import { mergeOcrStreams, OcrStreamSegment } from './ocrTextMerger';
import { OcrDiagnosticSession } from './ocrDiagnostics';
import { parseLabel } from '../parser/fieldParser';

function countMandatoryDeclarations(rawText: string): number {
  if (!rawText || rawText.trim().length === 0) return 0;
  const parsed = parseLabel(rawText);
  let count = 0;
  if (parsed.mrp) count++;
  if (parsed.netQuantity) count++;
  if (parsed.packingDate || parsed.manufactureDate) count++;
  if (parsed.manufacturer) count++;
  if (parsed.address) count++;
  if (parsed.consumerCare) count++;
  return count;
}

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
   * Comprehensive Multi-Scale & Multi-Region OCR Cascade:
   * - Stage A: Standard full-image OCR with PSM.AUTO (or PSM 3).
   *   Fast-path early exit if statutory declarations are already detected (>= 5 fields).
   * - Stage B (Multi-Scale Upscaling): 2x bicubic upscale for fine print (8-12px x-height)
   *   with PSM.SPARSE_TEXT (PSM 11) or PSM.SINGLE_BLOCK (PSM 6).
   * - Stage C (Overlapping Region Tiles): Targeted tiles for localized declaration panels
   *   (bottom panel, left/right columns) to capture edge/corner declarations.
   * - Intelligent Text Stream Fusion: Deduplicates exact/near-duplicate lines and prioritizes statutory declarations.
   * - Comprehensive Diagnostic Telemetry: Records dimensions, pass timings, confidence, and field counts.
   */
  async recognizeWithQuality(
    image: Blob | File,
    onProgress?: OcrProgressCallback,
    options?: OcrOptions
  ): Promise<OcrResult> {
    let worker: Worker | null = null;
    const lang = options?.language || getSelectedLanguage().tesseractCode || 'eng';
    const maxAttempts = options?.maxAttempts ?? 3;
    const diagSession = new OcrDiagnosticSession();

    try {
      if (onProgress) {
        onProgress(0.05, `Initializing LMCC OCR Engine (${lang})...`);
      }

      // Initialize Tesseract.js Worker with chosen language using precached local worker script
      worker = await createWorker(lang, 1, {
        workerPath: '/tesseract/worker.min.js',
        logger: (m) => {
          if (!onProgress) return;

          const rawStatus = (m.status || '').toLowerCase();
          const rawProgress = typeof m.progress === 'number' ? m.progress : 0;

          let displayMsg = 'Analyzing packaging label...';
          let computedProgress = 0.15;

          if (rawStatus.includes('loading tesseract core')) {
            displayMsg = 'Loading OCR WebAssembly core...';
            computedProgress = 0.08 + rawProgress * 0.08;
          } else if (rawStatus.includes('loading language')) {
            displayMsg = `Loading ${lang} language model...`;
            computedProgress = 0.16 + rawProgress * 0.08;
          } else if (rawStatus.includes('initializing api')) {
            displayMsg = 'Configuring recognition engine...';
            computedProgress = 0.24 + rawProgress * 0.06;
          } else if (rawStatus.includes('recognizing text')) {
            displayMsg = `Recognizing text declarations (${Math.round(rawProgress * 100)}%)...`;
            computedProgress = 0.3 + rawProgress * 0.25;
          } else {
            displayMsg = rawStatus ? rawStatus.replace(/_/g, ' ') : 'Processing...';
            computedProgress = Math.min(0.85, 0.15 + rawProgress * 0.5);
          }

          onProgress(Math.min(0.88, Math.max(0.05, computedProgress)), displayMsg);
        },
      });

      const segments: OcrStreamSegment[] = [];

      // =========================================================================
      // STAGE A: Standard Full Image Recognition (PSM AUTO / PSM 3)
      // =========================================================================
      if (onProgress) {
        onProgress(0.32, 'Running Stage A: Standard full-image scan...');
      }

      const pass1Start = Date.now();
      await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
      const pass1Image = await preprocessImageForOcr(image, { mode: 'standard' });
      const ret1 = await worker.recognize(pass1Image);
      const pass1Duration = Date.now() - pass1Start;

      const text1 = ret1.data.text || '';
      const conf1 = typeof ret1.data.confidence === 'number' ? ret1.data.confidence : 0;

      segments.push({
        text: text1,
        source: 'stage_a_standard',
        confidence: conf1,
      });

      diagSession.recordPass({
        passName: 'Stage A: Standard Full Image',
        psm: 3,
        inputDimensions: { width: 0, height: 0 },
        characterCount: text1.length,
        confidence: Math.round(conf1),
        snippet: text1.slice(0, 80).replace(/\n/g, ' '),
        durationMs: pass1Duration,
      });

      let currentMerged = text1;
      let detectedCount = countMandatoryDeclarations(currentMerged);

      // Early exit check: if we already have >= 5 mandatory fields or maxAttempts is 1, skip Stage B/C
      const canSkipFurtherPasses =
        maxAttempts <= 1 ||
        detectedCount >= 5 ||
        (detectedCount >= 4 && conf1 >= 80);

      // =========================================================================
      // STAGE B: Multi-Scale Upscale for Fine-Print Declarations (PSM 6 / SINGLE_BLOCK)
      // =========================================================================
      if (!canSkipFurtherPasses && maxAttempts >= 2) {
        if (onProgress) {
          onProgress(0.55, 'Running Stage B: Fine-print declaration scan (multi-scale resolution)...');
        }

        try {
          const pass2Start = Date.now();
          await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
          const upscaledImage = await createUpscaledImage(image, 2.0);
          const ret2 = await worker.recognize(upscaledImage);
          const pass2Duration = Date.now() - pass2Start;

          const text2 = ret2.data.text || '';
          const conf2 = typeof ret2.data.confidence === 'number' ? ret2.data.confidence : 0;

          if (text2.trim().length > 0) {
            segments.push({
              text: text2,
              source: 'stage_b_upscaled',
              confidence: conf2,
            });

            diagSession.recordPass({
              passName: 'Stage B: Upscaled Fine-Print',
              psm: 6,
              inputDimensions: { width: 0, height: 0 },
              characterCount: text2.length,
              confidence: Math.round(conf2),
              snippet: text2.slice(0, 80).replace(/\n/g, ' '),
              durationMs: pass2Duration,
            });

            currentMerged = mergeOcrStreams(segments);
            detectedCount = countMandatoryDeclarations(currentMerged);
          }
        } catch (stageBErr) {
          console.warn('Stage B upscale pass encountered an issue, proceeding:', stageBErr);
        }
      }

      // =========================================================================
      // STAGE C: Overlapping Region Tiles (PSM 6 / SINGLE_BLOCK)
      // =========================================================================
      const needsTiles = !canSkipFurtherPasses && detectedCount < 4 && maxAttempts >= 3;
      if (needsTiles) {
        if (onProgress) {
          onProgress(0.78, 'Running Stage C: Region tile analysis for localized panels...');
        }

        try {
          const tiles = await createOverlappingTiles(image);
          // Target priority panels: bottom panel (dates, MRP, net qty) and side columns (mfg, consumer care)
          const priorityTiles = tiles.filter(
            (t) => t.name === 'bottom_panel' || t.name === 'left_column' || t.name === 'right_column'
          );

          if (priorityTiles.length > 0) {
            await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });

            for (const tile of priorityTiles.slice(0, 2)) {
              const tileStart = Date.now();
              const tileRet = await worker.recognize(tile.blob);
              const tileDuration = Date.now() - tileStart;

              const tileText = tileRet.data.text || '';
              const tileConf = typeof tileRet.data.confidence === 'number' ? tileRet.data.confidence : 0;

              if (tileText.trim().length > 0) {
                segments.push({
                  text: tileText,
                  source: `stage_c_${tile.name}`,
                  confidence: tileConf,
                });

                diagSession.recordPass({
                  passName: `Stage C Tile: ${tile.name}`,
                  psm: 6,
                  inputDimensions: { width: tile.bounds.width, height: tile.bounds.height },
                  characterCount: tileText.length,
                  confidence: Math.round(tileConf),
                  snippet: tileText.slice(0, 80).replace(/\n/g, ' '),
                  durationMs: tileDuration,
                });
              }
            }

            currentMerged = mergeOcrStreams(segments);
          }
        } catch (stageCErr) {
          console.warn('Stage C tiling pass encountered an issue, proceeding:', stageCErr);
        }
      }

      // =========================================================================
      // FINAL CONSOLIDATION & QUALITY EVALUATION
      // =========================================================================
      const finalText = mergeOcrStreams(segments);
      const maxConfidence = segments.reduce((max, s) => Math.max(max, s.confidence ?? 0), 0);
      const assessment = assessOcrQuality(finalText, maxConfidence);
      const finalParsed = parseLabel(finalText);

      const finalVerdict =
        finalParsed.mrp &&
        finalParsed.netQuantity &&
        (finalParsed.packingDate || finalParsed.manufactureDate) &&
        finalParsed.manufacturer &&
        finalParsed.address &&
        finalParsed.consumerCare &&
        !finalParsed.isDateAmbiguous &&
        !finalParsed.isFutureDate
          ? 'PASS'
          : 'REVIEW';

      const pipelineDiag = diagSession.finalize(finalText, finalParsed as any, finalVerdict);
      diagSession.logSummary();

      if (onProgress) {
        onProgress(1.0, `Text extraction complete (${segments.length} passes, Quality: ${assessment.quality})`);
      }

      return {
        text: finalText,
        confidence: maxConfidence,
        quality: assessment.quality,
        language: lang,
        attempts: segments.length,
        preprocessingMode: segments.length > 1 ? 'multi_scale_cascade' : 'standard',
        diagnostics: pipelineDiag,
      };
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
