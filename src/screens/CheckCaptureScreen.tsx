// ============================================================================
// CheckCaptureScreen
// Step 3/4 — Voice-guided check positioning with countdown auto-capture
//
// Key design decisions:
//   1. Screen stays in PORTRAIT. Guide overlay is landscape-shaped (2.2:1 ratio)
//      matching real check dimensions, sized via useWindowDimensions.
//      Overlay / controls are SIBLINGS of <Camera> — on Android, vision-camera
//      renders a native SurfaceView; children render behind it and are invisible.
//   2. Option A — no frame processor: real-time pixel analysis (toArrayBuffer)
//      was unreliable across Android devices. Replaced with a guided countdown:
//        - Voice instructions tell user how to position the check
//        - 5-second countdown then auto-captures
//        - Haptic pulse on each countdown tick
//        - Manual "Capture" button + voice command available anytime
//   3. TTS queue drained via useFocusEffect cleanup on screen leave.
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
import { DepositStackParamList, HapticPattern } from '@/types/index';
import { useTTS } from '@hooks/useTTS';
import { useHaptics } from '@hooks/useHaptics';
import { useVoiceCommands } from '@hooks/useVoiceCommands';
import { COLORS, DARK_COLORS } from '@utils/constants';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  navigation: StackNavigationProp<DepositStackParamList, 'CheckCapture'>;
  route: RouteProp<DepositStackParamList, 'CheckCapture'>;
};

// Actual check aspect ratio (6" × 2.75" ≈ 2.18:1). Sizes the guide box.
const CHECK_ASPECT = 2.2;

// Seconds before auto-capture fires (after instructions finish)
const COUNTDOWN_START = 5;

// Time to allow instructions to play before countdown begins
const INSTRUCTIONS_DURATION_MS = 4200;

export const CheckCaptureScreen: React.FC<Props> = ({ navigation, route }) => {
  const { accountId, accountType, amount, side } = route.params;
  const { speakMedium, speakHigh } = useTTS();
  const { trigger } = useHaptics();

  // ── Guide dimensions — portrait-primary ──────────────────────────────────
  // Landscape-shaped guide box (2.2:1) inside a portrait camera view.
  const { width: winW, height: winH } = useWindowDimensions();
  const guideWidth  = Math.min(winW * 0.88, winH * 0.70 * CHECK_ASPECT);
  const guideHeight = guideWidth / CHECK_ASPECT;

  // ── Camera setup ──────────────────────────────────────────────────────────
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef<Camera>(null);

  // Prevents double-capture (manual tap racing countdown)
  const isCapturingRef = useRef(false);

  const sideLabel = side === 'front' ? 'front' : 'back';

  // ── Countdown state ───────────────────────────────────────────────────────
  // null = instructions phase, N = counting down, 0 = fire capture
  const [countdown, setCountdown] = useState<number | null>(null);

  // ── TTS drain on screen leave ─────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      return () => { ttsService.reset(); };
    }, [])
  );

  // ── Permission request ────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission]);

  // ── Auto-capture ──────────────────────────────────────────────────────────
  const handleAutoCapture = useCallback(async () => {
    if (!cameraRef.current || isCapturingRef.current) return;
    isCapturingRef.current = true;

    try {
      speakMedium('Capturing now!');
      trigger(HapticPattern.SUCCESS);
      setTimeout(() => trigger(HapticPattern.SUCCESS), 180);

      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
        enableShutterSound: false,
      });
      const photoUri = `file://${photo.path}`;

      if (side === 'front') {
        navigation.navigate('CheckFlip', {
          frontImageUri: photoUri,
          accountId,
          accountType,
          amount,
        });
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
    } catch (error) {
      console.error('[CheckCapture] Capture error:', error);
      isCapturingRef.current = false;
      speakHigh('Failed to capture. Please try again.');
      // Restart countdown after failure
      setCountdown(COUNTDOWN_START);
    }
  }, [side, accountId, accountType, amount, navigation, route.params.frontImageUri]);

  // Keep a ref so the countdown useEffect never captures a stale version
  const handleAutoCaptureRef = useRef(handleAutoCapture);
  useEffect(() => { handleAutoCaptureRef.current = handleAutoCapture; }, [handleAutoCapture]);

  // ── Countdown ticker ──────────────────────────────────────────────────────
  // Each tick: announce number + haptic, then decrement after 1 s.
  // At 0: fire auto-capture.
  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      handleAutoCaptureRef.current();
      return;
    }

    // Announce the number and give a gentle haptic pulse
    speakMedium(String(countdown));
    trigger(HapticPattern.EDGE_DETECTED);

    const t = setTimeout(() => setCountdown(c => (c ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // ── Instructions → start countdown ────────────────────────────────────────
  useEffect(() => {
    if (!hasPermission) return;

    const instruction =
      side === 'front'
        ? 'Position the front of your check in the guide box. Hold the phone flat, 8 to 10 inches above the check.'
        : 'Position the back of your check in the guide box. Make sure you can see the endorsement area.';

    const t1 = setTimeout(() => speakMedium(instruction), 600);
    const t2 = setTimeout(() => {
      speakMedium("Auto-capture will begin in 5 seconds. Tap Capture anytime if you're ready sooner.");
    }, 2500);
    const t3 = setTimeout(() => setCountdown(COUNTDOWN_START), INSTRUCTIONS_DURATION_MS);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setCountdown(null);
    };
  }, [hasPermission, side]);

  // ── Manual capture ────────────────────────────────────────────────────────
  const handleManualCapture = useCallback(() => {
    setCountdown(null); // cancel auto-countdown so it doesn't double-fire
    handleAutoCaptureRef.current();
  }, []);

  // ── Voice commands ────────────────────────────────────────────────────────
  useVoiceCommands(
    {
      CONFIRM:  handleManualCapture,
      CANCEL:   () => navigation.getParent()?.goBack(),
      GO_BACK:  () => navigation.getParent()?.goBack(),
    },
    { context: 'CheckCapture' }
  );

  // ── Derived UI values ─────────────────────────────────────────────────────
  const guideText =
    countdown !== null && countdown > 0
      ? `Auto-capture in ${countdown}...`
      : countdown === 0
      ? 'Capturing!'
      : 'Position check in frame, then tap Capture';

  // Border: green during active countdown (user is in position), blue otherwise
  const borderColor = countdown !== null ? COLORS.GREEN_600 : COLORS.BLUE_600;

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

  // ── No back camera device ─────────────────────────────────────────────────
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

  // ── Main camera UI ────────────────────────────────────────────────────────
  // IMPORTANT: Overlay and controls are SIBLINGS of <Camera>, not children.
  // On Android, vision-camera renders a native SurfaceView; React children
  // placed inside <Camera> render behind it and become invisible.
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
      {/* pointerEvents="none" lets taps pass through to the controls below */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Top dark band */}
        <View style={styles.overlayTop} />
        {/* Middle row: left dark | guide window | right dark */}
        <View style={[styles.overlayMiddle, { height: guideHeight }]}>
          <View style={styles.overlaySide} />
          {/* The check guide — transparent window with coloured border */}
          <View
            style={[
              styles.checkGuide,
              { width: guideWidth, height: guideHeight, borderColor },
            ]}
          >
            <Text
              style={styles.guideText}
              accessibilityLiveRegion="polite"
              accessibilityLabel={guideText}
            >
              {guideText}
            </Text>
          </View>
          <View style={styles.overlaySide} />
        </View>
        {/* Bottom dark band */}
        <View style={styles.overlayBottom} />
      </View>

      {/* ── Side label (FRONT/BACK) — top-left ── */}
      <View style={styles.sideLabelContainer} pointerEvents="none">
        <Text style={styles.sideLabel}>{sideLabel.toUpperCase()} SIDE</Text>
      </View>

      {/* ── Countdown ring — shown above capture button during countdown ── */}
      {countdown !== null && countdown > 0 && (
        <View style={styles.countdownContainer} pointerEvents="none">
          <Text style={styles.countdownNumber}>{countdown}</Text>
        </View>
      )}

      {/* ── Manual capture button — bottom-center ── */}
      <View style={styles.controls}>
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel="Capture check"
          accessibilityHint="Tap to capture image now"
          onPress={handleManualCapture}
          style={({ pressed }) => [
            styles.captureButton,
            pressed && styles.captureButtonPressed,
          ]}
        >
          <View style={styles.captureButtonInner} />
        </Pressable>
      </View>

      {/* ── Close button — top-right ── */}
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

  // ── Overlay rows ──────────────────────────────────────────────────────────
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

  // ── Countdown number (above capture button) ───────────────────────────────
  countdownContainer: {
    position: 'absolute',
    bottom: 108,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  countdownNumber: {
    fontSize: 52,
    fontWeight: '900',
    color: COLORS.WHITE,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  // ── Capture button (absolute bottom-center) ───────────────────────────────
  controls: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
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
  captureButtonPressed: { opacity: 0.7 },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.BLUE_600,
  },

  // ── Close button (absolute top-right) ─────────────────────────────────────
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
