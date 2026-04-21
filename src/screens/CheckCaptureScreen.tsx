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
  useWindowDimensions,
} from 'react-native';
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
  type SnapshotGuidance,
} from '@services/snapshotAnalysis';
import { DepositStackParamList, HapticPattern } from '@/types/index';
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
const SNAPSHOT_INTERVAL_MS = 1500;

// How many 'perfect' readings (with 'good' allowed in between) before auto-capture
// Option B: 'good' does not reset the counter, only directional states do.
const CONSECUTIVE_PERFECT_NEEDED = 3;

// Minimum ms between TTS guidance announcements (same-state repeat suppression)
const MIN_TTS_INTERVAL_MS = 2500;

type CapturePhase = 'setup' | 'analyzing' | 'capturing';

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

  // ── Camera ────────────────────────────────────────────────────────────────
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef<Camera>(null);

  // ── Phase and guidance state ──────────────────────────────────────────────
  const [phase, setPhase]                   = useState<CapturePhase>('setup');
  const [currentGuidance, setCurrentGuidance] = useState<SnapshotGuidance>('no_check');

  // ── Refs (avoid stale closures in async loops) ─────────────────────────────
  const phaseRef              = useRef<CapturePhase>('setup');
  const isCapturingRef        = useRef(false);
  const consecutivePerfectRef = useRef(0);
  const lastTTSTimeRef        = useRef(0);
  const lastGuidanceRef       = useRef<SnapshotGuidance | null>(null);
  const snapshotTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      if (side === 'front') {
        navigation.navigate('CheckFlip', { frontImageUri: photoUri, accountId, accountType, amount });
      } else {
        const frontUri = route.params.frontImageUri ?? '';
        navigation.navigate('OCRProcessing', {
          frontImageUri: frontUri,
          backImageUri: photoUri,
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
  const handleGuidance = useCallback((guidance: SnapshotGuidance) => {
    if (guidance === 'analysis_failed') return; // silent retry

    setCurrentGuidance(guidance);

    // Consecutive-perfect accumulator → auto-capture (Option B)
    // 'perfect' increments the counter.
    // 'good'    leaves it unchanged — oscillation between good/perfect won't block capture.
    // Anything else (directional correction) resets it — user needs to reposition.
    if (guidance === 'perfect') {
      consecutivePerfectRef.current += 1;
      if (consecutivePerfectRef.current >= CONSECUTIVE_PERFECT_NEEDED) {
        consecutivePerfectRef.current = 0;
        handleAutoCaptureRef.current();
        return;
      }
    } else if (guidance !== 'good') {
      consecutivePerfectRef.current = 0;
    }

    // TTS: speak immediately on state change; repeat same state only after 2.5 s
    const now = Date.now();
    const isSame = guidance === lastGuidanceRef.current;
    if (!isSame || now - lastTTSTimeRef.current > MIN_TTS_INTERVAL_MS) {
      const msg = SNAPSHOT_GUIDANCE_TTS[guidance];
      if (msg) {
        speakMedium(msg);
        lastTTSTimeRef.current = now;
        lastGuidanceRef.current = guidance;
      }
    }

    // Haptics per guidance type
    switch (guidance) {
      case 'too_left':  trigger(HapticPattern.MOVE_LEFT);    break;
      case 'too_right': trigger(HapticPattern.MOVE_RIGHT);   break;
      case 'perfect':
        trigger(HapticPattern.ALIGNED);
        setTimeout(() => trigger(HapticPattern.HOLD_STEADY), 200);
        break;
      case 'good':
      case 'too_far':
      case 'too_close':
      case 'too_high':
      case 'too_low':   trigger(HapticPattern.EDGE_DETECTED); break;
      default: break;
    }
  }, []);

  // ── Snapshot loop (recursive setTimeout, runs every ~1.5 s) ───────────────
  // Uses refs so the closure is never stale.
  const runSnapshotLoop = useCallback(async () => {
    if (isCapturingRef.current || phaseRef.current !== 'analyzing') return;

    try {
      const snapshot = await cameraRef.current!.takeSnapshot({ quality: 40 });
      const guidance = await analyzeSnapshotUri(snapshot.path);
      handleGuidance(guidance);
    } catch (e) {
      console.warn('[CheckCapture] snapshot error:', e);
    }

    // Schedule next run if still in analyzing phase
    if (!isCapturingRef.current && phaseRef.current === 'analyzing') {
      snapshotTimerRef.current = setTimeout(runSnapshotLoop, SNAPSHOT_INTERVAL_MS);
    }
  }, [handleGuidance]);

  const runSnapshotLoopRef = useRef(runSnapshotLoop);
  useEffect(() => { runSnapshotLoopRef.current = runSnapshotLoop; }, [runSnapshotLoop]);

  // ── Transition: setup → analyzing ────────────────────────────────────────
  const handleReady = useCallback(() => {
    setPhase('analyzing');
    phaseRef.current = 'analyzing';
    consecutivePerfectRef.current = 0;
    lastGuidanceRef.current = null;
    lastTTSTimeRef.current  = 0;

    speakMedium(v(verbosity, ttsStrings.checkCapture.setupInstruction));

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
        ? 'Hold the phone flat and place it directly on top of the front of the check. Say \'ready\' or tap Ready when set.'
        : 'Hold the phone flat and place it on the back of the check where you signed. Say \'ready\' or tap Ready when set.';

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
    return SNAPSHOT_GUIDANCE_LABEL[currentGuidance] ?? '';
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
        <Text style={styles.phaseText}>
          {phase === 'setup'     ? 'Step 1: Place phone on check'  : ''}
          {phase === 'analyzing' ? 'Analyzing…'                     : ''}
          {phase === 'capturing' ? 'Capturing!'                     : ''}
        </Text>
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

    </View>
  );
};

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
