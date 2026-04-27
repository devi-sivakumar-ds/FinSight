// ============================================================================
// SuccessScreen
// Final step — Deposit submitted successfully
// ============================================================================

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { DepositStackParamList, HapticPattern } from '@/types/index';
import { isPureWozMode } from '@/config/studyMode';
import { AccessibleButton } from '@components/AccessibleButton';
import { VisualMic } from '@components/VisualMic';
import { useTTS } from '@hooks/useTTS';
import { useHaptics } from '@hooks/useHaptics';
import { useVoiceCommands } from '@hooks/useVoiceCommands';
import { useVoiceSettings } from '@hooks/useVoiceSettings';
import { formatAmountForSpeech, formatAmountDisplay } from '@utils/amountParser';
import { DARK_COLORS } from '@utils/constants';
import { ttsStrings, v } from '@utils/ttsStrings';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  navigation: StackNavigationProp<DepositStackParamList, 'Success'>;
  route: RouteProp<DepositStackParamList, 'Success'>;
};

export const SuccessScreen: React.FC<Props> = ({ navigation, route }) => {
  const { deposit, summaryText } = route.params;
  const { speakMedium, speakHigh } = useTTS();
  const { trigger } = useHaptics();
  const { verbosity } = useVoiceSettings();
  const pureWozMode = isPureWozMode();
  const expectedDate = deposit.expectedAvailability
    ? new Date(deposit.expectedAvailability).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'within 1-2 business days';
  const submittedDate = new Date(deposit.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const handleDone = () => {
    navigation.getParent()?.goBack();
  };

  // Announce success on mount — haptic burst first, then voice
  useEffect(() => {
    // Immediate haptic celebration: three quick pulses
    trigger(HapticPattern.SUCCESS);
    setTimeout(() => trigger(HapticPattern.SUCCESS), 250);
    setTimeout(() => trigger(HapticPattern.SUCCESS), 500);

    if (pureWozMode) {
      if (!summaryText) {
        return undefined;
      }

      const timer = setTimeout(() => {
        speakHigh(summaryText);
      }, 400);

      return () => clearTimeout(timer);
    }

    setTimeout(() => {
      speakHigh(v(verbosity, ttsStrings.success.received(formatAmountDisplay(deposit.amount), submittedDate)));
      setTimeout(() => {
        const availStr = deposit.expectedAvailability
          ? v(verbosity, ttsStrings.success.availableByDate(expectedDate))
          : v(verbosity, ttsStrings.success.availability);
        if (availStr) speakMedium(availStr);
        const confirmNum = deposit.confirmationNumber;
        if (confirmNum) {
          setTimeout(() => {
            const digits = confirmNum.split('').join(' ');
            speakMedium(v(verbosity, ttsStrings.success.confirmationNumber(digits)));
          }, 2500);
        }
        setTimeout(() => {
          const exitStr = v(verbosity, ttsStrings.success.exitPrompt);
          if (exitStr) speakMedium(exitStr);
        }, confirmNum ? 5500 : 3000);
      }, 1500);
    }, 400);
  }, [deposit.amount, deposit.confirmationNumber, deposit.expectedAvailability, expectedDate, handleDone, pureWozMode, speakHigh, speakMedium, submittedDate, summaryText, trigger, verbosity]);

  // Voice commands — LLM maps natural speech to these action keys
  useVoiceCommands(
    {
      CONFIRM: handleDone,
      GO_BACK: handleDone,
      CANCEL: handleDone,
    },
    { context: 'Success' }
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success icon */}
        <View style={styles.iconContainer}>
          <Ionicons
            name="checkmark-circle"
            size={120}
            color={DARK_COLORS.GREEN}
            accessible
            accessibilityLabel="Success"
          />
        </View>

        {/* Title */}
        <Text style={styles.title} accessible accessibilityRole="header">
          Deposit Submitted Successfully
        </Text>

        {/* Details card */}
        <View style={styles.card}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text
              style={styles.detailValue}
              accessible
              accessibilityLabel={`Amount: ${formatAmountForSpeech(deposit.amount)}`}
            >
              {formatAmountDisplay(deposit.amount)}
            </Text>
          </View>

          {deposit.confirmationNumber && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Confirmation</Text>
                <Text
                  style={styles.detailValueMono}
                  accessible
                  accessibilityLabel={`Confirmation number: ${deposit.confirmationNumber.split('').join(' ')}`}
                >
                  {deposit.confirmationNumber}
                </Text>
              </View>
            </>
          )}

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Expected Availability</Text>
            <Text style={styles.detailValue}>{expectedDate}</Text>
          </View>
        </View>

        {/* Info message */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={DARK_COLORS.BLUE} />
          <Text style={styles.infoText}>
            Your deposit is being processed. You'll receive a notification once it's complete.
          </Text>
        </View>

      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <AccessibleButton
          label="Done"
          onPress={handleDone}
          size="large"
          style={styles.doneButton}
          accessibilityHint="Return to main screen"
        />
        <View style={styles.micWrap}>
          <VisualMic size="small" />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK_COLORS.BG },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    alignItems: 'center',
    gap: 24,
  },
  iconContainer: {
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: DARK_COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 8,
  },
  card: {
    width: '100%',
    backgroundColor: DARK_COLORS.SURFACE,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: DARK_COLORS.GREEN,
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 15,
    color: DARK_COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 18,
    color: DARK_COLORS.TEXT_PRIMARY,
    fontWeight: '700',
  },
  detailValueMono: {
    fontSize: 16,
    color: DARK_COLORS.TEXT_PRIMARY,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: DARK_COLORS.GREEN,
    opacity: 0.3,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: DARK_COLORS.BLUE_DIM,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: DARK_COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
    gap: 12,
  },
  micWrap: {
    alignItems: 'center',
    paddingTop: 8,
  },
  doneButton: { width: '100%' },
});
