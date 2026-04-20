// ============================================================================
// OCRProcessingScreen
// Step 5 — Convert images to Base64 and process with mock OCR
// ============================================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { DepositStackParamList } from '@/types/index';
import { useTTS } from '@hooks/useTTS';
import mockBankingAPI from '@services/mockBankingAPI';
import { DARK_COLORS } from '@utils/constants';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  navigation: StackNavigationProp<DepositStackParamList, 'OCRProcessing'>;
  route: RouteProp<DepositStackParamList, 'OCRProcessing'>;
};

export const OCRProcessingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { frontImageUri, backImageUri, accountId, accountType, amount } = route.params;
  const { speakMedium, speakHigh } = useTTS();

  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    speakMedium('Analyzing your check. This may take a moment.');
    processOCR();
  }, []);

  const processOCR = async () => {
    try {
      setStatus('processing');

      // Convert images to Base64
      const [frontBase64, backBase64] = await Promise.all([
        convertImageToBase64(frontImageUri),
        convertImageToBase64(backImageUri),
      ]);

      // Call mock OCR API
      const ocrResult = await mockBankingAPI.processCheckOCR(frontBase64, backBase64);

      if (ocrResult.success && ocrResult.data) {
        // Success - navigate to confirmation
        setStatus('success');
        navigation.replace('Confirmation', {
          accountId,
          accountType,
          amount,
          frontImageUri,
          backImageUri,
          ocrData: ocrResult.data,
        });
      } else {
        // OCR failed
        handleOCRFailure();
      }
    } catch (error) {
      console.error('OCR processing error:', error);
      handleOCRFailure();
    }
  };

  const handleOCRFailure = () => {
    setStatus('error');
    setRetryCount((prev) => prev + 1);

    if (retryCount >= 2) {
      // After 3 failures, go to error screen
      speakHigh('I had trouble reading the check after multiple attempts. Please try again later.');
      setTimeout(() => {
        navigation.navigate('Error', {
          error: 'Failed to read check after multiple attempts.',
          canRetry: true,
          retryScreen: 'CheckCapture',
        });
      }, 2000);
    } else {
      // Retry: go back to camera
      speakHigh("I had trouble reading the check. Let's try again with better lighting.");
      setTimeout(() => {
        navigation.navigate('CheckCapture', {
          accountId,
          accountType,
          amount,
          side: 'front',
        });
      }, 2500);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Animated scanning icon */}
        <View style={styles.iconContainer}>
          {status === 'processing' && (
            <>
              <Ionicons
                name="scan"
                size={100}
                color={DARK_COLORS.BLUE}
                accessible
                accessibilityLabel="Scanning"
              />
              <ActivityIndicator
                size="large"
                color={DARK_COLORS.BLUE}
                style={styles.spinner}
                accessibilityLabel="Processing"
              />
            </>
          )}
          {status === 'error' && (
            <Ionicons
              name="alert-circle"
              size={100}
              color={DARK_COLORS.RED}
              accessible
              accessibilityLabel="Error"
            />
          )}
        </View>

        {/* Status text */}
        <Text
          style={styles.title}
          accessible
          accessibilityRole="header"
          accessibilityLiveRegion="polite"
        >
          {status === 'processing' && 'Analyzing Your Check'}
          {status === 'error' && 'Processing Failed'}
        </Text>

        <Text
          style={styles.subtitle}
          accessibilityLiveRegion="polite"
        >
          {status === 'processing' && 'Please wait while we read your check information...'}
          {status === 'error' && `Attempt ${retryCount + 1} of 3. Retrying...`}
        </Text>

        {/* Progress indicator */}
        {status === 'processing' && (
          <View style={styles.progressContainer}>
            <View style={styles.progressDot} />
            <View style={[styles.progressDot, styles.progressDotDelay1]} />
            <View style={[styles.progressDot, styles.progressDotDelay2]} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

/**
 * Convert image file to Base64 string
 */
async function convertImageToBase64(uri: string): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });
    return base64;
  } catch (error) {
    console.error('Error converting image to Base64:', error);
    throw error;
  }
}

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
  progressContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: DARK_COLORS.BLUE,
    opacity: 0.3,
  },
  progressDotDelay1: {
    opacity: 0.6,
  },
  progressDotDelay2: {
    opacity: 1,
  },
});
