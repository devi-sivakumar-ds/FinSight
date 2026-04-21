// ============================================================================
// ConfirmationScreen
// Step 6 — Review check details before submitting
// ============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
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
  const { voiceState } = useAlwaysOnVoice();

  const accountLabel = accountType === 'checking' ? 'Checking' : 'Savings';

  // Announce details on mount
  useEffect(() => {
    setTimeout(() => {
      speakMedium(v(verbosity, ttsStrings.confirmation.intro));
      setTimeout(() => {
        speakMedium(v(verbosity, ttsStrings.confirmation.depositAmount(formatAmountForSpeech(amount))));
        if (ocrData?.checkNumber) {
          setTimeout(() => {
            const digits = ocrData.checkNumber.split('').join(' ');
            const ckStr = v(verbosity, ttsStrings.confirmation.checkNumber(digits));
            if (ckStr) speakMedium(ckStr);
          }, 1200);
        }
        setTimeout(() => {
          speakMedium(v(verbosity, ttsStrings.confirmation.toAccount(accountLabel)));
          setTimeout(() => {
            speakMedium(v(verbosity, ttsStrings.confirmation.confirmPrompt));
          }, 1200);
        }, ocrData?.checkNumber ? 2400 : 1200);
      }, 1000);
    }, 400);
  }, []);

  const handleSubmit = useCallback(async () => {
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
  }, [accountId, amount, frontImageUri, backImageUri, ocrData, navigation]);

  const handleEditAmount = useCallback(() => {
    speakMedium(v(verbosity, ttsStrings.confirmation.editAmount));
    navigation.navigate('AmountInput', { accountId, accountType });
  }, [accountId, accountType, navigation]);

  const handleEditAccount = useCallback(() => {
    speakMedium(v(verbosity, ttsStrings.confirmation.editAccount));
    navigation.navigate('AccountSelect');
  }, [navigation]);

  const handleCancel = useCallback(() => {
    navigation.getParent()?.goBack();
  }, [navigation]);

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

      {/* Footer */}
      <View style={styles.footer}>
        <VoiceBanner
          state={voiceState}
          listeningText="Say 'confirm' to submit or 'cancel' to go back."
        />
        <View style={styles.footerButtons}>
          <AccessibleButton
            label="Cancel"
            onPress={handleCancel}
            disabled={isSubmitting}
            variant="outline"
            size="large"
            style={styles.cancelButton}
            accessibilityHint="Cancel deposit and return to main screen"
          />
          <AccessibleButton
            label={isSubmitting ? 'Submitting...' : 'Confirm Deposit'}
            onPress={handleSubmit}
            disabled={isSubmitting}
            size="large"
            style={styles.confirmButton}
            accessibilityHint="Submit check deposit for processing"
            icon={isSubmitting ? <ActivityIndicator color="#fff" /> : undefined}
          />
        </View>
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
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: { flex: 1 },
  confirmButton: { flex: 2 },
});
