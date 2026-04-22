// ============================================================================
// snapshotAnalysis.ts — On-device check positioning from JPEG snapshot
//
// Called from CheckCaptureScreen every ~1.5 s via camera.takeSnapshot().
// Runs entirely on the JS thread — no frame processor, no native worklet.
//
// Pipeline:
//   1. Resize snapshot to 160×120 for predictable cost
//   2. Decode JPEG into RGBA and convert to grayscale
//   3. Mild blur + edge map + bright document mask
//   4. Connected-component candidate search
//   5. Score candidates using coverage, aspect ratio, rectangularity,
//      edge strength, centering, ROI overlap, and sharpness
//   6. Return a richer guidance result for voice/haptic/autocapture logic
// ============================================================================

import * as ImageManipulator from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';

const ANALYSIS_WIDTH = 160;
const ANALYSIS_HEIGHT = 120;

const TARGET_ASPECT = 2.18;
const MIN_COMPONENT_PIXELS = 160;
const MIN_COVERAGE = 0.08;
const MAX_COVERAGE = 0.97;
const BLURRY_SHARPNESS_THRESHOLD = 12;

export type SnapshotGuidance =
  | 'no_check'
  | 'too_far'
  | 'too_close'
  | 'too_left'
  | 'too_right'
  | 'too_high'
  | 'too_low'
  | 'too_bright'
  | 'too_dark'
  | 'blurry'
  | 'good'
  | 'perfect'
  | 'analysis_failed';

export type SnapshotGuideRoi = {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
};

export interface SnapshotAnalysisMetrics {
  coverage: number;
  aspectRatio: number;
  offsetX: number;
  offsetY: number;
  confidence: number;
  sharpness: number;
  rectangularity: number;
  edgeStrength: number;
  roiOverlap: number;
  brightness: number;
  detectionMode: 'contour' | 'fallback_bright' | 'none';
  candidateCount: number;
  bboxLeft: number;
  bboxTop: number;
  bboxRight: number;
  bboxBottom: number;
}

export interface SnapshotAnalysisResult {
  guidance: SnapshotGuidance;
  confidence: number;
  metrics: SnapshotAnalysisMetrics;
  reason:
    | 'lighting'
    | 'no_candidate'
    | 'searching'
    | 'too_small'
    | 'too_large'
    | 'off_center'
    | 'blurry'
    | 'aligned'
    | 'stable';
}

export const SNAPSHOT_GUIDANCE_TTS: Record<SnapshotGuidance, string> = {
  no_check: 'Find the check.',
  too_far: 'Move closer.',
  too_close: 'Move higher.',
  too_left: 'Move right.',
  too_right: 'Move left.',
  too_high: 'Move forward.',
  too_low: 'Move back.',
  too_bright: 'Too bright. Shade the check.',
  too_dark: 'Too dark. Find more light.',
  blurry: 'Hold steady.',
  good: 'Hold steady.',
  perfect: 'Aligned. Hold steady.',
  analysis_failed: '',
};

export const SNAPSHOT_GUIDANCE_LABEL: Record<SnapshotGuidance, string> = {
  no_check: 'Position check in frame',
  too_far: 'Lower the phone ↓',
  too_close: 'Raise the phone ↑',
  too_left: '← Move right',
  too_right: 'Move left →',
  too_high: 'Move forward ↑',
  too_low: 'Move back ↓',
  too_bright: 'Too bright — shade slightly',
  too_dark: 'Too dark — find more light',
  blurry: 'Hold still for focus',
  good: 'Hold still…',
  perfect: '✓ Aligned — hold steady',
  analysis_failed: '',
};

const DEFAULT_RESULT: SnapshotAnalysisResult = {
  guidance: 'analysis_failed',
  confidence: 0,
  reason: 'no_candidate',
  metrics: {
    coverage: 0,
    aspectRatio: 0,
    offsetX: 0,
    offsetY: 0,
    confidence: 0,
    sharpness: 0,
    rectangularity: 0,
    edgeStrength: 0,
    roiOverlap: 0,
    brightness: 0,
    detectionMode: 'none',
    candidateCount: 0,
    bboxLeft: 0,
    bboxTop: 0,
    bboxRight: 0,
    bboxBottom: 0,
  },
};

export async function analyzeSnapshotUri(
  uri: string,
  roi: SnapshotGuideRoi = { centerX: 0.5, centerY: 0.5, width: 0.62, height: 0.88 }
): Promise<SnapshotAnalysisResult> {
  try {
    const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`;
    const { base64 } = await ImageManipulator.manipulateAsync(
      fileUri,
      [{ resize: { width: ANALYSIS_WIDTH, height: ANALYSIS_HEIGHT } }],
      { format: ImageManipulator.SaveFormat.JPEG, base64: true, compress: 0.6 }
    );

    if (!base64) return DEFAULT_RESULT;

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const { data, width, height } = jpeg.decode(bytes, {
      useTArray: true,
      tolerantDecoding: true,
    });

    return analyzePixels(data as Uint8Array, width, height, roi);
  } catch (e) {
    console.warn('[snapshotAnalysis] error:', e);
    return DEFAULT_RESULT;
  }
}

function analyzePixels(
  data: Uint8Array,
  width: number,
  height: number,
  roi: SnapshotGuideRoi
): SnapshotAnalysisResult {
  const pixelCount = width * height;
  const grayscale = new Float32Array(pixelCount);
  const roiBounds = normalizedRoiToBounds(width, height, roi);

  let totalLuma = 0;
  for (let i = 0; i < pixelCount; i++) {
    const base = i * 4;
    const luma = 0.299 * data[base] + 0.587 * data[base + 1] + 0.114 * data[base + 2];
    grayscale[i] = luma;
    totalLuma += luma;
  }

  const avgBrightness = totalLuma / Math.max(pixelCount, 1);
  if (avgBrightness > 220) return makeLightingResult('too_bright', avgBrightness);
  if (avgBrightness < 40) return makeLightingResult('too_dark', avgBrightness);

  const blurred = boxBlur3x3(grayscale, width, height);
  const edgeMap = new Float32Array(pixelCount);
  let totalEdge = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const gx = blurred[i + 1] - blurred[i - 1];
      const gy = blurred[i + width] - blurred[i - width];
      const mag = Math.abs(gx) + Math.abs(gy);
      edgeMap[i] = mag;
      totalEdge += mag;
    }
  }

  const avgEdge = totalEdge / Math.max((width - 2) * (height - 2), 1);
  const edgeThreshold = Math.max(14, avgEdge * 1.15);
  const brightThreshold = Math.max(100, avgBrightness + 8);
  const documentMask = new Uint8Array(pixelCount);

  for (let i = 0; i < pixelCount; i++) {
    const isBright = blurred[i] >= brightThreshold;
    const nearEdge = edgeMap[i] >= edgeThreshold;
    documentMask[i] = isBright || (nearEdge && blurred[i] >= avgBrightness) ? 1 : 0;
  }

  closeBinaryMask(documentMask, width, height);

  const contourResult = findBestCandidate(documentMask, blurred, edgeMap, width, height, roiBounds, avgBrightness);
  const candidate = contourResult.best ?? findFallbackBrightCandidate(blurred, width, height, roiBounds, avgBrightness);
  if (!candidate) {
    return {
      guidance: 'no_check',
      confidence: 0,
      reason: 'searching',
      metrics: {
        ...DEFAULT_RESULT.metrics,
        brightness: avgBrightness,
        candidateCount: contourResult.candidateCount,
      },
    };
  }

  const coverage = candidate.coverage;
  const offsetX = candidate.offsetX;
  const offsetY = candidate.offsetY;
  const absX = Math.abs(offsetX);
  const absY = Math.abs(offsetY);

  let guidance: SnapshotGuidance = 'good';
  let reason: SnapshotAnalysisResult['reason'] = 'aligned';

  if (candidate.sharpness < BLURRY_SHARPNESS_THRESHOLD && candidate.confidence > 0.5) {
    guidance = 'blurry';
    reason = 'blurry';
  } else if (coverage < MIN_COVERAGE) {
    guidance = 'too_far';
    reason = 'too_small';
  } else if (coverage > MAX_COVERAGE) {
    guidance = 'too_close';
    reason = 'too_large';
  } else if (absX > 0.14) {
    guidance = offsetX < 0 ? 'too_left' : 'too_right';
    reason = 'off_center';
  } else if (absY > 0.14) {
    guidance = offsetY < 0 ? 'too_high' : 'too_low';
    reason = 'off_center';
  } else if (
    candidate.confidence >= 0.62 &&
    candidate.roiOverlap >= 0.58 &&
    coverage >= 0.16 &&
    coverage <= 0.90 &&
    absX < 0.09 &&
    absY < 0.09 &&
    candidate.sharpness >= BLURRY_SHARPNESS_THRESHOLD
  ) {
    guidance = 'perfect';
    reason = 'stable';
  } else if (candidate.confidence < 0.38 && candidate.roiOverlap < 0.28) {
    guidance = 'no_check';
    reason = 'searching';
  }

  return {
    guidance,
    confidence: candidate.confidence,
    reason,
    metrics: {
      coverage,
      aspectRatio: candidate.aspectRatio,
      offsetX,
      offsetY,
      confidence: candidate.confidence,
      sharpness: candidate.sharpness,
      rectangularity: candidate.rectangularity,
      edgeStrength: candidate.edgeStrength,
      roiOverlap: candidate.roiOverlap,
      brightness: avgBrightness,
      detectionMode: candidate.detectionMode,
      candidateCount: contourResult.candidateCount,
      bboxLeft: candidate.minX / width,
      bboxTop: candidate.minY / height,
      bboxRight: candidate.maxX / width,
      bboxBottom: candidate.maxY / height,
    },
  };
}

function makeLightingResult(guidance: 'too_bright' | 'too_dark', brightness: number): SnapshotAnalysisResult {
  return {
    guidance,
    confidence: 0,
    reason: 'lighting',
    metrics: {
      ...DEFAULT_RESULT.metrics,
      brightness,
    },
  };
}

function boxBlur3x3(source: Float32Array, width: number, height: number): Float32Array {
  const out = new Float32Array(source.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;

      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= width) continue;
          sum += source[yy * width + xx];
          count++;
        }
      }

      out[y * width + x] = sum / Math.max(count, 1);
    }
  }

  return out;
}

function closeBinaryMask(mask: Uint8Array, width: number, height: number): void {
  const dilated = new Uint8Array(mask.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let on = 0;
      for (let dy = -1; dy <= 1 && !on; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= width) continue;
          if (mask[yy * width + xx]) {
            on = 1;
            break;
          }
        }
      }
      dilated[y * width + x] = on;
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let on = 1;
      for (let dy = -1; dy <= 1 && on; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= width) continue;
          if (!dilated[yy * width + xx]) {
            on = 0;
            break;
          }
        }
      }
      mask[y * width + x] = on;
    }
  }
}

type Candidate = {
  confidence: number;
  coverage: number;
  aspectRatio: number;
  offsetX: number;
  offsetY: number;
  sharpness: number;
  rectangularity: number;
  edgeStrength: number;
  roiOverlap: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  detectionMode: 'contour' | 'fallback_bright';
};

function findBestCandidate(
  mask: Uint8Array,
  grayscale: Float32Array,
  edgeMap: Float32Array,
  width: number,
  height: number,
  roiBounds: { minX: number; minY: number; maxX: number; maxY: number },
  avgBrightness: number
): { best: Candidate | null; candidateCount: number } {
  const visited = new Uint8Array(mask.length);
  const queueX = new Int16Array(mask.length);
  const queueY = new Int16Array(mask.length);

  let best: Candidate | null = null;
  let candidateCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const start = y * width + x;
      if (!mask[start] || visited[start]) continue;

      let head = 0;
      let tail = 0;
      queueX[tail] = x;
      queueY[tail] = y;
      tail++;
      visited[start] = 1;

      let pixels = 0;
      let sumX = 0;
      let sumY = 0;
      let minX = width;
      let maxX = 0;
      let minY = height;
      let maxY = 0;

      while (head < tail) {
        const cx = queueX[head];
        const cy = queueY[head];
        head++;
        const idx = cy * width + cx;

        pixels++;
        sumX += cx;
        sumY += cy;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        for (let dy = -1; dy <= 1; dy++) {
          const ny = cy + dy;
          if (ny < 0 || ny >= height) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = cx + dx;
            if (nx < 0 || nx >= width) continue;
            const nIdx = ny * width + nx;
            if (!mask[nIdx] || visited[nIdx]) continue;
            visited[nIdx] = 1;
            queueX[tail] = nx;
            queueY[tail] = ny;
            tail++;
          }
        }
      }

      if (pixels < MIN_COMPONENT_PIXELS) continue;

      const bboxW = Math.max(maxX - minX + 1, 1);
      const bboxH = Math.max(maxY - minY + 1, 1);
      const bboxArea = bboxW * bboxH;
      const coverage = bboxArea / (width * height);
      const aspectRaw = bboxW / bboxH;
      const aspectRatio = aspectRaw >= 1 ? aspectRaw : 1 / Math.max(aspectRaw, 0.001);
      const rectangularity = pixels / Math.max(bboxArea, 1);
      const centerX = sumX / Math.max(pixels, 1);
      const centerY = sumY / Math.max(pixels, 1);

      const overlapArea = intersectionArea(minX, minY, maxX, maxY, roiBounds.minX, roiBounds.minY, roiBounds.maxX, roiBounds.maxY);
      const roiOverlap = overlapArea / Math.max(bboxArea, 1);

      const roiCenterX = (roiBounds.minX + roiBounds.maxX) / 2;
      const roiCenterY = (roiBounds.minY + roiBounds.maxY) / 2;
      const offsetX = (centerX - roiCenterX) / width;
      const offsetY = (centerY - roiCenterY) / height;

      const edgeStrength = averageBorderEdge(edgeMap, minX, minY, maxX, maxY, width);
      const sharpness = estimateSharpness(grayscale, minX, minY, maxX, maxY, width);
      const interiorBrightness = averageBrightness(grayscale, minX, minY, maxX, maxY, width);

      const aspectScore = clamp01(1 - Math.abs(aspectRatio - TARGET_ASPECT) / 1.45);
      const rectangularityScore = clamp01((rectangularity - 0.30) / 0.55);
      const coverageScore = coverage < 0.14
        ? clamp01(coverage / 0.14)
        : clamp01(1 - Math.abs(coverage - 0.48) / 0.58);
      const centeringScore = clamp01(1 - (Math.abs(offsetX) * 2.8 + Math.abs(offsetY) * 2.8));
      const edgeScore = clamp01(edgeStrength / 36);
      const sharpnessScore = clamp01(sharpness / 24);
      const brightnessScore = clamp01((interiorBrightness - avgBrightness + 28) / 78);
      const roiScore = clamp01((roiOverlap - 0.08) / 0.72);

      const confidence = clamp01(
        aspectScore * 0.18 +
        rectangularityScore * 0.18 +
        coverageScore * 0.15 +
        centeringScore * 0.17 +
        edgeScore * 0.08 +
        sharpnessScore * 0.08 +
        brightnessScore * 0.04 +
        roiScore * 0.12
      );

      if (aspectRatio < 1.15 || aspectRatio > 4.3 || rectangularity < 0.24) continue;

      const candidate: Candidate = {
        confidence,
        coverage,
        aspectRatio,
        offsetX,
        offsetY,
        sharpness,
        rectangularity,
        edgeStrength,
        roiOverlap,
        minX,
        minY,
        maxX,
        maxY,
        detectionMode: 'contour',
      };

      candidateCount++;
      if (!best || candidate.confidence > best.confidence) {
        best = candidate;
      }
    }
  }

  return { best, candidateCount };
}

function findFallbackBrightCandidate(
  grayscale: Float32Array,
  width: number,
  height: number,
  roiBounds: { minX: number; minY: number; maxX: number; maxY: number },
  avgBrightness: number
): Candidate | null {
  const threshold = Math.max(112, avgBrightness + 12);

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let brightCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const luma = grayscale[y * width + x];
      if (luma < threshold) continue;
      brightCount++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (!brightCount || maxX <= minX || maxY <= minY) return null;

  const bboxW = maxX - minX + 1;
  const bboxH = maxY - minY + 1;
  const bboxArea = bboxW * bboxH;
  const coverage = bboxArea / (width * height);
  const aspectRaw = bboxW / Math.max(bboxH, 1);
  const aspectRatio = aspectRaw >= 1 ? aspectRaw : 1 / Math.max(aspectRaw, 0.001);
  const rectangularity = brightCount / Math.max(bboxArea, 1);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const roiCenterX = (roiBounds.minX + roiBounds.maxX) / 2;
  const roiCenterY = (roiBounds.minY + roiBounds.maxY) / 2;
  const offsetX = (centerX - roiCenterX) / width;
  const offsetY = (centerY - roiCenterY) / height;
  const overlapArea = intersectionArea(minX, minY, maxX, maxY, roiBounds.minX, roiBounds.minY, roiBounds.maxX, roiBounds.maxY);
  const roiOverlap = overlapArea / Math.max(bboxArea, 1);
  const sharpness = estimateSharpness(grayscale, minX, minY, maxX, maxY, width);
  const brightness = averageBrightness(grayscale, minX, minY, maxX, maxY, width);

  const confidence = clamp01(
    clamp01(1 - Math.abs(aspectRatio - TARGET_ASPECT) / 1.55) * 0.24 +
    clamp01((coverage - 0.06) / 0.24) * 0.18 +
    clamp01((roiOverlap - 0.16) / 0.64) * 0.26 +
    clamp01(1 - (Math.abs(offsetX) * 2.1 + Math.abs(offsetY) * 2.1)) * 0.20 +
    clamp01((brightness - avgBrightness + 24) / 60) * 0.06 +
    clamp01(sharpness / 22) * 0.06
  );

  if (coverage < 0.08 || aspectRatio < 1.1 || aspectRatio > 4.5 || roiOverlap < 0.12) {
    return null;
  }

  return {
    confidence,
    coverage,
    aspectRatio,
    offsetX,
    offsetY,
    sharpness,
    rectangularity,
    edgeStrength: 0,
    roiOverlap,
    minX,
    minY,
    maxX,
    maxY,
    detectionMode: 'fallback_bright',
  };
}

function normalizedRoiToBounds(width: number, height: number, roi: SnapshotGuideRoi) {
  const roiW = Math.max(1, Math.round(width * Math.min(roi.width * 1.08, 0.98)));
  const roiH = Math.max(1, Math.round(height * Math.min(roi.height * 1.04, 0.98)));
  const cx = width * roi.centerX;
  const cy = height * roi.centerY;

  return {
    minX: Math.max(0, Math.round(cx - roiW / 2)),
    minY: Math.max(0, Math.round(cy - roiH / 2)),
    maxX: Math.min(width - 1, Math.round(cx + roiW / 2)),
    maxY: Math.min(height - 1, Math.round(cy + roiH / 2)),
  };
}

function averageBorderEdge(
  edgeMap: Float32Array,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  width: number
): number {
  let sum = 0;
  let count = 0;

  for (let x = minX; x <= maxX; x++) {
    sum += edgeMap[minY * width + x] + edgeMap[maxY * width + x];
    count += 2;
  }
  for (let y = minY + 1; y < maxY; y++) {
    sum += edgeMap[y * width + minX] + edgeMap[y * width + maxX];
    count += 2;
  }

  return sum / Math.max(count, 1);
}

function estimateSharpness(
  grayscale: Float32Array,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  width: number
): number {
  let sum = 0;
  let count = 0;

  for (let y = Math.max(minY + 1, 1); y <= Math.min(maxY - 1, Math.floor(grayscale.length / width) - 2); y++) {
    for (let x = Math.max(minX + 1, 1); x <= Math.min(maxX - 1, width - 2); x++) {
      const i = y * width + x;
      const lap =
        grayscale[i - width] +
        grayscale[i - 1] +
        grayscale[i + 1] +
        grayscale[i + width] -
        grayscale[i] * 4;
      sum += Math.abs(lap);
      count++;
    }
  }

  return sum / Math.max(count, 1);
}

function averageBrightness(
  grayscale: Float32Array,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  width: number
): number {
  let sum = 0;
  let count = 0;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      sum += grayscale[y * width + x];
      count++;
    }
  }
  return sum / Math.max(count, 1);
}

function intersectionArea(
  minX1: number,
  minY1: number,
  maxX1: number,
  maxY1: number,
  minX2: number,
  minY2: number,
  maxX2: number,
  maxY2: number
): number {
  const overlapW = Math.max(0, Math.min(maxX1, maxX2) - Math.max(minX1, minX2) + 1);
  const overlapH = Math.max(0, Math.min(maxY1, maxY2) - Math.max(minY1, minY2) + 1);
  return overlapW * overlapH;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
