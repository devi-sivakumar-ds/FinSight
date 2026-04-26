import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@utils/constants';

type Props = {
  size?: 'small' | 'medium' | 'large';
};

const SIZE_MAP = {
  small: {
    outer: 72,
    icon: 32,
  },
  medium: {
    outer: 92,
    icon: 40,
  },
  large: {
    outer: 112,
    icon: 52,
  },
} as const;

export const VisualMic: React.FC<Props> = ({ size = 'medium' }) => {
  const dims = SIZE_MAP[size];

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.mic,
        {
          width: dims.outer,
          height: dims.outer,
          borderRadius: dims.outer / 2,
        },
      ]}
    >
      <Ionicons name="mic" size={dims.icon} color={COLORS.BLUE_500} />
    </View>
  );
};

const styles = StyleSheet.create({
  mic: {
    backgroundColor: COLORS.WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 8,
  },
});
