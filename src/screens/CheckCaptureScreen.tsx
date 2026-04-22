// ============================================================================
// CheckCaptureScreen
// Step 3/4 — BLV-optimised check capture with snapshot-based real-time guidance
//
// Three phases:
//   1. setup     — voice instructions, user places phone on check
//   2. analyzing — snapshot loop every 1.5 s, pixel analysis → voice guidance
//   3. capturing — takePhoto() for final high-quality image → navigate
//
// Snapshot pipeline (Option C — no frame processor):
//   takeSnapshot (low quality) → expo-image-manipulator resize 160×120
//   → jpeg-js RGBA decode → brightness / region math → SnapshotGuidance
//
// See src/services/snapshotAnalysis.ts for the pixel math.
// ============================================================================

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
  Image,
  useWindowDimensions,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import ttsService from '@services/ttsService';
import {
  analyzeSnapshotUri,
  SNAPSHOT_GUIDANCE_TTS,
  SNAPSHOT_GUIDANCE_LABEL,
  type SnapshotAnalysisResult,
  type SnapshotGuideRoi,
  type SnapshotGuidance,
} from '@services/snapshotAnalysis';
import { DepositStackParamList, HapticPattern, TTSPriority } from '@/types/index';
import { useTTS } from '@hooks/useTTS';
import { useHaptics } from '@hooks/useHaptics';
import { useVoiceCommands } from '@hooks/useVoiceCommands';
import { useVoiceSettings } from '@hooks/useVoiceSettings';
import { COLORS, DARK_COLORS } from '@utils/constants';
import { ttsStrings, v } from '@utils/ttsStrings';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  navigation: StackNavigationProp<DepositStackParamList, 'CheckCapture'>;
  route: RouteProp<DepositStackParamList, 'CheckCapture'>;
};

// ── Constants ─────────────────────────────────────────────────────────────────
// Actual check aspect ratio (6" × 2.75" ≈ 2.18:1). Sizes the guide box.
const CHECK_ASPECT = 2.2;

// Milliseconds between snapshot analysis runs
const SNAPSHOT_INTERVAL_MS = 900;

// Minimum ms between TTS guidance announcements (same-state repeat suppression)
const MIN_TTS_INTERVAL_MS = 2500;

// Auto-capture once the detector stays confident and aligned for this long
const STABLE_HOLD_MS = 650;

const DEBUG_CAPTURE = __DEV__;

type CapturePhase = 'setup' | 'analyzing' | 'capturing';
type GuidanceCue =
  | 'setup'
  | 'searching'
  | 'check_found'
  | 'move_left'
  | 'move_right'
  | 'move_up'
  | 'move_down'
  | 'raise_phone'
  | 'lower_phone'
  | 'hold'
  | 'capturing';

export const CheckCaptureScreen: React.FC<Props> = ({ navigation, route }) => {
  const { accountId, accountType, amount, side } = route.params;
  const { speakMedium, speakHigh } = useTTS();
  const { trigger } = useHaptics();
  const { verbosity } = useVoiceSettings();

  // ── Guide box — portrait-shaped (taller than wide) ───────────────────────
  // User holds phone in landscape. The check's long 6" side runs vertically
  // in the rotated camera view, so height is the dominant dimension.
  // useWindowDimensions returns landscape values (winW > winH) automatically
  // when the phone is rotated — no orientation lock needed.
  const { width: winW, height: winH } = useWindowDimensions();
  const guideHeight = Math.min(winH * 0.85, winW * 0.70 * CHECK_ASPECT);
  const guideWidth  = guideHeight / CHECK_ASPECT;
  const guideRoi: SnapshotGuideRoi = {
    centerX: 0.5,
    centerY: 0.5,
    width: Math.min((guideWidth / Math.max(winW, 1)) * 1.12, 0.96),
    height: Math.min((guideHeight / Math.max(winH, 1)) * 1.04, 0.96),
  };

  // ── Camera ────────────────────────────────────────────────────────────────
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef<Camera>(null);

  // ── Phase and guidance state ──────────────────────────────────────────────
  const [phase, setPhase]                   = useState<CapturePhase>('setup');
  const [currentGuidance, setCurrentGuidance] = useState<SnapshotGuidance>('no_check');
  const [analysisResult, setAnalysisResult] = useState<SnapshotAnalysisResult | null>(null);

  // ── Refs (avoid stale closures in async loops) ─────────────────────────────
  const phaseRef              = useRef<CapturePhase>('setup');
  const isCapturingRef        = useRef(false);
  const lastTTSTimeRef        = useRef(0);
  const lastGuidanceRef       = useRef<SnapshotGuidance | null>(null);
  const snapshotTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stableSinceRef        = useRef<number | null>(null);
  const lastConfidenceRef     = useRef(0);
  const lastCueRef            = useRef<GuidanceCue | null>(null);

  // Keep phaseRef in sync
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const sideLabel = side === 'front' ? 'front' : 'back';

  // ── TTS drain on screen leave ─────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      return () => {
        ttsService.reset();
        if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
      };
    }, [])
  );

  // ── Permission request ────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission]);

  // ── Final photo capture (high quality) ────────────────────────────────────
  const handleAutoCapture = useCallback(async () => {
    if (!cameraRef.current || isCapturingRef.current) return;
    isCapturingRef.current = true;

    // Stop snapshot loop
    if (snapshotTimerRef.current) {
      clearTimeout(snapshotTimerRef.current);
      snapshotTimerRef.current = null;
    }

    setPhase('capturing');
    speakMedium(v(verbosity, ttsStrings.checkCapture.capturingNow));
    trigger(HapticPattern.SUCCESS);
    setTimeout(() => trigger(HapticPattern.SUCCESS), 200);

    try {
      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
        enableShutterSound: false,
      });
      const photoUri = `file://${photo.path}`;
      const normalizedPhotoUri = await normalizeImageToLandscape(photoUri);

      if (side === 'front') {
        navigation.navigate('CheckFlip', { frontImageUri: normalizedPhotoUri, accountId, accountType, amount });
      } else {
        const frontUri = route.params.frontImageUri ?? '';
        navigation.navigate('OCRProcessing', {
          frontImageUri: frontUri,
          backImageUri: normalizedPhotoUri,
          accountId,
          accountType,
          amount,
        });
      }
    } catch (err) {
      console.error('[CheckCapture] takePhoto error:', err);
      isCapturingRef.current = false;
      setPhase('analyzing');
      speakHigh(v(verbosity, ttsStrings.checkCapture.captureFailed));
      // Restart snapshot loop after failure (use ref to avoid stale closure)
      snapshotTimerRef.current = setTimeout(() => runSnapshotLoopRef.current(), SNAPSHOT_INTERVAL_MS);
    }
  }, [side, accountId, accountType, amount, navigation, route.params.frontImageUri]);

  const handleAutoCaptureRef = useRef(handleAutoCapture);
  useEffect(() => { handleAutoCaptureRef.current = handleAutoCapture; }, [handleAutoCapture]);

  // ── Guidance handler — TTS rate-limit + haptics + perfect tracking ─────────
  const handleGuidance = useCallback((result: SnapshotAnalysisResult) => {
    const guidance = result.guidance;
    if (guidance === 'analysis_failed') return; // silent retry

    setAnalysisResult(result);
    setCurrentGuidance(guidance);

    const confidence = result.confidence;
    const isStableCandidate =
      guidance !== 'no_check' &&
      guidance !== 'too_far' &&
      guidance !== 'too_close' &&
      confidence >= 0.52 &&
      result.metrics.roiOverlap >= 0.45 &&
      Math.abs(result.metrics.offsetX) < 0.12 &&
      Math.abs(result.metrics.offsetY) < 0.12;

    if (isStableCandidate) {
      const now = Date.now();
      if (!stableSinceRef.current) stableSinceRef.current = now;
      if (now - stableSinceRef.current >= STABLE_HOLD_MS) {
        stableSinceRef.current = null;
        handleAutoCaptureRef.current();
        return;
      }
    } else if (guidance !== 'good') {
      stableSinceRef.current = null;
    }

    const cue = getGuidanceCue(result);
    const cueText = getCueText(cue, side);

    if (DEBUG_CAPTURE) {
      console.log(
        '[CheckCapture] guidance',
        JSON.stringify({
          guidance,
          cue,
          reason: result.reason,
          confidence: roundMetric(confidence),
          coverage: roundMetric(result.metrics.coverage),
          roiOverlap: roundMetric(result.metrics.roiOverlap),
          offsetX: roundMetric(result.metrics.offsetX),
          offsetY: roundMetric(result.metrics.offsetY),
          mode: result.metrics.detectionMode,
          candidates: result.metrics.candidateCount,
        })
      );
    }

    // TTS: speak immediately on cue change; repeat same cue only after a pause.
    const now = Date.now();
    const isSameCue = cue === lastCueRef.current;
    if (!isSameCue || now - lastTTSTimeRef.current > MIN_TTS_INTERVAL_MS) {
      if (cueText) {
        ttsService.speak(cueText, TTSPriority.LOW, !isSameCue);
        lastTTSTimeRef.current = now;
        lastGuidanceRef.current = guidance;
        lastCueRef.current = cue;
      }
    }

    lastConfidenceRef.current = confidence;

    // Haptics per guidance type
    switch (guidance) {
      case 'too_left':  trigger(HapticPattern.MOVE_LEFT);    break;
      case 'too_right': trigger(HapticPattern.MOVE_RIGHT);   break;
      case 'too_high':  trigger(HapticPattern.MOVE_UP);      break;
      case 'too_low':   trigger(HapticPattern.MOVE_DOWN);    break;
      case 'perfect':
        trigger(HapticPattern.ALIGNED);
        setTimeout(() => trigger(HapticPattern.HOLD_STEADY), 200);
        break;
      case 'good':
      case 'blurry':
      case 'too_far':
      case 'too_close':
        trigger(HapticPattern.EDGE_DETECTED);
        break;
      default: break;
    }
  }, [side, trigger]);

  // ── Snapshot loop (recursive setTimeout, runs every ~1.5 s) ───────────────
  // Uses refs so the closure is never stale.
  const runSnapshotLoop = useCallback(async () => {
    if (isCapturingRef.current || phaseRef.current !== 'analyzing') return;

    try {
      const snapshot = await cameraRef.current!.takeSnapshot({ quality: 40 });
      const result = await analyzeSnapshotUri(snapshot.path, guideRoi);
      handleGuidance(result);
    } catch (e) {
      console.warn('[CheckCapture] snapshot error:', e);
    }

    // Schedule next run if still in analyzing phase
    if (!isCapturingRef.current && phaseRef.current === 'analyzing') {
      snapshotTimerRef.current = setTimeout(runSnapshotLoop, SNAPSHOT_INTERVAL_MS);
    }
  }, [guideRoi, handleGuidance]);

  const runSnapshotLoopRef = useRef(runSnapshotLoop);
  useEffect(() => { runSnapshotLoopRef.current = runSnapshotLoop; }, [runSnapshotLoop]);

  // ── Transition: setup → analyzing ────────────────────────────────────────
  const handleReady = useCallback(() => {
    setPhase('analyzing');
    phaseRef.current = 'analyzing';
    lastGuidanceRef.current = null;
    lastTTSTimeRef.current  = 0;
    stableSinceRef.current = null;
    lastConfidenceRef.current = 0;
    lastCueRef.current = null;
    setAnalysisResult(null);

    speakMedium(
      side === 'front'
        ? 'Lift the phone straight up slowly. Keep the check under the middle of the phone. I will say left, right, up, down, raise, lower, or hold steady.'
        : 'Lift the phone straight up slowly from the back of the check. Keep the check under the middle of the phone. I will say left, right, up, down, raise, lower, or hold steady.'
    );

    // Give the TTS ~800 ms before first snapshot (phone still moving up)
    snapshotTimerRef.current = setTimeout(() => {
      runSnapshotLoopRef.current();
    }, 800);
  }, []);

  // ── Setup phase: mount instructions ──────────────────────────────────────
  useEffect(() => {
    if (!hasPermission) return;

    const instruction =
      side === 'front'
        ? 'Place the phone flat on top of the front of the check. Center it by touch, then say ready.'
        : 'Place the phone flat on the back of the check where you signed. Center it by touch, then say ready.';

    const t1 = setTimeout(() => speakMedium(instruction), 600);

    return () => {
      clearTimeout(t1);
      if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    };
  }, [hasPermission, side]);

  // ── Voice commands ────────────────────────────────────────────────────────
  useVoiceCommands(
    {
      CONFIRM: () => {
        if (phaseRef.current === 'setup')    { handleReady(); return; }
        if (phaseRef.current === 'analyzing') { handleAutoCaptureRef.current(); }
      },
      CANCEL:  () => navigation.getParent()?.goBack(),
      GO_BACK: () => navigation.getParent()?.goBack(),
    },
    { context: 'CheckCapture' }
  );

  // ── Derived UI values ─────────────────────────────────────────────────────
  const guideLabel = (() => {
    if (phase === 'setup')     return 'Place phone on check, then tap Ready';
    if (phase === 'capturing') return 'Capturing!';
    if (analysisResult) return getCueLabel(getGuidanceCue(analysisResult));
    return SNAPSHOT_GUIDANCE_LABEL[currentGuidance] ?? '';
  })();

  const phaseLabel = (() => {
    if (phase === 'setup') return 'Step 1: Place phone on check';
    if (phase === 'capturing') return 'Capturing!';
    if (analysisResult && analysisResult.confidence > 0) {
      return `Analyzing… ${Math.round(analysisResult.confidence * 100)}%`;
    }
    return 'Analyzing…';
  })();

  const borderColor = (() => {
    if (phase === 'setup')     return COLORS.BLUE_600;
    if (phase === 'capturing') return COLORS.GREEN_600;
    switch (currentGuidance) {
      case 'perfect': return COLORS.GREEN_600;
      case 'good':    return '#FFD700';
      case 'no_check':
      case 'analysis_failed': return '#FF4444';
      default: return '#FF6600'; // correction needed
    }
  })();

  const debugText = analysisResult
    ? [
        `cue=${getGuidanceCue(analysisResult)} guidance=${analysisResult.guidance} reason=${analysisResult.reason}`,
        `conf=${roundMetric(analysisResult.confidence)} cov=${roundMetric(analysisResult.metrics.coverage)} roi=${roundMetric(analysisResult.metrics.roiOverlap)} mode=${analysisResult.metrics.detectionMode}`,
        `off=(${roundMetric(analysisResult.metrics.offsetX)}, ${roundMetric(analysisResult.metrics.offsetY)}) candidates=${analysisResult.metrics.candidateCount}`,
      ].join('\n')
    : 'No analysis yet';

  // ── Permission denied ─────────────────────────────────────────────────────
  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredBox}>
          <Ionicons name="camera-outline" size={80} color={COLORS.GRAY_400} />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            FinSight needs camera access to capture your check images.
          </Text>
          <Pressable
            accessible
            accessibilityRole="button"
            accessibilityLabel="Grant camera permission"
            onPress={requestPermission}
            style={styles.permissionButton}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── No camera device ──────────────────────────────────────────────────────
  if (!device) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredBox}>
          <ActivityIndicator size="large" color={COLORS.BLUE_600} />
          <Text style={styles.permissionText}>Initializing camera…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main UI ───────────────────────────────────────────────────────────────
  // IMPORTANT: Overlay and controls are SIBLINGS of <Camera>, not children.
  // On Android, vision-camera renders a native SurfaceView; React children
  // placed inside <Camera> render behind it and are invisible.
  return (
    <View style={styles.container}>

      {/* ── Camera preview ── */}
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
      />

      {/* ── Darkening overlay with landscape check-guide cutout ── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.overlayTop} />
        <View style={[styles.overlayMiddle, { height: guideHeight }]}>
          <View style={styles.overlaySide} />
          <View
            style={[
              styles.checkGuide,
              { width: guideWidth, height: guideHeight, borderColor },
            ]}
          >
            <Text
              style={styles.guideText}
              accessibilityLiveRegion="polite"
              accessibilityLabel={guideLabel}
            >
              {guideLabel}
            </Text>
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom} />
      </View>

      {/* ── Side label top-left ── */}
      <View style={styles.sideLabelContainer} pointerEvents="none">
        <Text style={styles.sideLabel}>{sideLabel.toUpperCase()} SIDE</Text>
      </View>

      {/* ── Phase indicator top-center ── */}
      <View style={styles.phaseContainer} pointerEvents="none">
        <Text style={styles.phaseText}>{phaseLabel}</Text>
      </View>

      {/* ── Primary action button — bottom-center ── */}
      {/* setup → "Ready"  |  analyzing → "Capture Now"  |  capturing → hidden */}
      {phase !== 'capturing' && (
        <View style={styles.controls}>
          {phase === 'setup' ? (
            <Pressable
              accessible
              accessibilityRole="button"
              accessibilityLabel="Ready — start scanning"
              accessibilityHint="Tap when your phone is placed on the check"
              onPress={handleReady}
              style={({ pressed }) => [styles.readyButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.readyButtonText}>Ready</Text>
            </Pressable>
          ) : (
            <Pressable
              accessible
              accessibilityRole="button"
              accessibilityLabel="Capture check now"
              accessibilityHint="Tap to capture immediately without waiting"
              onPress={() => handleAutoCaptureRef.current()}
              style={({ pressed }) => [styles.captureButton, pressed && styles.buttonPressed]}
            >
              <View style={styles.captureButtonInner} />
            </Pressable>
          )}
        </View>
      )}

      {/* ── Close button top-right ── */}
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel="Cancel"
        onPress={() => navigation.getParent()?.goBack()}
        style={styles.closeButton}
      >
        <Ionicons name="close" size={28} color={COLORS.WHITE} />
      </Pressable>

      {DEBUG_CAPTURE && (
        <View style={styles.debugPanel} pointerEvents="none">
          <Text style={styles.debugText}>{debugText}</Text>
        </View>
      )}

    </View>
  );
};

function getGuidanceCue(result: SnapshotAnalysisResult): GuidanceCue {
  switch (result.guidance) {
    case 'no_check':
      return result.metrics.candidateCount > 0 || result.confidence > 0.18 ? 'check_found' : 'searching';
    case 'too_left':
      return 'move_right';
    case 'too_right':
      return 'move_left';
    case 'too_high':
      return 'move_down';
    case 'too_low':
      return 'move_up';
    case 'too_far':
      return 'lower_phone';
    case 'too_close':
      return 'raise_phone';
    case 'blurry':
    case 'good':
    case 'perfect':
      return 'hold';
    default:
      return 'searching';
  }
}

function getCueText(cue: GuidanceCue, side: 'front' | 'back'): string {
  switch (cue) {
    case 'searching':
      return 'Move the phone over the check.';
    case 'check_found':
      return 'Check found. Keep moving slowly.';
    case 'move_left':
      return 'Move left.';
    case 'move_right':
      return 'Move right.';
    case 'move_up':
      return 'Move up.';
    case 'move_down':
      return 'Move down.';
    case 'raise_phone':
      return 'Raise the phone slightly.';
    case 'lower_phone':
      return 'Lower the phone slightly.';
    case 'hold':
      return side === 'front' ? 'Hold steady. Capturing soon.' : 'Hold steady. Capturing soon.';
    case 'capturing':
      return 'Capturing now.';
    case 'setup':
      return 'Center the phone on the check and say ready.';
    default:
      return '';
  }
}

function getCueLabel(cue: GuidanceCue): string {
  switch (cue) {
    case 'searching':
      return 'Searching for check';
    case 'check_found':
      return 'Check found — move slowly';
    case 'move_left':
      return 'Move left';
    case 'move_right':
      return 'Move right';
    case 'move_up':
      return 'Move up';
    case 'move_down':
      return 'Move down';
    case 'raise_phone':
      return 'Raise phone slightly';
    case 'lower_phone':
      return 'Lower phone slightly';
    case 'hold':
      return 'Hold steady — capturing soon';
    case 'capturing':
      return 'Capturing';
    case 'setup':
      return 'Place phone on check';
    default:
      return 'Analyzing';
  }
}

function roundMetric(value: number): number {
  return Math.round(value * 100) / 100;
}

async function normalizeImageToLandscape(uri: string): Promise<string> {
  const { width, height } = await getImageSize(uri);
  if (width >= height) return uri;

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ rotate: 90 }],
    { format: ImageManipulator.SaveFormat.JPEG, compress: 0.95 }
  );

  return result.uri;
}

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      reject
    );
  });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // ── Overlay ───────────────────────────────────────────────────────────────
  overlayTop:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayMiddle: { flexDirection: 'row' },
  overlaySide:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },

  // ── Check guide window ────────────────────────────────────────────────────
  checkGuide: {
    borderWidth: 3,
    borderRadius: 10,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingBottom: 10,
  },
  guideText: {
    color: COLORS.WHITE,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 12,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // ── Side label (top-left) ─────────────────────────────────────────────────
  sideLabelContainer: {
    position: 'absolute',
    top: 16,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sideLabel: {
    color: COLORS.WHITE,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
  },

  // ── Phase indicator (top-center) ──────────────────────────────────────────
  phaseContainer: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  phaseText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },

  // ── Controls row (bottom-center) ──────────────────────────────────────────
  controls: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  // Setup phase: prominent "Ready" pill button
  readyButton: {
    backgroundColor: COLORS.BLUE_600,
    paddingHorizontal: 48,
    paddingVertical: 18,
    borderRadius: 40,
    minWidth: 180,
    alignItems: 'center',
  },
  readyButtonText: {
    color: COLORS.WHITE,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Analyzing phase: shutter circle button
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.WHITE,
    borderWidth: 4,
    borderColor: COLORS.BLUE_600,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.BLUE_600,
  },

  buttonPressed: { opacity: 0.65 },

  // ── Close button (top-right) ──────────────────────────────────────────────
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  debugPanel: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 120,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 10,
    padding: 10,
  },
  debugText: {
    color: COLORS.WHITE,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Courier',
  },

  // ── Permission / loading screens ──────────────────────────────────────────
  centeredBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: DARK_COLORS.TEXT_PRIMARY,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: DARK_COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: DARK_COLORS.BLUE,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  permissionButtonText: {
    color: COLORS.WHITE,
    fontSize: 18,
    fontWeight: '600',
  },
});
