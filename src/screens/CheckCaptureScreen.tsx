// ============================================================================
// CheckCaptureScreen
// Step 3/4 — Camera with mock positioning guidance
// ============================================================================

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Dimensions,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { DepositStackParamList, GuidanceState, HapticPattern } from '@/types/index';
import { useTTS } from '@hooks/useTTS';
import { useHaptics } from '@hooks/useHaptics';
import { useVoiceCommands } from '@hooks/useVoiceCommands';
import { COLORS, DARK_COLORS, GUIDANCE_MESSAGES } from '@utils/constants';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  navigation: StackNavigationProp<DepositStackParamList, 'CheckCapture'>;
  route: RouteProp<DepositStackParamList, 'CheckCapture'>;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Mock state machine for Phase 2
const MOCK_STATES: Array<{ state: GuidanceState; duration: number }> = [
  { state: 'no_check' as GuidanceState, duration: 2000 },
  { state: 'too_far' as GuidanceState, duration: 2000 },
  { state: 'too_left' as GuidanceState, duration: 2000 },
  { state: 'good' as GuidanceState, duration: 2000 },
  { state: 'perfect' as GuidanceState, duration: 1500 }, // Hold for auto-capture
  { state: 'capturing' as GuidanceState, duration: 500 },
];

export const CheckCaptureScreen: React.FC<Props> = ({ navigation, route }) => {
  const { accountId, accountType, amount, side } = route.params;
  const { speakMedium, speakHigh, stop } = useTTS();
  const { trigger } = useHaptics();

  const [permission, requestPermission] = useCameraPermissions();
  const [currentState, setCurrentState] = useState<GuidanceState>('no_check' as GuidanceState);
  const [stateIndex, setStateIndex] = useState(0);
  const [perfectHoldTime, setPerfectHoldTime] = useState(0);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);

  const cameraRef = useRef<any>(null);
  const stateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const perfectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAnnouncedState = useRef<GuidanceState | null>(null);

  const sideLabel = side === 'front' ? 'front' : 'back';

  // ── Camera permission ───────────────────────────────────────────────────
  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) {
      requestPermission();
    }
  }, [permission]);

  // ── Initial announcement ────────────────────────────────────────────────
  useEffect(() => {
    if (permission?.granted) {
      setTimeout(() => {
        const msg =
          side === 'front'
            ? "Now, we'll auto-capture your check. Position the front of the check in front of the camera. I'll guide you."
            : "Position the back of the check in front of the camera. I'll guide you.";
        speakMedium(msg);
      }, 500);
    }
  }, [permission?.granted, side]);

  // ── Mock state machine (cycles through states) ──────────────────────────
  useEffect(() => {
    if (!permission?.granted) return;

    const runStateMachine = () => {
      const { state, duration } = MOCK_STATES[stateIndex];
      setCurrentState(state);

      // Auto-advance to next state after duration
      stateTimerRef.current = setTimeout(() => {
        if (state === 'capturing') {
          // After capturing, trigger actual capture
          handleAutoCapture();
        } else {
          setStateIndex((prev) => (prev + 1) % MOCK_STATES.length);
        }
      }, duration);
    };

    runStateMachine();

    return () => {
      if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
    };
  }, [stateIndex, permission?.granted]);

  // ── TTS + Haptic coordination ───────────────────────────────────────────
  useEffect(() => {
    if (currentState === lastAnnouncedState.current) return;
    lastAnnouncedState.current = currentState;

    const message = GUIDANCE_MESSAGES[currentState];
    if (message) {
      speakMedium(message);
    }

    // Trigger haptics
    switch (currentState) {
      case 'too_left':
        trigger(HapticPattern.MOVE_LEFT);
        break;
      case 'too_right':
        trigger(HapticPattern.MOVE_RIGHT);
        break;
      case 'too_high':
      case 'too_low':
      case 'too_far':
      case 'too_close':
        trigger(HapticPattern.EDGE_DETECTED);
        break;
      case 'good':
        trigger(HapticPattern.EDGE_DETECTED);
        break;
      case 'perfect':
        trigger(HapticPattern.ALIGNED);
        setTimeout(() => trigger(HapticPattern.HOLD_STEADY), 200);
        break;
      case 'capturing':
        trigger(HapticPattern.SUCCESS);
        break;
    }
  }, [currentState]);

  // ── Auto-capture when "perfect" held for 1.5s ───────────────────────────
  const handleAutoCapture = useCallback(async () => {
    if (!cameraRef.current) return;

    try {
      speakMedium('Capturing now!');
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      setCapturedUri(photo.uri);

      // Navigate to next screen
      if (side === 'front') {
        navigation.navigate('CheckFlip', {
          frontImageUri: photo.uri,
          accountId,
          accountType,
          amount,
        });
      } else {
        // Back side captured - go to OCR processing
        const frontUri = route.params.frontImageUri || '';
        navigation.navigate('OCRProcessing', {
          frontImageUri: frontUri,
          backImageUri: photo.uri,
          accountId,
          accountType,
          amount,
        });
      }
    } catch (error) {
      console.error('Capture error:', error);
      speakHigh('Failed to capture image. Please try again.');
    }
  }, [side, accountId, accountType, amount, navigation]);

  // ── Manual capture ──────────────────────────────────────────────────────
  const handleManualCapture = useCallback(() => {
    speakMedium('Manually capturing.');
    handleAutoCapture();
  }, [handleAutoCapture]);

  // ── Voice commands — LLM maps natural speech to these action keys ────────
  useVoiceCommands(
    {
      CONFIRM: handleManualCapture,
      CANCEL: () => navigation.getParent()?.goBack(),
      GO_BACK: () => navigation.getParent()?.goBack(),
    },
    { context: 'CheckCapture' }
  );

  // ── Permission denied screen ────────────────────────────────────────────
  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Loading camera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
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

  // ── Border color based on state ─────────────────────────────────────────
  const getBorderColor = () => {
    if (currentState === 'perfect' || currentState === 'capturing') return COLORS.GREEN_600;
    if (currentState === 'good') return '#FFD700'; // Yellow
    return '#FF4444'; // Red
  };

  return (
    <View style={styles.container}>
      {/* Camera preview */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
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
          onPress={() => navigation.getParent()?.goBack()}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={32} color={COLORS.WHITE} />
        </Pressable>
      </CameraView>
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

  // Permission screen
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
