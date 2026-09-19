import { OcrQuality } from './ocrQuality';
import type { OcrPipelineDiagnostic } from './ocrDiagnostics';

export type OcrProgressCallback = (progress: number, status: string) => void;

export interface OcrOptions {
  language?: string;
  maxAttempts?: number;
}

export interface OcrResult {
  text: string;
  confidence: number;
  quality: OcrQuality;
  language: string;
  attempts: number;
  preprocessingMode: 'standard' | 'high_contrast' | 'multi_scale_cascade';
  diagnostics?: OcrPipelineDiagnostic;
}

export interface OcrService {
  recognize(
    image: Blob | File,
    onProgress?: OcrProgressCallback,
    options?: OcrOptions
  ): Promise<string>;
  recognizeWithQuality?(
    image: Blob | File,
    onProgress?: OcrProgressCallback,
    options?: OcrOptions
  ): Promise<OcrResult>;
}

export type { OcrQuality };
