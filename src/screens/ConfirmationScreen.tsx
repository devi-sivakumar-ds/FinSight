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
import { useTTS } from '@hooks/useTTS';
import { useVoiceCommands } from '@hooks/useVoiceCommands';
import mockBankingAPI from '@services/mockBankingAPI';
import { formatAmountForSpeech, formatAmountDisplay } from '@utils/amountParser';
import { COLORS } from '@utils/constants';

type Props = {
  navigation: StackNavigationProp<DepositStackParamList, 'Confirmation'>;
  route: RouteProp<DepositStackParamList, 'Confirmation'>;
};

export const ConfirmationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { accountId, accountType, amount, frontImageUri, backImageUri, ocrData } = route.params;
  const { speakMedium, speakHigh } = useTTS();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const accountLabel = accountType === 'checking' ? 'Checking' : 'Savings';

  // Announce details on mount
  useEffect(() => {
    setTimeout(() => {
      speakMedium('Your check has been captured. Let me read the details.');
      setTimeout(() => {
        speakMedium(`Depositing ${formatAmountForSpeech(amount)}.`);
        if (ocrData?.checkNumber) {
          setTimeout(() => {
            const digits = ocrData.checkNumber.split('').join(' ');
            speakMedium(`Check number: ${digits}.`);
          }, 1200);
        }
        setTimeout(() => {
          speakMedium(`To your ${accountLabel} account.`);
          setTimeout(() => {
            speakMedium("Say 'confirm' to complete the deposit, or 'cancel' to start over.");
          }, 1200);
        }, ocrData?.checkNumber ? 2400 : 1200);
      }, 1000);
    }, 400);
  }, []);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    speakMedium('Submitting deposit...');

    try {
      // Convert images to Base64 (simplified for mock)
      const deposit = await mockBankingAPI.submitDeposit(
        accountId,
        amount,
        frontImageUri,
        backImageUri,
        ocrData?.checkNumber,
        ocrData?.routingNumber,
        ocrData?.accountNumber
      );

      // Navigate to success screen
      navigation.replace('Success', { deposit });
    } catch (error) {
      console.error('Deposit submission error:', error);
      speakHigh('There was a problem submitting your deposit. Please try again.');
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
    speakMedium('Returning to amount entry.');
    navigation.navigate('AmountInput', { accountId, accountType });
  }, [accountId, accountType, navigation]);

  const handleEditAccount = useCallback(() => {
    speakMedium('Returning to account selection.');
    navigation.navigate('AccountSelect');
  }, [navigation]);

  const handleCancel = useCallback(() => {
    navigation.getParent()?.goBack();
  }, [navigation]);

  // Voice commands
  useVoiceCommands(
    {
      'confirm-deposit': {
        phrases: ['confirm', 'submit', 'yes', 'looks good', 'correct'],
        action: handleSubmit,
        context: ['confirmation'],
      },
      'edit-amount': {
        phrases: ['wrong amount', 'change amount', 'edit amount'],
        action: handleEditAmount,
        context: ['confirmation'],
      },
      'edit-account': {
        phrases: ['wrong account', 'change account'],
        action: handleEditAccount,
        context: ['confirmation'],
      },
      'cancel': {
        phrases: ['cancel', 'no', 'go back'],
        action: handleCancel,
        context: ['confirmation'],
      },
    },
    { context: 'confirmation' }
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        accessibilityLabel="Deposit confirmation details"
      >
        <Text
          style={styles.title}
          accessible
          accessibilityRole="header"
        >
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
            <Text style={styles.detailValue}>
              {accountLabel} Account
            </Text>
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

      {/* Footer buttons */}
      <View style={styles.footer}>
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
          icon={isSubmitting ? <ActivityIndicator color={COLORS.WHITE} /> : undefined}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.WHITE },
  scrollContent: { padding: 24, gap: 24 },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.GRAY_900,
    marginBottom: 8,
  },
  card: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: COLORS.GRAY_200,
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 16,
    color: COLORS.GRAY_700,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 18,
    color: COLORS.GRAY_900,
    fontWeight: '600',
  },
  detailValueLarge: {
    fontSize: 28,
    color: COLORS.BLUE_600,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.GRAY_200,
  },
  editLinks: {
    paddingHorizontal: 4,
  },
  editText: {
    fontSize: 14,
    color: COLORS.GRAY_700,
    textAlign: 'center',
    lineHeight: 20,
  },
  editLink: {
    color: COLORS.BLUE_600,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
    gap: 12,
  },
  cancelButton: { flex: 1 },
  confirmButton: { flex: 2 },
});
