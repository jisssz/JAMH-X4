import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertCircle, HelpCircle, UploadCloud, RotateCcw, CheckCircle2, Loader2, Clock } from 'lucide-react';
import { useImage, ScanPanel } from '../context/ImageContext';
import { defaultOcrService } from '../services/ocr/TesseractOcrService';
import { getSelectedLanguage } from '../services/ocr/ocrLanguages';
import { mergeMultiPanelDeclarations, PanelOcrInput } from '../services/parser/multiPanelMerger';
import { defaultRulesEngine } from '../services/rules/rulesEngine';
import { detectBarcodeAcrossPanels } from '../services/barcode/barcodeDetector';
import { lookupProductByBarcode } from '../services/barcode/productDatabaseService';
import { performBarcodeCrossCheck } from '../services/barcode/barcodeCrossCheck';
import { ProcessingIndicator } from '../components/ProcessingIndicator';
import GlowBackground from '../components/ui/GlowBackground';
import { parseLabel } from '../services/parser/fieldParser';

// ── Panel-level processing states ────────────────────────────────────────────
type PanelStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

interface PanelProgress {
  panelId: string;
  panelLabel: string;
  status: PanelStatus;
  charCount?: number;
  fieldCount?: number;
  error?: string;
}

// ── Diagnostic logger (dev mode only) ────────────────────────────────────────
const DEBUG = true;
function diagLog(msg: string, ...args: unknown[]) {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log(`[LMCC-PIPELINE] ${msg}`, ...args);
  }
}

export const Processing: React.FC = () => {
  const navigate = useNavigate();
  const { capturedImage, imagePreviewUrl, clearImage, panels } = useImage();

  const [step, setStep] = useState<'ocr' | 'parsing' | 'rules' | 'done'>('ocr');
  const [progress, setProgress] = useState(0.05);
  const [statusMessage, setStatusMessage] = useState('Initializing client OCR engine...');
  const [error, setError] = useState<string | null>(null);
  const [emptyOcr, setEmptyOcr] = useState(false);
  const [panelProgress, setPanelProgress] = useState<PanelProgress[]>([]);
  const selectedLang = getSelectedLanguage();

  const isProcessingRef = useRef(false);

  /**
   * CRITICAL FIX — stale closure bug:
   * Store panels and capturedImage in refs so runOcrPipeline always reads
   * the CURRENT value regardless of when the closure was created.
   * React's useEffect with [panels.length] dependency re-runs the effect
   * but the old runOcrPipeline closure would still capture the stale panels.
   */
  const panelsRef = useRef<ScanPanel[]>(panels);
  const capturedImageRef = useRef<Blob | File | null>(capturedImage);
  const imagePreviewUrlRef = useRef<string | null>(imagePreviewUrl);

  // Keep refs in sync with current render values
  panelsRef.current = panels;
  capturedImageRef.current = capturedImage;
  imagePreviewUrlRef.current = imagePreviewUrl;

  /**
   * The pipeline reads panels from panelsRef.current (always current)
   * NOT from the closure-captured `panels` variable.
   */
  const runOcrPipeline = useCallback(async () => {
    // ── ALWAYS read from refs to get current state ──────────────────────────
    const currentPanels = panelsRef.current;
    const currentCapturedImage = capturedImageRef.current;
    const currentImagePreviewUrl = imagePreviewUrlRef.current;

    const activePanels: ScanPanel[] =
      currentPanels.length > 0
        ? currentPanels
        : currentCapturedImage
        ? [
            {
              id: 'primary',
              type: 'front' as const,
              label: 'Front / Main Label',
              blob: currentCapturedImage,
              previewUrl: currentImagePreviewUrl || '',
            },
          ]
        : [];

    if (activePanels.length === 0) return;

    // ── Initialize per-panel progress HUD ───────────────────────────────────
    setPanelProgress(
      activePanels.map((p) => ({
        panelId: p.id,
        panelLabel: p.label,
        status: 'PENDING' as PanelStatus,
      }))
    );

    setError(null);
    setEmptyOcr(false);
    setStep('ocr');
    setProgress(0.08);

    // ── Diagnostic session start ─────────────────────────────────────────────
    diagLog(`SESSION START — Panel count: ${activePanels.length}`);
    activePanels.forEach((p, i) => {
      diagLog(
        `  Panel ${i + 1}: id=${p.id} label="${p.label}" blobSize=${p.blob?.size ?? 'N/A'} blobType=${p.blob?.type ?? 'N/A'}`
      );
    });

    try {
      // 1. Kick off Barcode Detection concurrently across all active panels
      const barcodeDetectionPromise = detectBarcodeAcrossPanels(
        activePanels.map((p) => ({ id: p.id, label: p.label, blob: p.blob }))
      );

      // 2. Multi-Panel OCR — every panel gets its own independent OCR attempt
      const panelInputs: PanelOcrInput[] = [];
      let successCount = 0;

      for (let idx = 0; idx < activePanels.length; idx++) {
        const panel = activePanels[idx];

        // Mark PROCESSING
        setPanelProgress((prev) =>
          prev.map((pp) =>
            pp.panelId === panel.id ? { ...pp, status: 'PROCESSING' } : pp
          )
        );
        setStatusMessage(`Scanning panel ${idx + 1} of ${activePanels.length}: ${panel.label}...`);

        diagLog(`Panel ${idx + 1}/${activePanels.length} OCR STARTING — "${panel.label}" blob.size=${panel.blob?.size ?? 'N/A'}`);

        // Validate the blob before attempting OCR
        if (!panel.blob || panel.blob.size === 0) {
          const errMsg = `Image data missing for panel "${panel.label}" (blob is null or zero-size)`;
          diagLog(`  !! Panel ${idx + 1} BLOB MISSING — skipping OCR`);
          setPanelProgress((prev) =>
            prev.map((pp) =>
              pp.panelId === panel.id ? { ...pp, status: 'FAILED', error: errMsg } : pp
            )
          );
          panelInputs.push({
            panelId: panel.id,
            panelType: panel.type,
            panelLabel: panel.label,
            rawText: '',
            confidence: 0,
            quality: 'POOR',
          });
          continue;
        }

        try {
          const panelOcr = await defaultOcrService.recognizeWithQuality(
            panel.blob,
            (prog, msg) => {
              const base = idx / activePanels.length;
              const slice = 1 / activePanels.length;
              setProgress(base * 0.75 + prog * slice * 0.75);
              setStatusMessage(`Panel ${idx + 1}/${activePanels.length} (${panel.label}): ${msg}`);
            },
            { language: selectedLang.tesseractCode }
          );

          const chars = (panelOcr.text || '').length;

          // Count parsed fields from this panel's OCR text
          let fieldCount = 0;
          if (panelOcr.text && panelOcr.text.trim().length > 0) {
            const parsed = parseLabel(panelOcr.text);
            const fields = [
              'mrp', 'netQuantity', 'packingDate', 'manufactureDate',
              'manufacturer', 'address', 'consumerCare', 'importer',
              'batchNumber', 'expiryDate', 'email',
            ];
            fieldCount = fields.filter(
              (f) => (parsed as unknown as Record<string, unknown>)[f]
            ).length;
          }

          diagLog(
            `  Panel ${idx + 1} OCR COMPLETED — chars=${chars} confidence=${panelOcr.confidence} quality=${panelOcr.quality} fields=${fieldCount}`
          );

          panelInputs.push({
            panelId: panel.id,
            panelType: panel.type,
            panelLabel: panel.label,
            rawText: panelOcr.text || '',
            confidence: panelOcr.confidence,
            quality: panelOcr.quality,
          });

          setPanelProgress((prev) =>
            prev.map((pp) =>
              pp.panelId === panel.id
                ? { ...pp, status: 'COMPLETED', charCount: chars, fieldCount }
                : pp
            )
          );
          successCount++;
        } catch (panelErr: unknown) {
          const errMsg =
            panelErr instanceof Error ? panelErr.message : 'OCR engine error';
          diagLog(`  !! Panel ${idx + 1} OCR FAILED — ${errMsg}`);
          setPanelProgress((prev) =>
            prev.map((pp) =>
              pp.panelId === panel.id ? { ...pp, status: 'FAILED', error: errMsg } : pp
            )
          );
          panelInputs.push({
            panelId: panel.id,
            panelType: panel.type,
            panelLabel: panel.label,
            rawText: '',
            confidence: 0,
            quality: 'POOR',
          });
        }
      }

      diagLog(
        `MERGE — panels received: ${panelInputs.length}, successful OCR: ${successCount}, failed: ${panelInputs.length - successCount}`
      );

      // If ALL panels returned empty text, show the empty-OCR UI
      // If SOME panels succeeded, continue (will produce REVIEW)
      const hasAnyText = panelInputs.some((pi) => pi.rawText.trim().length > 0);
      if (!hasAnyText) {
        diagLog('ALL panels returned empty OCR — showing empty OCR UI');
        setEmptyOcr(true);
        return;
      }

      // ── Merge evidence ────────────────────────────────────────────────────
      const merged = mergeMultiPanelDeclarations(panelInputs);

      diagLog(
        `MERGE RESULT — mrp=${!!merged.unifiedLabel.mrp} netQty=${!!merged.unifiedLabel.netQuantity} mfg=${!!merged.unifiedLabel.manufacturer} addr=${!!merged.unifiedLabel.address} date=${!!(merged.unifiedLabel.packingDate||merged.unifiedLabel.manufactureDate)} care=${!!merged.unifiedLabel.consumerCare} conflicts=${merged.conflictDetails.length}`
      );

      setStep('parsing');
      setStatusMessage('Merging multi-panel declarations & resolving barcodes...');
      setProgress(0.82);

      // 3. Await Barcode Detection result
      let barcodeResult = null;
      try {
        barcodeResult = await barcodeDetectionPromise;
      } catch {
        // non-fatal
      }

      let referenceProduct = null;
      if (barcodeResult && barcodeResult.rawValue) {
        setStatusMessage(`Barcode ${barcodeResult.rawValue} detected. Querying public reference database...`);
        try {
          referenceProduct = await lookupProductByBarcode(barcodeResult.rawValue, 3500);
        } catch {
          // non-fatal
        }
      }

      const crossCheck = performBarcodeCrossCheck(merged.unifiedLabel, barcodeResult, referenceProduct);

      setProgress(0.92);
      await new Promise((r) => setTimeout(r, 150));

      // 4. Rules Engine
      setStep('rules');
      setStatusMessage('Evaluating Legal Metrology Rule 6 across package evidence...');
      setProgress(0.96);
      await new Promise((r) => setTimeout(r, 150));

      const verdict = defaultRulesEngine.evaluate(merged.unifiedLabel);

      // Safety: any panel with empty OCR that would produce PASS → force REVIEW
      const hasFailedPanel = panelInputs.some(
        (pi) => pi.quality === 'POOR' && pi.rawText.trim().length === 0
      );
      if (hasFailedPanel && verdict.overallStatus === 'PASS') {
        verdict.overallStatus = 'REVIEW';
        verdict.summary =
          'Needs Review: One or more package panels could not be OCR-processed. Cannot confirm all declarations are present.';
        verdict.potentialViolations.unshift({
          ruleId: 'PARTIAL_SCAN_INCOMPLETE',
          field: 'scan_completeness',
          title: 'Incomplete Multi-Panel Scan',
          severity: 'high',
          explanation: `${panelInputs.filter((pi) => pi.rawText.trim().length === 0).length} of ${panelInputs.length} panels returned no readable text. Missing panel data must not be interpreted as absent declarations.`,
          evidence: 'One or more images failed OCR processing',
          recommendation:
            'Re-capture the affected panel photos with better lighting and focus, then re-scan.',
          source: 'Multi-Panel Pipeline Safety Guard',
          gazetteReference: 'Rule 6 — All mandatory declarations must be verifiable',
        });
      }

      // Multi-Panel Conflict → REVIEW
      if (merged.hasConflict) {
        verdict.overallStatus = 'REVIEW';
        verdict.summary =
          'Needs Review: Conflicting statutory declarations detected across package panels.';
        for (const conflictMsg of merged.conflictDetails) {
          verdict.potentialViolations.unshift({
            ruleId: 'MULTI_PANEL_CONFLICT',
            field: 'conflict',
            title: 'Multi-Panel Declaration Discrepancy',
            severity: 'high',
            explanation: conflictMsg,
            evidence: conflictMsg,
            recommendation:
              'The packaging panels display conflicting statutory values. Visual verification required.',
            source: 'Multi-Panel Evidence Fusion',
            gazetteReference: 'Rule 6 Uniformity across Package Faces',
          });
        }
      }

      setStep('done');
      setProgress(1.0);
      setStatusMessage('Unified package analysis complete! Opening results...');
      await new Promise((r) => setTimeout(r, 200));

      diagLog(`PIPELINE COMPLETE — verdict=${verdict.overallStatus}`);

      navigate('/results', {
        replace: true,
        state: {
          extractedLabel: merged.unifiedLabel,
          verdict,
          imageBlob: activePanels[0]?.blob || currentCapturedImage,
          ocrQuality: merged.overallQuality,
          ocrConfidence: merged.averageConfidence,
          ocrLanguage: selectedLang.label,
          ocrAttempts: activePanels.length,
          ocrSuccessCount: successCount,
          multiPanelResult: merged,
          isMultiPanel: activePanels.length > 1,
          barcodeCrossCheck: crossCheck,
          panelSnapshot: activePanels.map((p) => ({
            id: p.id,
            type: p.type,
            label: p.label,
            previewUrl: p.previewUrl,
          })),
          panelProgressSnapshot: panelInputs.map((pi) => ({
            panelId: pi.panelId,
            panelLabel: pi.panelLabel,
            hasText: pi.rawText.trim().length > 0,
            charCount: pi.rawText.length,
            confidence: pi.confidence,
            quality: pi.quality,
          })),
        },
      });
    } catch (err: unknown) {
      console.error('OCR pipeline failure:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Text recognition could not complete. Please check that the packaging image is clear and retry.'
      );
    } finally {
      isProcessingRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, selectedLang.tesseractCode]);
  // NOTE: panels/capturedImage/imagePreviewUrl are intentionally NOT in deps —
  // they are read via refs (panelsRef, capturedImageRef, imagePreviewUrlRef)
  // to avoid stale closures. The effect below re-runs when panels.length changes.

  useEffect(() => {
    // Guard: if context is empty, redirect to scan
    if (!capturedImageRef.current && panelsRef.current.length === 0) {
      navigate('/scan', { replace: true });
      return;
    }

    // Guard: prevent double-execution (React StrictMode, etc.)
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    runOcrPipeline();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panels.length, capturedImage, navigate, runOcrPipeline]);
  // panels.length and capturedImage trigger the effect when the session changes.
  // runOcrPipeline reads current values from refs, not stale closure values.

  const handleRetake = () => {
    clearImage();
    navigate('/scan');
  };

  const handleUploadAnother = () => {
    clearImage();
    navigate('/scan?mode=upload');
  };

  // ── Per-panel status icon ─────────────────────────────────────────────────
  const PanelStatusIcon: React.FC<{ status: PanelStatus }> = ({ status }) => {
    if (status === 'COMPLETED') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />;
    if (status === 'PROCESSING') return <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin flex-shrink-0" />;
    if (status === 'FAILED') return <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />;
    return <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />;
  };

  const panelStatusColor: Record<PanelStatus, string> = {
    PENDING: 'text-slate-500',
    PROCESSING: 'text-amber-400 font-bold',
    COMPLETED: 'text-white',
    FAILED: 'text-rose-400',
  };

  return (
    <div className="min-h-screen bg-[#06080e] text-slate-100 flex flex-col justify-between p-4 selection:bg-emerald-500 selection:text-black font-sans">
      <GlowBackground variant="subtle" />

      {/* Top Bar */}
      <header className="relative z-10 max-w-md mx-auto w-full pt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={handleRetake}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-medium py-1.5 px-3 rounded-full bg-white/[0.04] border border-white/[0.08] transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Cancel</span>
        </button>
        <span className="text-xs font-medium text-slate-400">
          Legal Metrology Screening
        </span>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center py-6">
        {/* 1. Empty OCR Result State */}
        {emptyOcr ? (
          <div className="w-full max-w-md bg-[#090d16] rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/[0.08] text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No readable text detected</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Tesseract.js scanned{' '}
              {panelProgress.length > 1 ? `all ${panelProgress.length} package panels` : 'the photograph'} but
              could not distinguish statutory characters. This commonly occurs if the label is out of
              focus or has reflective glare.
            </p>

            {imagePreviewUrl && (
              <div className="w-full h-36 rounded-2xl overflow-hidden bg-black/50 mb-6 border border-white/[0.08]">
                <img
                  src={imagePreviewUrl}
                  alt="Scanned image with no text detected"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  isProcessingRef.current = false;
                  runOcrPipeline();
                }}
                className="w-full py-3.5 bg-white text-slate-950 hover:bg-slate-100 text-xs font-semibold rounded-full flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-lg"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try again</span>
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="flex-1 py-3 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium rounded-full flex items-center justify-center gap-1.5 transition border border-white/[0.08] cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake</span>
                </button>
                <button
                  type="button"
                  onClick={handleUploadAnother}
                  className="flex-1 py-3 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium rounded-full flex items-center justify-center gap-1.5 transition border border-white/[0.08] cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload</span>
                </button>
              </div>
            </div>
          </div>
        ) : error ? (
          /* 2. Error State */
          <div className="w-full max-w-md bg-[#090d16] rounded-3xl p-6 sm:p-8 shadow-2xl border border-red-500/30 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Recognition interrupted</h3>
            <p className="text-xs text-slate-400 mb-6 bg-red-950/20 p-3 rounded-xl border border-red-500/20">
              {error}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  isProcessingRef.current = false;
                  runOcrPipeline();
                }}
                className="w-full py-3.5 bg-white text-slate-950 hover:bg-slate-100 text-xs font-semibold rounded-full flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-lg"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry recognition</span>
              </button>
              <button
                type="button"
                onClick={handleRetake}
                className="w-full py-3 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium rounded-full transition border border-white/[0.08] cursor-pointer"
              >
                Capture another photo
              </button>
            </div>
          </div>
        ) : (
          /* 3. Real-Time Processing Indicator */
          <div className="w-full max-w-md flex flex-col items-center gap-4">
            <ProcessingIndicator
              progress={progress}
              statusMessage={statusMessage}
              step={step}
            />

            {/* Per-Panel Status HUD */}
            {panelProgress.length > 1 && (
              <div className="w-full bg-[#090d16] border border-white/[0.08] rounded-2xl px-5 py-4 shadow-xl">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                  Screening {panelProgress.length} package panels
                </p>
                <div className="space-y-2.5">
                  {panelProgress.map((pp, idx) => (
                    <div
                      key={pp.panelId}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <PanelStatusIcon status={pp.status} />
                        <span className={`truncate ${panelStatusColor[pp.status]}`}>
                          Panel {idx + 1} · {pp.panelLabel}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 shrink-0">
                        {pp.status === 'COMPLETED' && pp.charCount !== undefined
                          ? `${pp.charCount} chars`
                          : pp.status === 'FAILED'
                          ? 'Failed'
                          : pp.status === 'PROCESSING'
                          ? 'Reading...'
                          : 'Waiting'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Single panel preview badge */}
            {panelProgress.length <= 1 && imagePreviewUrl && (
              <div className="flex items-center gap-3 bg-[#090d16] border border-white/[0.08] px-4 py-3 rounded-2xl shadow-lg">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-white/[0.08]">
                  <img
                    src={imagePreviewUrl}
                    alt="Packaging thumbnail"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-left text-xs">
                  <span className="font-medium text-white block">Evaluating packaging label</span>
                  <span className="text-slate-400 text-[11px]">
                    On-device Web Worker · Zero cloud upload
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-4 text-xs text-slate-500 border-t border-white/[0.08] flex items-center justify-center gap-1.5">
        <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
        <span>Tesseract.js & ZXing Barcode Detector · 100% Client-Side Evaluation</span>
      </footer>
    </div>
  );
};

export default Processing;
