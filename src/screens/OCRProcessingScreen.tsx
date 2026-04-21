// ============================================================================
// OCRProcessingScreen
// Phase 1 stub — skips OCR and navigates directly to Confirmation using the
// amount the user entered before capturing the check.
//
// Phase 2 will replace the setTimeout below with a real Groq Vision API call.
// ============================================================================

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { DepositStackParamList } from '@/types/index';
import { useTTS } from '@hooks/useTTS';
import ttsService from '@services/ttsService';
import { DARK_COLORS } from '@utils/constants';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  navigation: StackNavigationProp<DepositStackParamList, 'OCRProcessing'>;
  route: RouteProp<DepositStackParamList, 'OCRProcessing'>;
};

export const OCRProcessingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { frontImageUri, backImageUri, accountId, accountType, amount } = route.params;
  const { speakMedium } = useTTS();

  useEffect(() => {
    // Stop any lingering TTS from the camera screen immediately
    ttsService.reset();

    speakMedium('Check captured. Preparing your deposit details.');

    // ── Phase 1: bypass OCR — go straight to Confirmation ─────────────────
    // The amount the user spoke/typed before scanning is used as-is.
    // Phase 2 will read frontImageUri + backImageUri via Groq Vision here.
    const timer = setTimeout(() => {
      navigation.replace('Confirmation', {
        accountId,
        accountType,
        amount,           // pre-entered amount — no OCR needed yet
        frontImageUri,
        backImageUri,
        ocrData: undefined, // no check number / routing / account data yet
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Scanning icon */}
        <View style={styles.iconContainer}>
          <Ionicons
            name="scan"
            size={100}
            color={DARK_COLORS.BLUE}
            accessible
            accessibilityLabel="Processing check"
          />
          <ActivityIndicator
            size="large"
            color={DARK_COLORS.BLUE}
            style={styles.spinner}
            accessibilityLabel="Please wait"
          />
        </View>

        <Text style={styles.title} accessible accessibilityRole="header">
          Check Captured
        </Text>

        <Text style={styles.subtitle}>Preparing deposit details…</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK_COLORS.BG },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 16,
    alignItems: 'center',
  },
  spinner: {
    position: 'absolute',
    bottom: -40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: DARK_COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginTop: 40,
  },
  subtitle: {
    fontSize: 16,
    color: DARK_COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
  },
});
