// ============================================================================
// VoiceButton Component
// Microphone button with pulsing animation when listening
// ============================================================================

import React, { useEffect, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHaptics } from '@hooks/useHaptics';
import { COLORS } from '@utils/constants';

interface VoiceButtonProps {
  isListening: boolean;
  onPress: () => void;
  size?: number;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  isListening,
  onPress,
  size = 100,
  accessibilityLabel = 'Voice Command',
  accessibilityHint = 'Tap to start or stop voice commands',
}) => {
  const { medium } = useHaptics();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Pulsing animation when listening
  useEffect(() => {
    if (isListening) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 1.1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.7,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
        ])
      );

      pulseAnimation.start();

      return () => {
        pulseAnimation.stop();
        scaleAnim.setValue(1);
        opacityAnim.setValue(1);
      };
    } else {
      // Reset animation when not listening
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isListening]);

  const handlePress = () => {
    medium();
    onPress();
  };

  return (
    <Pressable
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected: isListening }}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        { width: size, height: size },
        pressed && styles.pressed,
      ]}
    >
      <Animated.View
        style={[
          styles.button,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <View style={[styles.inner, isListening && styles.listening]}>
          <Ionicons
            name={isListening ? 'mic' : 'mic-outline'}
            size={size * 0.4}
            color={COLORS.WHITE}
          />
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    width: '100%',
    height: '100%',
    borderRadius: 999, // Fully circular
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  inner: {
    flex: 1,
    backgroundColor: COLORS.BLUE_500,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listening: {
    backgroundColor: '#ff4444', // Red when listening
  },
  pressed: {
    opacity: 0.8,
  },
});
