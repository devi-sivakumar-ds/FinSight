// ============================================================================
// AccountSelectScreen
// Step 1 of deposit flow — pick which account to deposit into
// ============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { DepositStackParamList, Account } from '@/types/index';
import { ScreenHeader } from '@components/ScreenHeader';
import { AccessibleButton } from '@components/AccessibleButton';
import { useTTS } from '@hooks/useTTS';
import { useHaptics } from '@hooks/useHaptics';
import { useVoiceCommands } from '@hooks/useVoiceCommands';
import mockBankingAPI from '@services/mockBankingAPI';
import { formatCurrencyForSpeech, formatAccountNumberForSpeech } from '@utils/accessibility';
import { COLORS, MIN_TOUCH_TARGET_SIZE } from '@utils/constants';

type Props = {
  navigation: StackNavigationProp<DepositStackParamList, 'AccountSelect'>;
};

export const AccountSelectScreen: React.FC<Props> = ({ navigation }) => {
  const { speakMedium, speakHigh } = useTTS();
  const { selection, trigger } = useHaptics();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load accounts and announce
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await mockBankingAPI.getAccounts();
      if (cancelled) return;
      setAccounts(data);
      setLoading(false);

      // Announce after short delay so screen is rendered
      setTimeout(() => {
        speakMedium('Which account do you want to deposit to?');
        setTimeout(() => {
          speakMedium(`You have ${data.length} accounts.`);
          data.forEach((acc, i) => {
            setTimeout(() => {
              const typeLabel = acc.type === 'checking' ? 'Checking' : 'Savings';
              const digits = acc.displayNumber.split('').join(' ');
              const balance = formatCurrencyForSpeech(acc.balance);
              speakMedium(`${typeLabel} ending in ${digits}, balance ${balance}`);
            }, (i + 1) * 1800);
          });
        }, 1200);
      }, 400);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSelect = useCallback((account: Account) => {
    setSelectedId(account.id);
    selection();
    const typeLabel = account.type === 'checking' ? 'Checking' : 'Savings';
    const digits = account.displayNumber.split('').join(' ');
    speakMedium(`${typeLabel} ending in ${digits} selected.`);
  }, []);

  const handleContinue = useCallback(() => {
    const account = accounts.find(a => a.id === selectedId);
    if (!account) {
      speakHigh('Please select an account first.');
      return;
    }
    navigation.navigate('AmountInput', {
      accountId: account.id,
      accountType: account.type,
    });
  }, [selectedId, accounts, navigation]);

  const handleClose = useCallback(() => {
    navigation.getParent()?.goBack();
  }, [navigation]);

  // Voice commands
  useVoiceCommands(
    {
      'select-checking': {
        phrases: ['checking', 'checking account', 'first', 'first one', 'first account'],
        action: () => {
          const acc = accounts.find(a => a.type === 'checking');
          if (acc) handleSelect(acc);
        },
        context: ['account-select'],
        confirmation: 'Checking account selected',
      },
      'select-savings': {
        phrases: ['savings', 'savings account', 'second', 'second one', 'second account'],
        action: () => {
          const acc = accounts.find(a => a.type === 'savings');
          if (acc) handleSelect(acc);
        },
        context: ['account-select'],
        confirmation: 'Savings account selected',
      },
      'continue': {
        phrases: ['continue', 'next', 'confirm', 'proceed'],
        action: handleContinue,
        context: ['account-select'],
      },
      'cancel': {
        phrases: ['cancel', 'go back', 'exit'],
        action: handleClose,
        context: ['account-select'],
      },
    },
    { context: 'account-select' }
  );

  const renderAccount = ({ item, index }: { item: Account; index: number }) => {
    const isSelected = item.id === selectedId;
    const typeLabel = item.type === 'checking' ? 'Checking' : 'Savings';
    const digits = item.displayNumber.split('').join(' ');
    const a11yLabel = `${typeLabel} ending in ${digits}, balance ${formatCurrencyForSpeech(item.balance)}`;

    return (
      <Pressable
        accessible
        accessibilityRole="radio"
        accessibilityLabel={a11yLabel}
        accessibilityState={{ selected: isSelected, checked: isSelected }}
        accessibilityValue={{ text: `${index + 1} of ${accounts.length}` }}
        onPress={() => handleSelect(item)}
        style={({ pressed }) => [
          styles.accountRow,
          isSelected && styles.accountRowSelected,
          pressed && styles.accountRowPressed,
        ]}
      >
        {/* Radio circle */}
        <View style={[styles.radio, isSelected && styles.radioSelected]}>
          {isSelected && <View style={styles.radioInner} />}
        </View>

        {/* Account info */}
        <View style={styles.accountInfo}>
          <Text style={styles.accountName}>
            {typeLabel} (···{item.displayNumber})
          </Text>
          <Text style={styles.accountBalance}>
            ${item.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        showClose
        onClose={handleClose}
        accessibilityLabel="Close deposit flow"
      />

      <View style={styles.content}>
        {/* Title */}
        <Text
          style={styles.title}
          accessible
          accessibilityRole="header"
        >
          Which account do you want to deposit to?
        </Text>

        {/* Account list */}
        {loading ? (
          <ActivityIndicator
            size="large"
            color={COLORS.BLUE_600}
            accessibilityLabel="Loading accounts"
          />
        ) : (
          <View
            accessible
            accessibilityRole="radiogroup"
            accessibilityLabel="Select account"
          >
            <FlatList
              data={accounts}
              keyExtractor={item => item.id}
              renderItem={renderAccount}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        )}
      </View>

      {/* Continue button */}
      <View style={styles.footer}>
        <AccessibleButton
          label="Continue"
          onPress={handleContinue}
          disabled={!selectedId}
          size="large"
          style={styles.continueBtn}
          accessibilityHint="Proceed to enter deposit amount"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.WHITE },
  content: { flex: 1, paddingHorizontal: 21, paddingTop: 24, gap: 24 },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.GRAY_900,
    lineHeight: 36,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.GRAY_200,
    gap: 16,
    minHeight: MIN_TOUCH_TARGET_SIZE * 2,
  },
  accountRowSelected: {
    borderColor: COLORS.BLUE_600,
    backgroundColor: COLORS.BLUE_50,
  },
  accountRowPressed: { opacity: 0.8 },
  radio: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.GRAY_400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: COLORS.BLUE_600 },
  radioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.BLUE_600,
  },
  accountInfo: { flex: 1, gap: 4 },
  accountName: { fontSize: 18, fontWeight: '600', color: COLORS.GRAY_900 },
  accountBalance: { fontSize: 16, color: COLORS.GRAY_700 },
  separator: { height: 12 },
  footer: { paddingHorizontal: 21, paddingBottom: 24, paddingTop: 12 },
  continueBtn: { width: '100%' },
});
