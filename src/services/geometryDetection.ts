// ============================================================================
// geometryDetection.ts — On-Device Check Positioning Worklet
//
// Runs inside a react-native-vision-camera frame processor (native thread).
// No API calls, no async — pure pixel math.
//
// Algorithm:
//   1. Sample every SKIP-th pixel (row + col) → ~8K samples at 1080p
//   2. Compute luminance from YUV (Y channel) or RGB (weighted sum)
//   3. Threshold at BRIGHT_THRESHOLD → binary bright map
//   4. Derive bounding box of bright region (the check paper)
//   5. Map coverage + centering → GuidanceState string
//
// Returns one of: no_check | too_far | too_close | too_left | too_right |
//                 too_high | too_low | blurry | good | perfect
// (matches GuidanceState enum values in src/types/index.ts)
// ============================================================================

import type { Frame } from 'react-native-vision-camera';

const SKIP = 16;                // Sample every 16th pixel (row and col)
const BRIGHT_THRESHOLD = 190;   // Luminance threshold (0-255). Checks are white/cream.
const MIN_BRIGHT_RATIO = 0.04;  // <4% bright pixels → no check visible
const ASPECT_MIN = 1.2;         // Minimum width:height ratio for a check
const ASPECT_MAX = 6.5;         // Maximum width:height ratio

/**
 * Analyzes a camera frame and returns a check positioning GuidanceState.
 *
 * IMPORTANT: This function is a worklet — it runs on the native/background thread.
 * - Must be called from a `useFrameProcessor` callback
 * - All dependencies must be constants or worklet-serializable closures
 * - No async operations, no React state access
 *
 * @param frame - The camera frame (YUV or RGB)
 * @returns GuidanceState string value (e.g. 'perfect', 'too_left')
 */
export function analyzeCheckInFrame(frame: Frame): string {
  'worklet';

  const width = frame.width;
  const height = frame.height;
  const bytesPerRow = frame.bytesPerRow;
  const isYUV = frame.pixelFormat === 'yuv';

  // Copy frame pixels to a typed array (GPU → CPU copy)
  const buffer = new Uint8Array(frame.toArrayBuffer());

  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  let brightCount = 0;
  let totalSampled = 0;

  // ── Pixel sampling loop ───────────────────────────────────────────────────
  for (let row = 0; row < height; row += SKIP) {
    for (let col = 0; col < width; col += SKIP) {
      let luma: number;

      if (isYUV) {
        // NV12 / NV21: Y (luminance) plane is the first width×height bytes.
        // bytesPerRow accounts for row stride (may include padding).
        luma = buffer[row * bytesPerRow + col];
      } else {
        // RGB / RGBA / BGRA — 4 bytes per pixel on iOS (BGRA), Android (RGBA).
        // Weighted luminance; channel order varies by platform but the
        // threshold is forgiving enough that the difference doesn't matter.
        const base = row * bytesPerRow + col * 4;
        luma = 0.299 * buffer[base] + 0.587 * buffer[base + 1] + 0.114 * buffer[base + 2];
      }

      totalSampled++;

      if (luma > BRIGHT_THRESHOLD) {
        brightCount++;
        if (col < minX) minX = col;
        if (col > maxX) maxX = col;
        if (row < minY) minY = row;
        if (row > maxY) maxY = row;
      }
    }
  }

  // ── Guard: not enough bright pixels → no check ───────────────────────────
  const brightRatio = brightCount / Math.max(totalSampled, 1);
  if (brightRatio < MIN_BRIGHT_RATIO || maxX <= minX || maxY <= minY) {
    return 'no_check';
  }

  // ── Aspect ratio sanity check ─────────────────────────────────────────────
  const regionW = maxX - minX;
  const regionH = Math.max(maxY - minY, 1);
  const aspectRatio = regionW / regionH;
  if (aspectRatio < ASPECT_MIN || aspectRatio > ASPECT_MAX) {
    // Bright region doesn't look like a check (e.g. a wall, floor)
    return 'no_check';
  }

  // ── Coverage: region area vs full frame area ──────────────────────────────
  const frameArea = width * height;
  const coverage = (regionW * regionH) / frameArea;

  if (coverage < 0.18) return 'too_far';
  if (coverage > 0.87) return 'too_close';

  // ── Centering: offset of bright-region center from frame center ───────────
  const regionCenterX = (minX + maxX) / 2;
  const regionCenterY = (minY + maxY) / 2;
  const frameCenterX = width / 2;
  const frameCenterY = height / 2;

  const offsetX = (regionCenterX - frameCenterX) / width;   // negative = left
  const offsetY = (regionCenterY - frameCenterY) / height;  // negative = high

  const absOffsetX = offsetX < 0 ? -offsetX : offsetX;
  const absOffsetY = offsetY < 0 ? -offsetY : offsetY;

  // Horizontal off-center
  if (absOffsetX > 0.12) {
    return offsetX < 0 ? 'too_left' : 'too_right';
  }

  // Vertical off-center
  if (absOffsetY > 0.12) {
    return offsetY < 0 ? 'too_high' : 'too_low';
  }

  // ── Perfect: good coverage, well-centered ─────────────────────────────────
  if (coverage >= 0.38 && coverage <= 0.78 && absOffsetX < 0.07 && absOffsetY < 0.07) {
    return 'perfect';
  }

  // ── Good: mostly correct but small correction still needed ────────────────
  return 'good';
}
