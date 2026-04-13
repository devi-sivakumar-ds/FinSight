// ============================================================================
// SettingsScreen Component
// Placeholder settings screen
// ============================================================================

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useTTS } from '@hooks/useTTS';
import { COLORS } from '@utils/constants';

export const SettingsScreen: React.FC = () => {
  const { speakMedium } = useTTS();

  useEffect(() => {
    speakMedium('Settings screen');
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text
          style={styles.title}
          accessible={true}
          accessibilityRole="header"
        >
          Settings
        </Text>
        <Text style={styles.subtitle}>
          Settings will be available in a future update
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: COLORS.GRAY_900,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.GRAY_700,
    textAlign: 'center',
  },
});
