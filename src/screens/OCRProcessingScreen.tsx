// ============================================================================
// OCRProcessingScreen
// Sends the captured check image to Groq Vision for MICR + amount extraction.
//
// Flow:
//   1. Stop any lingering TTS, announce "Analyzing your check"
//   2. Call extractCheckData(frontImageUri) — Groq Vision API
//   3a. Success: navigate to Confirmation with ocrData
//   3b. Soft failure (bad image / parse error): navigate to Confirmation
//       without ocrData — user-entered amount still used
//   3c. Hard failure (network / auth): navigate to Error screen with retry
// ============================================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { DepositStackParamList } from '@/types/index';
import { useTTS } from '@hooks/useTTS';
import { useVoiceSettings } from '@hooks/useVoiceSettings';
import ttsService from '@services/ttsService';
import { extractCheckData } from '@services/ocrService';
import { isPureWozMode } from '@/config/studyMode';
import { DARK_COLORS } from '@utils/constants';
import { ttsStrings, v } from '@utils/ttsStrings';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  navigation: StackNavigationProp<DepositStackParamList, 'OCRProcessing'>;
  route: RouteProp<DepositStackParamList, 'OCRProcessing'>;
};

// Hard errors that should surface an Error screen (with retry).
// Soft errors (bad image quality, parse failures) just skip OCR and continue.
const HARD_ERROR_PATTERNS = ['API key', 'Invalid Groq', 'Network error'];

function isHardError(errors: string[]): boolean {
  return errors.some(e => HARD_ERROR_PATTERNS.some(p => e.includes(p)));
}

export const OCRProcessingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { frontImageUri, backImageUri, accountId, accountType, amount } = route.params;
  const { speakMedium } = useTTS();
  const { verbosity } = useVoiceSettings();
  const [statusText, setStatusText] = useState('Analyzing your check…');

  useEffect(() => {
    let cancelled = false;

    // Stop any lingering TTS from the camera screen immediately
    ttsService.reset();
    speakMedium(v(verbosity, ttsStrings.ocrProcessing.processing));

    if (isPureWozMode()) {
      setStatusText('Waiting for operator review…');
      setTimeout(() => {
        if (!cancelled) {
          speakMedium(v(verbosity, ttsStrings.ocrProcessing.waitingForOperator));
        }
      }, 1000);
      return () => { cancelled = true; };
    }

    async function runOCR() {
      try {
        setStatusText('Reading check details…');
        const result = await extractCheckData(frontImageUri);

        if (cancelled) return;

        if (result.success && result.data) {
          // OCR succeeded — pass data to Confirmation
          const { routingNumber, accountNumber, checkNumber } = result.data;
          const hasData = routingNumber || accountNumber || checkNumber;

          if (hasData) {
            setStatusText('Check details extracted!');
            speakMedium('Check details found. Reviewing now.');
          } else {
            // Groq returned nulls for all fields — soft failure
            setStatusText('Proceeding with entered amount.');
            speakMedium('Could not read all check details. Using your entered amount.');
          }

          setTimeout(() => {
            if (cancelled) return;
            navigation.replace('Confirmation', {
              accountId,
              accountType,
              amount,
              frontImageUri,
              backImageUri,
              ocrData: hasData ? result.data : undefined,
            });
          }, 1200);

        } else {
          // OCR failed
          const errors = result.errors ?? [];

          if (isHardError(errors)) {
            // Surface to ErrorScreen so user can retry
            speakMedium('Could not connect to check reading service. Please try again.');
            setTimeout(() => {
              if (cancelled) return;
              navigation.navigate('Error', {
                error: errors[0] ?? 'OCR service unavailable',
                canRetry: true,
              });
            }, 2000);
          } else {
            // Soft failure — skip OCR, continue with user-entered amount
            setStatusText('Proceeding with entered amount.');
            speakMedium('Could not read check. Using your entered amount.');
            setTimeout(() => {
              if (cancelled) return;
              navigation.replace('Confirmation', {
                accountId,
                accountType,
                amount,
                frontImageUri,
                backImageUri,
                ocrData: undefined,
              });
            }, 1500);
          }
        }
      } catch (e) {
        if (cancelled) return;
        console.error('[OCRProcessingScreen] unexpected error:', e);
        // Unexpected crash — graceful degradation
        navigation.replace('Confirmation', {
          accountId,
          accountType,
          amount,
          frontImageUri,
          backImageUri,
          ocrData: undefined,
        });
      }
    }

    runOCR();

    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
            accessibilityLabel="Analyzing check"
          />
          <ActivityIndicator
            size="large"
            color={DARK_COLORS.BLUE}
            style={styles.spinner}
            accessibilityLabel="Please wait"
          />
        </View>

        <Text style={styles.title} accessible accessibilityRole="header">
          Analyzing Check
        </Text>

        <Text style={styles.subtitle}>{statusText}</Text>

        {!!backImageUri && (
          <View style={styles.previewContainer}>
            <Image
              source={{ uri: backImageUri }}
              style={styles.previewImage}
              resizeMode="contain"
              accessible
              accessibilityLabel="Captured check image preview"
            />
          </View>
        )}
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
  previewContainer: {
    width: '100%',
    maxWidth: 320,
    aspectRatio: 1.8,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: DARK_COLORS.BORDER,
    backgroundColor: DARK_COLORS.SURFACE,
    marginTop: 8,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
});
