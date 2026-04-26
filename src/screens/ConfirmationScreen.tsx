// ============================================================================
// ConfirmationScreen
// Step 6 — Review check details before submitting
// ============================================================================

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { DepositStackParamList } from '@/types/index';
import { AccessibleButton } from '@components/AccessibleButton';
import { VoiceBanner } from '@components/VoiceBanner';
import { useTTS } from '@hooks/useTTS';
import { useVoiceCommands } from '@hooks/useVoiceCommands';
import { useAlwaysOnVoice } from '@hooks/useAlwaysOnVoice';
import { useVoiceSettings } from '@hooks/useVoiceSettings';
import mockBankingAPI from '@services/mockBankingAPI';
import { formatAmountForSpeech, formatAmountDisplay } from '@utils/amountParser';
import { DARK_COLORS } from '@utils/constants';
import { ttsStrings, v } from '@utils/ttsStrings';

type Props = {
  navigation: StackNavigationProp<DepositStackParamList, 'Confirmation'>;
  route: RouteProp<DepositStackParamList, 'Confirmation'>;
};

export const ConfirmationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { accountId, accountType, amount, frontImageUri, backImageUri, ocrData } = route.params;
  const { speakMedium, speakHigh } = useTTS();
  const { verbosity } = useVoiceSettings();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const { voiceState } = useAlwaysOnVoice();

  // Countdown refs
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasSubmittedRef = useRef(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const stopCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const accountLabel = accountType === 'checking' ? 'Checking' : 'Savings';
  const amountSpeech = formatAmountForSpeech(amount);
  const accountDigits = accountId === 'acc_1' ? '7749' : accountId === 'acc_2' ? '3182' : undefined;

  // Announce details on mount, then start countdown
  useEffect(() => {
    const ttsDuration = 5000;

    setTimeout(() => {
      speakMedium(v(verbosity, ttsStrings.confirmation.intro));
      setTimeout(() => {
        speakMedium(v(verbosity, ttsStrings.confirmation.reviewSummary(amountSpeech, accountDigits)));
        setTimeout(() => {
          speakMedium(v(verbosity, ttsStrings.confirmation.confirmPrompt));
        }, 1400);
      }, 1000);
    }, 400);

    // Start countdown after TTS chain ends
    const countdownStart = setTimeout(() => {
      // Animate progress bar over 10 seconds
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 10000,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();

      // Tick every second
      let remaining = 10;
      countdownIntervalRef.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        if (remaining <= 0) {
          stopCountdown();
          if (!hasSubmittedRef.current) {
            hasSubmittedRef.current = true;
            handleSubmit();
          }
        }
      }, 1000);
    }, ttsDuration);

    return () => {
      clearTimeout(countdownStart);
      stopCountdown();
    };
  }, [accountDigits, amountSpeech, progressAnim, speakMedium, stopCountdown, verbosity]);

  const handleSubmit = useCallback(async () => {
    stopCountdown();
    setIsSubmitting(true);
    speakMedium(v(verbosity, ttsStrings.confirmation.submitting));

    try {
      const deposit = await mockBankingAPI.submitDeposit(
        accountId,
        amount,
        frontImageUri,
        backImageUri,
        ocrData?.checkNumber,
        ocrData?.routingNumber,
        ocrData?.accountNumber
      );

      navigation.replace('Success', { deposit });
    } catch (error) {
      console.error('Deposit submission error:', error);
      speakHigh(v(verbosity, ttsStrings.confirmation.submitError));
      setIsSubmitting(false);
      setTimeout(() => {
        navigation.navigate('Error', {
          error: 'Failed to submit deposit. Please try again.',
          canRetry: true,
        });
      }, 2000);
    }
  }, [accountId, amount, frontImageUri, backImageUri, ocrData, navigation, stopCountdown]);

  const handleEditAmount = useCallback(() => {
    speakMedium(v(verbosity, ttsStrings.confirmation.editAmount));
    navigation.navigate('AmountInput', { accountId, accountType });
  }, [accountId, accountType, navigation]);

  const handleEditAccount = useCallback(() => {
    speakMedium(v(verbosity, ttsStrings.confirmation.editAccount));
    navigation.navigate('AccountSelect');
  }, [navigation]);

  const handleCancel = useCallback(() => {
    stopCountdown();
    navigation.getParent()?.goBack();
  }, [navigation, stopCountdown]);

  // Voice commands — LLM maps natural speech to these action keys
  useVoiceCommands(
    {
      CONFIRM: handleSubmit,
      GO_BACK: handleEditAmount,
      CANCEL: handleCancel,
    },
    { context: 'Confirmation' }
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        accessibilityLabel="Deposit confirmation details"
      >
        <Text style={styles.title} accessible accessibilityRole="header">
          Confirm Deposit
        </Text>

        {/* Details card */}
        <View style={styles.card}>
          {/* Amount */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text
              style={styles.detailValueLarge}
              accessible
              accessibilityLabel={`Amount: ${formatAmountForSpeech(amount)}`}
            >
              {formatAmountDisplay(amount)}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Check number */}
          {ocrData?.checkNumber && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Check Number</Text>
                <Text
                  style={styles.detailValue}
                  accessible
                  accessibilityLabel={`Check number: ${ocrData.checkNumber.split('').join(' ')}`}
                >
                  {ocrData.checkNumber}
                </Text>
              </View>
              <View style={styles.divider} />
            </>
          )}

          {/* Routing number (last 4) */}
          {ocrData?.routingNumber && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Routing Number</Text>
                <Text style={styles.detailValue}>···{ocrData.routingNumber.slice(-4)}</Text>
              </View>
              <View style={styles.divider} />
            </>
          )}

          {/* Account number (last 4) */}
          {ocrData?.accountNumber && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Check Account</Text>
                <Text style={styles.detailValue}>···{ocrData.accountNumber.slice(-4)}</Text>
              </View>
              <View style={styles.divider} />
            </>
          )}

          {/* Deposit to account */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Deposit To</Text>
            <Text style={styles.detailValue}>{accountLabel} Account</Text>
          </View>
        </View>

        {/* Edit links */}
        <View style={styles.editLinks}>
          <Text style={styles.editText}>
            Wrong amount or account?{' '}
            <Text
              style={styles.editLink}
              accessible
              accessibilityRole="button"
              onPress={handleEditAmount}
            >
              Edit Amount
            </Text>
            {' or '}
            <Text
              style={styles.editLink}
              accessible
              accessibilityRole="button"
              onPress={handleEditAccount}
            >
              Change Account
            </Text>
          </Text>
        </View>
      </ScrollView>

      {/* Footer — countdown auto-submit */}
      <View style={styles.footer}>
        <VoiceBanner
          state={voiceState}
          listeningText="Say 'confirm' to proceed, or 'cancel' to stop."
        />

        {/* Countdown card */}
        <View
          style={styles.countdownCard}
          accessible
          accessibilityLabel={
            isSubmitting
              ? 'Submitting your deposit'
              : `Submitting in ${countdown} seconds`
          }
        >
          <Text style={styles.countdownLabel}>
            {isSubmitting ? 'Submitting…' : 'Submitting in'}
          </Text>
          {!isSubmitting && (
            <Text style={styles.countdownNumber}>{countdown}</Text>
          )}
          {isSubmitting && (
            <ActivityIndicator
              size="large"
              color={DARK_COLORS.BLUE}
              style={{ marginVertical: 8 }}
            />
          )}
          {!isSubmitting && (
            <Text style={styles.countdownUnit}>seconds</Text>
          )}

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          <Text style={styles.countdownNote}>
            You can cancel during this countdown.
          </Text>
        </View>

        <AccessibleButton
          label="Cancel"
          onPress={handleCancel}
          disabled={isSubmitting}
          variant="outline"
          size="large"
          accessibilityHint="Cancel deposit and return to main screen"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK_COLORS.BG },
  scrollContent: { padding: 24, gap: 24 },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: DARK_COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  card: {
    backgroundColor: DARK_COLORS.SURFACE,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: DARK_COLORS.BORDER,
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 16,
    color: DARK_COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 18,
    color: DARK_COLORS.TEXT_PRIMARY,
    fontWeight: '600',
  },
  detailValueLarge: {
    fontSize: 28,
    color: DARK_COLORS.BLUE,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: DARK_COLORS.BORDER,
  },
  editLinks: {
    paddingHorizontal: 4,
  },
  editText: {
    fontSize: 14,
    color: DARK_COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
  },
  editLink: {
    color: DARK_COLORS.BLUE,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
    gap: 12,
  },
  countdownCard: {
    backgroundColor: DARK_COLORS.SURFACE,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: DARK_COLORS.BLUE,
    alignItems: 'center',
    gap: 6,
  },
  countdownLabel: {
    fontSize: 14,
    color: DARK_COLORS.TEXT_SECONDARY,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  countdownNumber: {
    fontSize: 64,
    fontWeight: 'bold',
    color: DARK_COLORS.BLUE,
    lineHeight: 72,
  },
  countdownUnit: {
    fontSize: 16,
    color: DARK_COLORS.TEXT_SECONDARY,
    fontWeight: '500',
    marginBottom: 8,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: DARK_COLORS.BORDER,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: DARK_COLORS.BLUE,
    borderRadius: 3,
  },
  countdownNote: {
    fontSize: 12,
    color: DARK_COLORS.TEXT_SECONDARY,
    marginTop: 8,
    textAlign: 'center',
  },
});
