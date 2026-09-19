import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertCircle, HelpCircle, UploadCloud, RotateCcw } from 'lucide-react';
import { useImage } from '../context/ImageContext';
import { defaultOcrService } from '../services/ocr/TesseractOcrService';
import { getSelectedLanguage } from '../services/ocr/ocrLanguages';
import { parseLabel } from '../services/parser/fieldParser';
import { mergeMultiPanelDeclarations, PanelOcrInput } from '../services/parser/multiPanelMerger';
import { defaultRulesEngine } from '../services/rules/rulesEngine';
import { ProcessingIndicator } from '../components/ProcessingIndicator';
import GlowBackground from '../components/ui/GlowBackground';

export const Processing: React.FC = () => {
  const navigate = useNavigate();
  const { capturedImage, imagePreviewUrl, clearImage, panels } = useImage();

  const [step, setStep] = useState<'ocr' | 'parsing' | 'rules' | 'done'>('ocr');
  const [progress, setProgress] = useState(0.05);
  const [statusMessage, setStatusMessage] = useState('Initializing client OCR engine...');
  const [error, setError] = useState<string | null>(null);
  const [emptyOcr, setEmptyOcr] = useState(false);
  const selectedLang = getSelectedLanguage();

  const isProcessingRef = useRef(false);

  const runOcrPipeline = async () => {
    if (!capturedImage && panels.length === 0) return;

    setError(null);
    setEmptyOcr(false);
    setStep('ocr');
    setProgress(0.08);

    try {
      if (panels.length > 1) {
        // Multi-Panel OCR Pipeline
        const panelInputs: PanelOcrInput[] = [];

        for (let idx = 0; idx < panels.length; idx++) {
          const panel = panels[idx];
          setStatusMessage(`Scanning panel ${idx + 1} of ${panels.length}: ${panel.label}...`);

          const panelOcr = await defaultOcrService.recognizeWithQuality(
            panel.blob,
            (prog, msg) => {
              const base = idx / panels.length;
              const slice = 1 / panels.length;
              setProgress(base * 0.85 + prog * slice * 0.85);
              setStatusMessage(`Panel ${idx + 1}/${panels.length} (${panel.label}): ${msg}`);
            },
            { language: selectedLang.tesseractCode }
          );

          panelInputs.push({
            panelId: panel.id,
            panelType: panel.type,
            panelLabel: panel.label,
            rawText: panelOcr.text || '',
            confidence: panelOcr.confidence,
            quality: panelOcr.quality,
          });
        }

        const merged = mergeMultiPanelDeclarations(panelInputs);

        if (!merged.unifiedRawText || merged.unifiedRawText.trim().length === 0) {
          setEmptyOcr(true);
          return;
        }

        setStep('parsing');
        setStatusMessage('Merging multi-panel declarations & cross-checking consistency...');
        setProgress(0.92);
        await new Promise((r) => setTimeout(r, 200));

        setStep('rules');
        setStatusMessage('Evaluating Legal Metrology Rule 6 across panels...');
        setProgress(0.98);
        await new Promise((r) => setTimeout(r, 150));

        const verdict = defaultRulesEngine.evaluate(merged.unifiedLabel);

        // Phase 6 Safety: If panels conflict on price, dates, or quantity, strictly mandate REVIEW
        if (merged.hasConflict) {
          verdict.overallStatus = 'REVIEW';
          verdict.summary = 'Needs Review: Conflicting statutory declarations detected across package panels.';
          for (const conflictMsg of merged.conflictDetails) {
            verdict.potentialViolations.unshift({
              ruleId: 'MULTI_PANEL_CONFLICT',
              field: 'conflict',
              title: 'Multi-Panel Declaration Discrepancy',
              severity: 'high',
              explanation: conflictMsg,
              evidence: conflictMsg,
              recommendation: 'The packaging panels display conflicting statutory values. Inspection required.',
              source: 'Multi-Panel Screening Cross-Check',
              gazetteReference: 'Rule 6 Consistency across Package Faces',
            });
          }
        }

        setStep('done');
        setProgress(1.0);
        setStatusMessage('Unified package analysis complete! Opening results...');
        await new Promise((r) => setTimeout(r, 200));

        navigate('/results', {
          replace: true,
          state: {
            extractedLabel: merged.unifiedLabel,
            verdict,
            imageBlob: panels[0]?.blob || capturedImage,
            ocrQuality: merged.overallQuality,
            ocrConfidence: merged.averageConfidence,
            ocrLanguage: selectedLang.label,
            ocrAttempts: panels.length,
            multiPanelResult: merged,
            isMultiPanel: true,
          },
        });
      } else {
        // Single Image OCR Pipeline
        const activeBlob = panels[0]?.blob || capturedImage;
        if (!activeBlob) return;

        setStatusMessage(`Loading OCR engine (${selectedLang.label})...`);
        const ocrResult = await defaultOcrService.recognizeWithQuality(
          activeBlob,
          (prog, msg) => {
            setProgress(prog);
            setStatusMessage(msg);
          },
          { language: selectedLang.tesseractCode }
        );

        const rawOcrText = ocrResult.text;

        if (!rawOcrText || rawOcrText.trim().length === 0) {
          setEmptyOcr(true);
          return;
        }

        setStep('parsing');
        setStatusMessage('Detecting mandatory label declarations...');
        setProgress(0.92);
        await new Promise((r) => setTimeout(r, 200));
        const extractedLabel = parseLabel(rawOcrText);

        setStep('rules');
        setStatusMessage('Checking Legal Metrology (Packaged Commodities) Rules, 2011...');
        setProgress(0.98);
        await new Promise((r) => setTimeout(r, 150));
        const verdict = defaultRulesEngine.evaluate(extractedLabel);

        setStep('done');
        setProgress(1.0);
        setStatusMessage('Analysis complete! Opening results...');
        await new Promise((r) => setTimeout(r, 200));

        navigate('/results', {
          replace: true,
          state: {
            extractedLabel,
            verdict,
            imageBlob: activeBlob,
            ocrQuality: ocrResult.quality,
            ocrConfidence: ocrResult.confidence,
            ocrLanguage: selectedLang.label,
            ocrAttempts: ocrResult.attempts,
            isMultiPanel: false,
          },
        });
      }
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
  };

  useEffect(() => {
    if (!capturedImage) {
      navigate('/scan', { replace: true });
      return;
    }

    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    runOcrPipeline();
  }, [capturedImage, navigate]);

  const handleRetake = () => {
    clearImage();
    navigate('/scan');
  };

  const handleUploadAnother = () => {
    clearImage();
    navigate('/scan?mode=upload');
  };

  return (
    <div className="min-h-screen bg-[#05070b] text-slate-100 flex flex-col justify-between p-4 selection:bg-emerald-500 selection:text-black">
      <GlowBackground variant="subtle" />

      {/* Top App Bar */}
      <header className="relative z-10 max-w-md mx-auto w-full pt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={handleRetake}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-mono font-semibold py-1.5 px-3 rounded-full bg-white/5 border border-white/10 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>CANCEL</span>
        </button>
        <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
          LMCC Automated Screening
        </span>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center py-6">
        {/* 1. Empty OCR Result State */}
        {emptyOcr ? (
          <div className="w-full max-w-md bg-slate-900/90 rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10 text-center backdrop-blur-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              No Readable Text Detected
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed font-mono">
              Tesseract.js scanned the image but could not detect readable characters. This commonly occurs if the label is out of focus, has reflections/glare, or has text that is too distant.
            </p>

            {imagePreviewUrl && (
              <div className="w-full h-36 rounded-2xl overflow-hidden bg-black mb-6 border border-white/10">
                <img
                  src={imagePreviewUrl}
                  alt="Scanned image with no text detected"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={runOcrPipeline}
                className="w-full py-3.5 bg-white text-slate-950 hover:bg-slate-100 text-xs font-bold rounded-full flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.3)] transition active:scale-95 cursor-pointer font-mono"
              >
                <RefreshCw className="w-4 h-4" />
                TRY AGAIN
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-full flex items-center justify-center gap-1.5 transition border border-white/10 cursor-pointer font-mono"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  RETAKE
                </button>
                <button
                  type="button"
                  onClick={handleUploadAnother}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-full flex items-center justify-center gap-1.5 transition border border-white/10 cursor-pointer font-mono"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  UPLOAD
                </button>
              </div>
            </div>
          </div>
        ) : error ? (
          /* 2. Error State */
          <div className="w-full max-w-md bg-slate-900/90 rounded-3xl p-6 sm:p-8 shadow-2xl border border-red-500/30 text-center backdrop-blur-2xl">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Recognition Interrupted</h3>
            <p className="text-xs text-slate-400 mb-6 bg-red-950/30 p-3 rounded-xl border border-red-500/20 font-mono">
              {error}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={runOcrPipeline}
                className="w-full py-3.5 bg-white text-slate-950 hover:bg-slate-100 text-xs font-bold rounded-full flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer font-mono"
              >
                <RefreshCw className="w-4 h-4" />
                RETRY RECOGNITION
              </button>
              <button
                type="button"
                onClick={handleRetake}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-full transition border border-white/10 cursor-pointer font-mono"
              >
                CAPTURE ANOTHER IMAGE
              </button>
            </div>
          </div>
        ) : (
          /* 3. Real-Time Processing Indicator */
          <div className="w-full max-w-md flex flex-col items-center">
            <ProcessingIndicator
              progress={progress}
              statusMessage={statusMessage}
              step={step}
            />

            {/* Thumbnail Preview below progress */}
            {imagePreviewUrl && (
              <div className="mt-5 flex items-center gap-3 bg-slate-900/80 backdrop-blur-xl border border-white/10 px-4 py-2.5 rounded-2xl shadow-lg">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-white/10">
                  <img
                    src={imagePreviewUrl}
                    alt="Packaging thumbnail"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-left text-xs font-mono">
                  <span className="font-semibold text-white block">Processing label photo</span>
                  <span className="text-slate-400 text-[11px]">Local browser Web Worker</span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-3 text-xs text-slate-500 flex items-center justify-center gap-1.5 font-mono">
        <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
        <span>Tesseract.js runs 100% locally in your browser • Zero cloud upload</span>
      </footer>
    </div>
  );
};

export default Processing;
