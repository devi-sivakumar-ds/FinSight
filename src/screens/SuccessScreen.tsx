// ============================================================================
// SuccessScreen
// Final step — Deposit submitted successfully
// ============================================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { DepositStackParamList } from '@/types/index';
import { AccessibleButton } from '@components/AccessibleButton';
import { useTTS } from '@hooks/useTTS';
import { useVoiceCommands } from '@hooks/useVoiceCommands';
import { formatAmountForSpeech, formatAmountDisplay } from '@utils/amountParser';
import { COLORS } from '@utils/constants';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  navigation: StackNavigationProp<DepositStackParamList, 'Success'>;
  route: RouteProp<DepositStackParamList, 'Success'>;
};

export const SuccessScreen: React.FC<Props> = ({ navigation, route }) => {
  const { deposit } = route.params;
  const { speakMedium, speakHigh } = useTTS();

  const [countdown, setCountdown] = useState(10);

  // Announce success on mount
  useEffect(() => {
    setTimeout(() => {
      speakHigh('Deposit submitted successfully.');
      setTimeout(() => {
        speakMedium('Your check will be reviewed and funds will be available within 1 to 2 business days.');
        const confirmNum = deposit.confirmationNumber;
        if (confirmNum) {
          setTimeout(() => {
            const digits = confirmNum.split('').join(' ');
            speakMedium(`Confirmation number: ${digits}.`);
          }, 2500);
        }
      }, 1500);
    }, 400);
  }, []);

  // Auto-return countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleDone();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleDone = () => {
    // Navigate back to main screen (exit deposit flow)
    navigation.getParent()?.getParent()?.navigate('TabNavigator');
  };

  // Voice commands
  useVoiceCommands(
    {
      done: {
        phrases: ['done', 'home', 'finish', 'close', 'exit'],
        action: handleDone,
        context: ['success'],
      },
    },
    { context: 'success' }
  );

  const expectedDate = deposit.expectedAvailability
    ? new Date(deposit.expectedAvailability).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'within 1-2 business days';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success icon */}
        <View style={styles.iconContainer}>
          <Ionicons
            name="checkmark-circle"
            size={120}
            color={COLORS.GREEN_600}
            accessible
            accessibilityLabel="Success"
          />
        </View>

        {/* Title */}
        <Text
          style={styles.title}
          accessible
          accessibilityRole="header"
        >
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
          <Ionicons name="information-circle" size={20} color={COLORS.BLUE_600} />
          <Text style={styles.infoText}>
            Your deposit is being processed. You'll receive a notification once it's complete.
          </Text>
        </View>

        {/* Auto-return countdown */}
        <Text
          style={styles.countdown}
          accessibilityLiveRegion="polite"
        >
          Returning to home in {countdown} seconds...
        </Text>
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
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.WHITE },
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
    color: COLORS.GRAY_900,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 8,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.GREEN_50,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: COLORS.GREEN_600,
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 15,
    color: COLORS.GRAY_700,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 18,
    color: COLORS.GRAY_900,
    fontWeight: '700',
  },
  detailValueMono: {
    fontSize: 16,
    color: COLORS.GRAY_900,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.GREEN_600,
    opacity: 0.2,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.BLUE_50,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.GRAY_700,
    lineHeight: 20,
  },
  countdown: {
    fontSize: 14,
    color: COLORS.GRAY_400,
    marginTop: 8,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
  },
  doneButton: { width: '100%' },
});
