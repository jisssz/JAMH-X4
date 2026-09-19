/**
 * Pre-OCR Image Quality Gate and Physical Capture Guidance Analyzer.
 * Evaluates raw image characteristics BEFORE running expensive OCR passes.
 * Detects:
 * - Insufficient Resolution
 * - Blur / Defocus
 * - Specular Glare / Flash Overexposure
 * - Excessive Darkness / Underexposure
 * - Extreme Perspective / Skew
 * Returns actionable physical feedback prompts to guide users toward usable captures.
 */

export interface QualityMetrics {
  width: number;
  height: number;
  totalPixels: number;
  meanLuminance: number;
  glarePercentage: number;
  darknessPercentage: number;
  sharpnessScore: number;
  aspectRatio: number;
}

export interface CaptureGuidanceResult {
  isUsable: boolean;
  overallScore: number; // 0 to 100
  qualityLevel: 'EXCELLENT' | 'ACCEPTABLE' | 'POOR' | 'UNUSABLE';
  warnings: string[];
  actionableGuidance: string[];
  metrics: QualityMetrics;
}

/**
 * Evaluates image quality from an HTMLCanvasElement or ImageData.
 */
export function evaluateImageQualityFromData(
  imageData: ImageData,
  width: number,
  height: number
): CaptureGuidanceResult {
  const d = imageData.data;
  const totalPixels = width * height;

  let totalLum = 0;
  let glarePixels = 0;
  let darkPixels = 0;

  // Subsample step for speed on large images
  const step = Math.max(1, Math.floor(Math.sqrt(totalPixels) / 150));
  let sampledCount = 0;

  for (let i = 0; i < d.length; i += 4 * step) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    totalLum += lum;
    if (r > 240 && g > 240 && b > 240) glarePixels++;
    if (lum < 40) darkPixels++;
    sampledCount++;
  }

  const meanLuminance = sampledCount > 0 ? totalLum / sampledCount : 128;
  const glarePercentage = sampledCount > 0 ? (glarePixels / sampledCount) * 100 : 0;
  const darknessPercentage = sampledCount > 0 ? (darkPixels / sampledCount) * 100 : 0;

  // Fast Laplacian sharpness estimation (horizontal + vertical neighbor difference)
  let diffSum = 0;
  let diffCount = 0;
  const stride = width * 4;
  const sampleRows = Math.min(height - 2, 80);
  const rowStep = Math.max(1, Math.floor(height / sampleRows));

  for (let y = 1; y < height - 1; y += rowStep) {
    const rowOffset = y * stride;
    for (let x = 1; x < width - 1; x += step) {
      const idx = rowOffset + x * 4;
      const centerLum = 0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2];
      const rightLum = 0.299 * d[idx + 4] + 0.587 * d[idx + 5] + 0.114 * d[idx + 6];
      const bottomLum = 0.299 * d[idx + stride] + 0.587 * d[idx + stride + 1] + 0.114 * d[idx + stride + 2];
      diffSum += Math.abs(centerLum - rightLum) + Math.abs(centerLum - bottomLum);
      diffCount++;
    }
  }

  const sharpnessScore = diffCount > 0 ? diffSum / diffCount : 15;
  const aspectRatio = width / Math.max(height, 1);

  const warnings: string[] = [];
  const guidance: string[] = [];
  let score = 100;

  // 1. Resolution Check
  const minDimension = Math.min(width, height);
  if (minDimension < 200 || totalPixels < 150000) {
    warnings.push('Insufficient resolution for micro-print text');
    guidance.push('Move closer to the package to capture fine-print declarations.');
    score -= 35;
  } else if (minDimension < 450) {
    warnings.push('Low resolution declaration capture');
    guidance.push('Hold camera closer to the statutory declaration panel.');
    score -= 15;
  }

  // 2. Glare & Specular Reflection Check
  if (glarePercentage > 12) {
    warnings.push('Severe specular glare on packaging surface');
    guidance.push('Reduce glare: tilt the package slightly away from direct overhead light.');
    score -= 30;
  } else if (glarePercentage > 6) {
    warnings.push('Moderate surface reflection detected');
    guidance.push('Diffuse lighting to eliminate bright hot-spots on metallic/plastic foil.');
    score -= 12;
  }

  // 3. Darkness & Underexposure Check
  if (meanLuminance < 45 || darknessPercentage > 55) {
    warnings.push('Severe underexposure / dark lighting');
    guidance.push('Improve lighting: move to a well-lit area or turn on flashlight.');
    score -= 30;
  } else if (meanLuminance < 70) {
    warnings.push('Dim lighting detected');
    guidance.push('Increase lighting for better font contrast.');
    score -= 10;
  }

  // 4. Blur / Defocus Check
  if (sharpnessScore < 6.0) {
    warnings.push('High motion blur or optical defocus detected');
    guidance.push('Hold package steady and tap screen to refocus camera.');
    score -= 30;
  } else if (sharpnessScore < 9.5) {
    warnings.push('Soft focus detected');
    guidance.push('Ensure text is sharply focused before capturing.');
    score -= 10;
  }

  // 5. Extreme Perspective Check
  if (aspectRatio > 4.5 || aspectRatio < 0.22) {
    warnings.push('Extreme perspective skew / narrow crop');
    guidance.push('Hold package flat and align declaration box inside the frame.');
    score -= 15;
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  let qualityLevel: CaptureGuidanceResult['qualityLevel'] = 'EXCELLENT';
  if (finalScore < 35) qualityLevel = 'UNUSABLE';
  else if (finalScore < 60) qualityLevel = 'POOR';
  else if (finalScore < 80) qualityLevel = 'ACCEPTABLE';

  return {
    isUsable: finalScore >= 35,
    overallScore: finalScore,
    qualityLevel,
    warnings,
    actionableGuidance: guidance.length > 0 ? guidance : ['Packaging clarity is good for OCR analysis.'],
    metrics: {
      width,
      height,
      totalPixels,
      meanLuminance: Math.round(meanLuminance),
      glarePercentage: Math.round(glarePercentage * 10) / 10,
      darknessPercentage: Math.round(darknessPercentage * 10) / 10,
      sharpnessScore: Math.round(sharpnessScore * 10) / 10,
      aspectRatio: Math.round(aspectRatio * 100) / 100,
    },
  };
}

/**
 * Evaluates an image Blob or File using browser canvas.
 */
export async function evaluateImageQuality(imageFileOrBlob: Blob | File): Promise<CaptureGuidanceResult> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      isUsable: true,
      overallScore: 85,
      qualityLevel: 'ACCEPTABLE',
      warnings: [],
      actionableGuidance: ['Non-browser environment; bypass quality gate.'],
      metrics: {
        width: 1000,
        height: 1000,
        totalPixels: 1000000,
        meanLuminance: 128,
        glarePercentage: 0,
        darknessPercentage: 0,
        sharpnessScore: 15,
        aspectRatio: 1,
      },
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    let url: string | null = null;
    try {
      url = URL.createObjectURL(imageFileOrBlob);
    } catch {
      resolve({
        isUsable: false,
        overallScore: 0,
        qualityLevel: 'UNUSABLE',
        warnings: ['Unable to read image data'],
        actionableGuidance: ['Re-take photo with clear focus.'],
        metrics: { width: 0, height: 0, totalPixels: 0, meanLuminance: 0, glarePercentage: 0, darknessPercentage: 0, sharpnessScore: 0, aspectRatio: 1 },
      });
      return;
    }

    img.onload = () => {
      if (url) URL.revokeObjectURL(url);
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      // Downsample for fast analysis if image is gigantic
      const maxDim = 800;
      const scale = Math.min(1.0, maxDim / Math.max(width, height));
      const cW = Math.round(width * scale);
      const cH = Math.round(height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = cW;
      canvas.height = cH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({
          isUsable: true,
          overallScore: 75,
          qualityLevel: 'ACCEPTABLE',
          warnings: [],
          actionableGuidance: ['Proceeding with standard scan.'],
          metrics: { width, height, totalPixels: width * height, meanLuminance: 128, glarePercentage: 0, darknessPercentage: 0, sharpnessScore: 12, aspectRatio: width / height },
        });
        return;
      }

      ctx.drawImage(img, 0, 0, cW, cH);
      const imgData = ctx.getImageData(0, 0, cW, cH);
      const result = evaluateImageQualityFromData(imgData, width, height);
      resolve(result);
    };

    img.onerror = () => {
      if (url) URL.revokeObjectURL(url);
      resolve({
        isUsable: false,
        overallScore: 0,
        qualityLevel: 'UNUSABLE',
        warnings: ['Failed to load image file'],
        actionableGuidance: ['Re-take photo with clear focus.'],
        metrics: { width: 0, height: 0, totalPixels: 0, meanLuminance: 0, glarePercentage: 0, darknessPercentage: 0, sharpnessScore: 0, aspectRatio: 1 },
      });
    };

    img.src = url;
  });
}
