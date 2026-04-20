// ============================================================================
// VoiceBanner — always-on voice status strip
//
// Pure display component; no mic button. The mic is always running.
// VoiceService broadcasts state via addStateListener → useAlwaysOnVoice hook.
//
// States:
//   listening  — blue pulsing dot + optional screen-specific prompt
//   processing — spinner + "Processing…"
//   paused     — dimmed mic icon + "Speaking…" (TTS active)
//   error      — red flash + "Didn't catch that."
// ============================================================================

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AlwaysOnVoiceState } from '@/types/index';
import { DARK_COLORS } from '@utils/constants';

interface VoiceBannerProps {
  state: AlwaysOnVoiceState;
  /** Screen-specific prompt shown while listening. */
  listeningText?: string;
}

const DEFAULT_TEXTS: Record<AlwaysOnVoiceState, string> = {
  listening: "I'm listening…",
  processing: 'Got it, just a moment…',
  paused: 'Speaking…',
  error: "Didn't catch that. Try again.",
};

export const VoiceBanner: React.FC<VoiceBannerProps> = ({ state, listeningText }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const errorAnim = useRef(new Animated.Value(0)).current;

  // Pulse the indicator dot while listening
  useEffect(() => {
    if (state === 'listening') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.4, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 700, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => { loop.stop(); pulseAnim.setValue(1); };
    } else {
      pulseAnim.setValue(1);
    }
  }, [state]);

  // Red background flash on error
  useEffect(() => {
    if (state === 'error') {
      Animated.sequence([
        Animated.timing(errorAnim, { toValue: 1, duration: 150, useNativeDriver: false }),
        Animated.timing(errorAnim, { toValue: 0, duration: 600, useNativeDriver: false }),
      ]).start();
    } else {
      errorAnim.setValue(0);
    }
  }, [state]);

  const bannerText =
    state === 'listening' && listeningText ? listeningText : DEFAULT_TEXTS[state];

  const errorBg = errorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', 'rgba(255,69,58,0.12)'],
  });

  // Indicator element varies by state
  const renderIndicator = () => {
    if (state === 'processing') {
      return (
        <View style={styles.iconWrap}>
          <ActivityIndicator color={DARK_COLORS.TEXT_SECONDARY} size="small" />
        </View>
      );
    }

    if (state === 'paused') {
      return (
        <View style={[styles.iconWrap, styles.iconWrapPaused]}>
          <Ionicons name="volume-high" size={20} color={DARK_COLORS.TEXT_MUTED} />
        </View>
      );
    }

    if (state === 'error') {
      return (
        <View style={[styles.iconWrap, styles.iconWrapError]}>
          <Ionicons name="mic-off" size={20} color={DARK_COLORS.RED} />
        </View>
      );
    }

    // listening — pulsing blue dot
    return (
      <View style={styles.iconWrap}>
        <Animated.View
          style={[
            styles.listeningDot,
            { transform: [{ scale: pulseAnim }] },
          ]}
        />
      </View>
    );
  };

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: errorBg }]}
    >
      {renderIndicator()}

      <Text
        style={[
          styles.bannerText,
          state === 'listening' && styles.bannerTextActive,
          state === 'error' && styles.bannerTextError,
          state === 'paused' && styles.bannerTextMuted,
        ]}
        accessibilityLiveRegion={state === 'error' ? 'assertive' : 'polite'}
        numberOfLines={2}
      >
        {bannerText}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DARK_COLORS.SURFACE,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: DARK_COLORS.BORDER,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DARK_COLORS.SURFACE_2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapPaused: {
    backgroundColor: DARK_COLORS.SURFACE_2,
  },
  iconWrapError: {
    backgroundColor: '#3a1010',
  },
  listeningDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: DARK_COLORS.BLUE,
  },
  bannerText: {
    flex: 1,
    fontSize: 15,
    color: DARK_COLORS.TEXT_SECONDARY,
    lineHeight: 21,
  },
  bannerTextActive: {
    color: DARK_COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  bannerTextError: {
    color: DARK_COLORS.RED,
    fontWeight: '500',
  },
  bannerTextMuted: {
    color: DARK_COLORS.TEXT_MUTED,
  },
});
