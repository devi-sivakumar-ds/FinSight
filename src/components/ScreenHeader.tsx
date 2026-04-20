// ============================================================================
// ScreenHeader Component
// Consistent header with optional close button
// ============================================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHaptics } from '@hooks/useHaptics';
import { COLORS, DARK_COLORS, MIN_TOUCH_TARGET_SIZE } from '@utils/constants';

interface ScreenHeaderProps {
  title?: string;
  showClose?: boolean;
  onClose?: () => void;
  accessibilityLabel?: string;
  /** Use dark color scheme for screens with dark backgrounds */
  dark?: boolean;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  showClose = false,
  onClose,
  accessibilityLabel,
  dark = false,
}) => {
  const { selection } = useHaptics();

  const handleClose = () => {
    if (onClose) {
      selection();
      onClose();
    }
  };

  return (
    <View
      style={[styles.container, dark && styles.containerDark]}
      accessible={false} // Let children handle accessibility
    >
      {title && (
        <Text
          style={[styles.title, dark && styles.titleDark]}
          accessible={true}
          accessibilityRole="header"
          accessibilityLabel={accessibilityLabel || title}
        >
          {title}
        </Text>
      )}

      {showClose && (
        <Pressable
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Close"
          accessibilityHint="Go back to previous screen"
          onPress={handleClose}
          style={({ pressed }) => [
            styles.closeButton,
            pressed && (dark ? styles.closeButtonPressedDark : styles.closeButtonPressed),
          ]}
        >
          <Ionicons
            name="close"
            size={24}
            color={dark ? DARK_COLORS.TEXT_PRIMARY : COLORS.GRAY_900}
          />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_200,
    backgroundColor: COLORS.WHITE,
  },
  containerDark: {
    borderBottomColor: DARK_COLORS.BORDER,
    backgroundColor: DARK_COLORS.BG,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.GRAY_900,
    flex: 1,
  },
  titleDark: {
    color: DARK_COLORS.TEXT_PRIMARY,
  },
  closeButton: {
    width: MIN_TOUCH_TARGET_SIZE,
    height: MIN_TOUCH_TARGET_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: MIN_TOUCH_TARGET_SIZE / 2,
  },
  closeButtonPressed: {
    backgroundColor: COLORS.GRAY_200,
  },
  closeButtonPressedDark: {
    backgroundColor: DARK_COLORS.SURFACE_2,
  },
});
