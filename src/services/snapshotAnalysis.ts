// ============================================================================
// snapshotAnalysis.ts — On-device check positioning from JPEG snapshot
//
// Called from CheckCaptureScreen every 1.5 s via camera.takeSnapshot().
// Runs entirely on the JS thread — no frame processor, no native worklet.
//
// Pipeline:
//   1. expo-image-manipulator → resize snapshot to 160×120 (speed)
//   2. base64 JPEG → Uint8Array → jpeg-js decode → raw RGBA pixel array
//   3. Same brightness/region math as geometryDetection.ts (JS edition)
//   4. Returns a SnapshotGuidance string the screen maps to TTS + border colour
//
// Typical latency on mid-range Android: ~250–450 ms total.
// ============================================================================

import * as ImageManipulator from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';

// ── Analysis resolution ───────────────────────────────────────────────────────
// 160×120 gives enough spatial resolution for centering detection while
// keeping jpeg-js decode time under 50 ms on most devices.
const ANALYSIS_WIDTH  = 160;
const ANALYSIS_HEIGHT = 120;

// ── Pixel thresholds (mirror geometryDetection.ts) ────────────────────────────
const BRIGHT_THRESHOLD  = 170;   // luminance cutoff for "bright" (check paper)
const MIN_BRIGHT_RATIO  = 0.07;  // need ≥7% bright pixels before treating as check
const ASPECT_MIN        = 1.2;
const ASPECT_MAX        = 6.5;

export type SnapshotGuidance =
  | 'no_check'
  | 'too_far'       // phone too high → check appears tiny
  | 'too_close'     // phone too low  → check overflows frame
  | 'too_left'      // check shifted left of frame center
  | 'too_right'
  | 'too_high'      // check in top half (move phone forward)
  | 'too_low'       // check in bottom half (move phone back)
  | 'too_bright'
  | 'too_dark'
  | 'good'
  | 'perfect'
  | 'analysis_failed';

// ── Voice guidance messages ────────────────────────────────────────────────────
// Maps each guidance state to the phrase spoken to the user.
export const SNAPSHOT_GUIDANCE_TTS: Record<SnapshotGuidance, string> = {
  no_check:        'No check in frame. Position the check in the guide box.',
  too_far:         'A bit lower. Bring the phone closer to the check.',
  too_close:       'A bit higher. Move the phone away slightly.',
  too_left:        'Move slightly to the right.',
  too_right:       'Move slightly to the left.',
  too_high:        'Move slightly forward.',
  too_low:         'Move slightly back.',
  too_bright:      'Too much light. Try shading the check slightly.',
  too_dark:        'Not enough light. Move to a brighter spot.',
  good:            'Hold still.',
  perfect:         'Perfect. Hold steady.',
  analysis_failed: '',
};

// ── Visual label inside the guide box ────────────────────────────────────────
export const SNAPSHOT_GUIDANCE_LABEL: Record<SnapshotGuidance, string> = {
  no_check:        'Position check in frame',
  too_far:         'Lower the phone ↓',
  too_close:       'Raise the phone ↑',
  too_left:        '← Move right',
  too_right:       'Move left →',
  too_high:        'Move forward ↑',
  too_low:         'Move back ↓',
  too_bright:      'Too bright — shade slightly',
  too_dark:        'Too dark — find more light',
  good:            'Hold still…',
  perfect:         '✓ Perfect — hold steady',
  analysis_failed: '',
};

// ── Main entry point ──────────────────────────────────────────────────────────
/**
 * Resize the snapshot at `uri`, decode the JPEG, run pixel analysis.
 * @param uri - file:// path returned by camera.takeSnapshot()
 */
export async function analyzeSnapshotUri(uri: string): Promise<SnapshotGuidance> {
  try {
    // Ensure file:// prefix (vision-camera path format varies by OS)
    const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`;

    // Step 1 — resize to 160×120, get base64 JPEG
    const { base64 } = await ImageManipulator.manipulateAsync(
      fileUri,
      [{ resize: { width: ANALYSIS_WIDTH, height: ANALYSIS_HEIGHT } }],
      { format: ImageManipulator.SaveFormat.JPEG, base64: true, compress: 0.6 }
    );

    if (!base64) return 'analysis_failed';

    // Step 2 — base64 → Uint8Array → jpeg-js RGBA decode
    const binary = atob(base64);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const { data, width, height } = jpeg.decode(bytes, {
      useTArray:        true,
      tolerantDecoding: true,
    });

    // Step 3 — pixel analysis
    return analyzePixels(data as Uint8Array, width, height);
  } catch (e) {
    console.warn('[snapshotAnalysis] error:', e);
    return 'analysis_failed';
  }
}

// ── Pixel analysis (JS port of geometryDetection.ts worklet) ─────────────────
function analyzePixels(data: Uint8Array, width: number, height: number): SnapshotGuidance {
  const SKIP = 3; // sample every 3rd pixel — fast enough at 160×120

  let totalLuma   = 0;
  let brightCount = 0;
  let totalSampled = 0;
  let minX = width,  maxX = 0;
  let minY = height, maxY = 0;

  for (let row = 0; row < height; row += SKIP) {
    for (let col = 0; col < width; col += SKIP) {
      const i    = (row * width + col) * 4; // RGBA — 4 bytes per pixel
      const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

      totalLuma += luma;
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

  const avgBrightness = totalLuma / Math.max(totalSampled, 1);

  // Lighting — checked before region detection so it fires even before check appears
  if (avgBrightness > 215) return 'too_bright';
  if (avgBrightness < 45)  return 'too_dark';

  // Check presence
  const brightRatio = brightCount / Math.max(totalSampled, 1);
  if (brightRatio < MIN_BRIGHT_RATIO || maxX <= minX || maxY <= minY) return 'no_check';

  // Aspect ratio — check is always wider than tall
  const regionW  = maxX - minX;
  const regionH  = Math.max(maxY - minY, 1);
  const aspect   = regionW / regionH;
  if (aspect < ASPECT_MIN || aspect > ASPECT_MAX) return 'no_check';

  // Coverage — proxy for phone height above the check
  const coverage = (regionW * regionH) / (width * height);
  if (coverage < 0.14) return 'too_far';   // phone too high
  if (coverage > 0.92) return 'too_close'; // phone too low

  // Centering
  const cx      = (minX + maxX) / 2;
  const cy      = (minY + maxY) / 2;
  const offsetX = (cx - width  / 2) / width;   // negative = check is left of center
  const offsetY = (cy - height / 2) / height;  // negative = check is in top half
  const absX    = offsetX < 0 ? -offsetX : offsetX;
  const absY    = offsetY < 0 ? -offsetY : offsetY;

  if (absX > 0.12) return offsetX < 0 ? 'too_left'  : 'too_right';
  if (absY > 0.12) return offsetY < 0 ? 'too_high'  : 'too_low';

  // Perfect — well-centred, good coverage
  if (coverage >= 0.30 && coverage <= 0.82 && absX < 0.09 && absY < 0.09) {
    return 'perfect';
  }

  return 'good';
}
