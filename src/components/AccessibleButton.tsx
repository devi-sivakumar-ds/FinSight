// ============================================================================
// AccessibleButton Component
// Fully accessible button with haptic feedback and proper a11y attributes
// ============================================================================

import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useHaptics } from '@hooks/useHaptics';
import { MIN_TOUCH_TARGET_SIZE, COLORS } from '@utils/constants';

interface AccessibleButtonProps {
  label: string;
  onPress: () => void;
  accessibilityHint?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  label,
  onPress,
  accessibilityHint,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  icon,
  style,
  textStyle,
}) => {
  const { selection } = useHaptics();

  const handlePress = () => {
    if (!disabled) {
      selection(); // Haptic feedback
      onPress();
    }
  };

  // Dynamic styles based on variant
  const buttonStyle = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    disabled && styles.button_disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_${variant}`],
    styles[`text_${size}`],
    disabled && styles.text_disabled,
    textStyle,
  ];

  return (
    <Pressable
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        ...buttonStyle,
        pressed && !disabled && styles.button_pressed,
      ]}
    >
      <View style={styles.content}>
        {icon && <View style={styles.icon}>{icon}</View>}
        <Text style={textStyles}>{label}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET_SIZE,
    minWidth: MIN_TOUCH_TARGET_SIZE,
  },

  // Variants
  button_primary: {
    backgroundColor: COLORS.BLUE_600,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  button_secondary: {
    backgroundColor: COLORS.GREEN_600,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.BLUE_600,
  },

  // Sizes
  button_small: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  button_medium: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  button_large: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },

  // States
  button_disabled: {
    backgroundColor: COLORS.GRAY_400,
    opacity: 0.5,
  },
  button_pressed: {
    opacity: 0.8,
  },

  // Content
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },

  // Text styles
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  text_primary: {
    color: COLORS.WHITE,
  },
  text_secondary: {
    color: COLORS.WHITE,
  },
  text_outline: {
    color: COLORS.BLUE_600,
  },
  text_small: {
    fontSize: 14,
  },
  text_medium: {
    fontSize: 16,
  },
  text_large: {
    fontSize: 18,
  },
  text_disabled: {
    color: COLORS.GRAY_700,
  },
});
