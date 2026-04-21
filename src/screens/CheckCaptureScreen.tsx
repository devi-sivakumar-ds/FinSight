// ============================================================================
// CheckCaptureScreen
// Step 3/4 — Real-time check positioning via on-device geometry + auto-capture
//
// Frame processor loop (~2fps via throttle gate):
//   Camera frame → analyzeCheckInFrame (native thread worklet)
//   → GuidanceState → JS thread → TTS + haptic if state changed
//   → auto-capture after 3 consecutive 'perfect' frames (~1.5s)
//
// No API calls during positioning. react-native-vision-camera v4 required.
// ============================================================================

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { useSharedValue, useRunOnJS } from 'react-native-worklets-core';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { DepositStackParamList, GuidanceState, HapticPattern } from '@/types/index';
import { useTTS } from '@hooks/useTTS';
import { useHaptics } from '@hooks/useHaptics';
import { useVoiceCommands } from '@hooks/useVoiceCommands';
import { COLORS, DARK_COLORS, GUIDANCE_MESSAGES } from '@utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { analyzeCheckInFrame } from '@services/geometryDetection';

type Props = {
  navigation: StackNavigationProp<DepositStackParamList, 'CheckCapture'>;
  route: RouteProp<DepositStackParamList, 'CheckCapture'>;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Number of consecutive 'perfect' analyses (~500ms each) before auto-capture
const CONSECUTIVE_PERFECT_NEEDED = 3; // ≈1.5 s

export const CheckCaptureScreen: React.FC<Props> = ({ navigation, route }) => {
  const { accountId, accountType, amount, side } = route.params;
  const { speakMedium, speakHigh } = useTTS();
  const { trigger } = useHaptics();

  // ── Camera setup ──────────────────────────────────────────────────────────
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef<Camera>(null);

  const [currentState, setCurrentState] = useState<GuidanceState>(GuidanceState.NO_CHECK_DETECTED);
  const lastAnnouncedState = useRef<GuidanceState | null>(null);

  const sideLabel = side === 'front' ? 'front' : 'back';

  // ── Capture guards ────────────────────────────────────────────────────────
  // consecutivePerfectRef: counted in JS thread each time onFrameAnalyzed fires
  const consecutivePerfectRef = useRef(0);
  // isCapturingRef: prevents double-capture or frame analysis after capture starts
  const isCapturingRef = useRef(false);

  // ── Frame processor throttle (SharedValue: accessible from worklet + JS) ──
  // Starts false — enabled after the initial announcement plays.
  const shouldAnalyze = useSharedValue(false);

  // ── Auto-capture ──────────────────────────────────────────────────────────
  const handleAutoCapture = useCallback(async () => {
    if (!cameraRef.current) return;

    try {
      setCurrentState(GuidanceState.CAPTURING);
      speakMedium('Capturing now!');

      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
        enableShutterSound: false,
      });

      // vision-camera returns a file path, not a URI — prefix with file://
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
      // Reset guards so user can try again
      isCapturingRef.current = false;
      shouldAnalyze.value = true;
      speakHigh('Failed to capture image. Please try again.');
    }
  }, [side, accountId, accountType, amount, navigation, route.params.frontImageUri, speakMedium, speakHigh, shouldAnalyze]);

  // Stable ref so the frame processor callback always invokes the latest
  // handleAutoCapture without causing onFrameAnalyzed to be recreated every render.
  const handleAutoCaptureRef = useRef(handleAutoCapture);
  useEffect(() => {
    handleAutoCaptureRef.current = handleAutoCapture;
  }, [handleAutoCapture]);

  // ── JS-thread callback invoked from the frame processor worklet ───────────
  const onFrameAnalyzed = useRunOnJS((state: string) => {
    // Guard: if a capture is in progress, ignore further analysis results
    if (isCapturingRef.current) return;

    const guidanceState = state as GuidanceState;
    setCurrentState(guidanceState);

    if (guidanceState === GuidanceState.PERFECT) {
      consecutivePerfectRef.current += 1;
      if (consecutivePerfectRef.current >= CONSECUTIVE_PERFECT_NEEDED) {
        consecutivePerfectRef.current = 0;
        isCapturingRef.current = true;
        // Kick off the high-quality capture; do NOT re-enable shouldAnalyze
        handleAutoCaptureRef.current();
        return;
      }
    } else {
      consecutivePerfectRef.current = 0;
    }

    // Re-enable analysis after 500 ms → effective rate ~2 fps
    setTimeout(() => {
      shouldAnalyze.value = true;
    }, 500);
  }, [shouldAnalyze]);

  // ── Frame processor (runs on native/background thread) ────────────────────
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (!shouldAnalyze.value) return;
    shouldAnalyze.value = false; // throttle gate: prevent concurrent analyses

    const state = analyzeCheckInFrame(frame);
    onFrameAnalyzed(state);
  }, [shouldAnalyze, onFrameAnalyzed]);

  // ── Permission request ────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  // ── Initial announcement + enable frame analysis ──────────────────────────
  useEffect(() => {
    if (!hasPermission) return;

    const announcementMsg =
      side === 'front'
        ? "Now, we'll auto-capture your check. Position the front of the check in front of the camera. I'll guide you."
        : "Position the back of the check in front of the camera. I'll guide you.";

    const announcementTimer = setTimeout(() => {
      speakMedium(announcementMsg);
    }, 500);

    // Enable frame analysis after announcement settles
    const startTimer = setTimeout(() => {
      consecutivePerfectRef.current = 0;
      isCapturingRef.current = false;
      shouldAnalyze.value = true;
    }, 1500);

    return () => {
      clearTimeout(announcementTimer);
      clearTimeout(startTimer);
      shouldAnalyze.value = false; // stop analysis on unmount
    };
  }, [hasPermission, side]);

  // ── TTS + Haptic coordination (unchanged from original) ───────────────────
  useEffect(() => {
    if (currentState === lastAnnouncedState.current) return;
    lastAnnouncedState.current = currentState;

    const message = GUIDANCE_MESSAGES[currentState];
    if (message) speakMedium(message);

    switch (currentState) {
      case GuidanceState.TOO_LEFT:
        trigger(HapticPattern.MOVE_LEFT);
        break;
      case GuidanceState.TOO_RIGHT:
        trigger(HapticPattern.MOVE_RIGHT);
        break;
      case GuidanceState.TOO_HIGH:
      case GuidanceState.TOO_LOW:
      case GuidanceState.TOO_FAR:
      case GuidanceState.TOO_CLOSE:
        trigger(HapticPattern.EDGE_DETECTED);
        break;
      case GuidanceState.GOOD:
        trigger(HapticPattern.EDGE_DETECTED);
        break;
      case GuidanceState.PERFECT:
        trigger(HapticPattern.ALIGNED);
        setTimeout(() => trigger(HapticPattern.HOLD_STEADY), 200);
        break;
      case GuidanceState.CAPTURING:
        trigger(HapticPattern.SUCCESS);
        break;
    }
  }, [currentState]);

  // ── Manual capture ────────────────────────────────────────────────────────
  const handleManualCapture = useCallback(() => {
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;
    shouldAnalyze.value = false;
    handleAutoCapture();
  }, [handleAutoCapture, shouldAnalyze]);

  // ── Voice commands ────────────────────────────────────────────────────────
  useVoiceCommands(
    {
      CONFIRM: handleManualCapture,
      CANCEL: () => {
        shouldAnalyze.value = false;
        navigation.getParent()?.goBack();
      },
      GO_BACK: () => {
        shouldAnalyze.value = false;
        navigation.getParent()?.goBack();
      },
    },
    { context: 'CheckCapture' }
  );

  // ── Border color based on state ───────────────────────────────────────────
  const getBorderColor = () => {
    if (currentState === GuidanceState.PERFECT || currentState === GuidanceState.CAPTURING) {
      return COLORS.GREEN_600;
    }
    if (currentState === GuidanceState.GOOD) return '#FFD700';
    return '#FF4444';
  };

  // ── Permission loading ────────────────────────────────────────────────────
  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
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
        <View style={styles.permissionContainer}>
          <ActivityIndicator size="large" color={COLORS.BLUE_600} />
          <Text style={styles.permissionText}>Initializing camera…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main camera UI ────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
        pixelFormat="yuv"
        photo={true}
      >
        {/* Semi-transparent overlay with cutout */}
        <View style={styles.overlay}>
          {/* Top dark area */}
          <View style={styles.overlayTop} />

          {/* Middle row with cutout */}
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />

            {/* Check guide cutout */}
            <View style={[styles.checkGuide, { borderColor: getBorderColor() }]}>
              <Text
                style={styles.guideText}
                accessibilityLiveRegion="polite"
                accessibilityLabel={GUIDANCE_MESSAGES[currentState]}
              >
                {GUIDANCE_MESSAGES[currentState]}
              </Text>
            </View>

            <View style={styles.overlaySide} />
          </View>

          {/* Bottom dark area */}
          <View style={styles.overlayBottom} />
        </View>

        {/* Manual capture button */}
        <View style={styles.controls}>
          <Pressable
            accessible
            accessibilityRole="button"
            accessibilityLabel="Manual capture"
            accessibilityHint="Tap to capture image manually"
            onPress={handleManualCapture}
            style={({ pressed }) => [
              styles.captureButton,
              pressed && styles.captureButtonPressed,
            ]}
          >
            <View style={styles.captureButtonInner} />
          </Pressable>

          <Text style={styles.sideLabel}>{sideLabel.toUpperCase()} SIDE</Text>
        </View>

        {/* Close button */}
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          onPress={() => {
            shouldAnalyze.value = false;
            navigation.getParent()?.goBack();
          }}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={32} color={COLORS.WHITE} />
        </Pressable>
      </Camera>
    </View>
  );
};

const GUIDE_WIDTH = SCREEN_WIDTH * 0.85;
const GUIDE_HEIGHT = GUIDE_WIDTH * 0.4; // Check aspect ratio ~2.5:1

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.GRAY_900 },
  camera: { flex: 1 },

  // Overlay
  overlay: { flex: 1 },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayMiddle: { flexDirection: 'row', height: GUIDE_HEIGHT },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },

  // Check guide cutout
  checkGuide: {
    width: GUIDE_WIDTH,
    height: GUIDE_HEIGHT,
    borderWidth: 4,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  guideText: {
    color: COLORS.WHITE,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 16,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // Controls
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 16,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.WHITE,
    borderWidth: 4,
    borderColor: COLORS.BLUE_600,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonPressed: { opacity: 0.7 },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.BLUE_600,
  },
  sideLabel: {
    color: COLORS.WHITE,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },

  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Permission / loading screen
  permissionContainer: {
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
