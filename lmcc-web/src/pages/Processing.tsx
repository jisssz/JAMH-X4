import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertCircle, HelpCircle, UploadCloud, RotateCcw } from 'lucide-react';
import { useImage } from '../context/ImageContext';
import { defaultOcrService } from '../services/ocr/TesseractOcrService';
import { getSelectedLanguage } from '../services/ocr/ocrLanguages';
import { parseLabel } from '../services/parser/fieldParser';
import { defaultRulesEngine } from '../services/rules/rulesEngine';
import { ProcessingIndicator } from '../components/ProcessingIndicator';

export const Processing: React.FC = () => {
  const navigate = useNavigate();
  const { capturedImage, imagePreviewUrl, clearImage } = useImage();

  const [step, setStep] = useState<'ocr' | 'parsing' | 'rules' | 'done'>('ocr');
  const [progress, setProgress] = useState(0.05);
  const [statusMessage, setStatusMessage] = useState('Initializing client OCR engine...');
  const [error, setError] = useState<string | null>(null);
  const [emptyOcr, setEmptyOcr] = useState(false);
  const selectedLang = getSelectedLanguage();

  const isProcessingRef = useRef(false);

  const runOcrPipeline = async () => {
    if (!capturedImage) return;

    setError(null);
    setEmptyOcr(false);
    setStep('ocr');
    setProgress(0.08);
    setStatusMessage(`Loading OCR engine (${selectedLang.label})...`);

    try {
      // 1. Real Client-side OCR via Tesseract.js with Quality Assessment & Multi-Pass Fallback
      const ocrResult = await defaultOcrService.recognizeWithQuality(
        capturedImage,
        (prog, msg) => {
          setProgress(prog);
          setStatusMessage(msg);
        },
        { language: selectedLang.tesseractCode }
      );

      const rawOcrText = ocrResult.text;

      // 2. Handle empty OCR result
      if (!rawOcrText || rawOcrText.trim().length === 0) {
        setEmptyOcr(true);
        return;
      }

      // 3. Field Parsing (Rules 6 mandatory declarations)
      setStep('parsing');
      setStatusMessage('Extracting mandatory label declarations...');
      setProgress(0.92);

      // Brief delay for smooth UI transition
      await new Promise((r) => setTimeout(r, 200));
      const extractedLabel = parseLabel(rawOcrText);

      // 4. Legal Metrology Rules Evaluation
      setStep('rules');
      setStatusMessage('Checking Legal Metrology (Packaged Commodities) Rules, 2011...');
      setProgress(0.98);

      await new Promise((r) => setTimeout(r, 150));
      const verdict = defaultRulesEngine.evaluate(extractedLabel);

      setStep('done');
      setProgress(1.0);
      setStatusMessage('Analysis complete! Opening results...');

      await new Promise((r) => setTimeout(r, 200));

      // Navigate to Results page with real data and OCR quality metrics
      navigate('/results', {
        replace: true,
        state: {
          extractedLabel,
          verdict,
          imageBlob: capturedImage,
          ocrQuality: ocrResult.quality,
          ocrConfidence: ocrResult.confidence,
          ocrLanguage: selectedLang.label,
          ocrAttempts: ocrResult.attempts,
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
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 flex flex-col justify-between p-4">
      {/* Top App Bar */}
      <header className="max-w-md mx-auto w-full pt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={handleRetake}
          className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 text-sm font-medium transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Cancel</span>
        </button>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          LMCC Automated Screening
        </span>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center py-6">
        {/* 1. Empty OCR Result State */}
        {emptyOcr ? (
          <div className="w-full max-w-md bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-200 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              No Readable Text Detected
            </h3>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Tesseract.js scanned the image but could not detect readable characters. This commonly occurs if the label is out of focus, has reflections/glare, or has text that is too distant.
            </p>

            {imagePreviewUrl && (
              <div className="w-full h-32 rounded-xl overflow-hidden bg-slate-900 mb-6 border border-slate-200">
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
                className="w-full py-3.5 bg-gov-700 hover:bg-gov-800 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retake Photo
                </button>
                <button
                  type="button"
                  onClick={handleUploadAnother}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Upload Image
                </button>
              </div>
            </div>
          </div>
        ) : error ? (
          /* 2. Error State */
          <div className="w-full max-w-md bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-red-100 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Recognition Interrupted</h3>
            <p className="text-xs text-slate-600 mb-6 bg-red-50 p-3 rounded-xl border border-red-100">
              {error}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={runOcrPipeline}
                className="w-full py-3.5 bg-gov-700 hover:bg-gov-800 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Recognition
              </button>
              <button
                type="button"
                onClick={handleRetake}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Capture Another Image
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
              <div className="mt-4 flex items-center gap-3 bg-white/80 backdrop-blur-sm border border-slate-200/80 px-4 py-2.5 rounded-2xl shadow-sm">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0">
                  <img
                    src={imagePreviewUrl}
                    alt="Packaging thumbnail"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-left text-xs">
                  <span className="font-semibold text-slate-800 block">Processing label photo</span>
                  <span className="text-slate-400">Local browser Web Worker</span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-3 text-xs text-slate-400 flex items-center justify-center gap-1.5">
        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
        <span>Tesseract.js runs 100% locally in your browser • Zero cloud upload</span>
      </footer>
    </div>
  );
};
