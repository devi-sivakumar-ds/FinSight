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
import { VoiceBanner } from '@components/VoiceBanner';
import { useTTS } from '@hooks/useTTS';
import { useHaptics } from '@hooks/useHaptics';
import { useVoiceCommands } from '@hooks/useVoiceCommands';
import { useAlwaysOnVoice } from '@hooks/useAlwaysOnVoice';
import { useVoiceSettings } from '@hooks/useVoiceSettings';
import mockBankingAPI from '@services/mockBankingAPI';
import { formatCurrencyForSpeech } from '@utils/accessibility';
import { DARK_COLORS, MIN_TOUCH_TARGET_SIZE } from '@utils/constants';
import { ttsStrings, v } from '@utils/ttsStrings';

type Props = {
  navigation: StackNavigationProp<DepositStackParamList, 'AccountSelect'>;
};

export const AccountSelectScreen: React.FC<Props> = ({ navigation }) => {
  const { speakMedium, speakHigh } = useTTS();
  const { selection } = useHaptics();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { voiceState } = useAlwaysOnVoice();
  const { verbosity } = useVoiceSettings();

  // Load accounts and announce
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await mockBankingAPI.getAccounts();
      if (cancelled) return;
      setAccounts(data);
      setLoading(false);

      setTimeout(() => {
        speakMedium(v(verbosity, ttsStrings.accountSelect.prompt));
        setTimeout(() => {
          const countStr = v(verbosity, ttsStrings.accountSelect.accountCount(data.length));
          if (countStr) speakMedium(countStr);
          data.forEach((acc, i) => {
            setTimeout(() => {
              const typeLabel = acc.type === 'checking' ? 'Checking' : 'Savings';
              const digits = acc.displayNumber.split('').join(' ');
              const balance = formatCurrencyForSpeech(acc.balance);
              speakMedium(v(verbosity, ttsStrings.accountSelect.accountDetail(typeLabel, digits, balance)));
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
    speakMedium(v(verbosity, ttsStrings.accountSelect.accountSelected(typeLabel, digits)));
    setTimeout(() => {
      const continueStr = v(verbosity, ttsStrings.accountSelect.continuePrompt);
      if (continueStr) speakMedium(continueStr);
    }, 1200);
  }, [verbosity]);

  const handleContinue = useCallback(() => {
    const account = accounts.find(a => a.id === selectedId);
    if (!account) {
      speakHigh(v(verbosity, ttsStrings.accountSelect.noAccount));
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

  // Voice commands — LLM maps natural speech to these action keys
  useVoiceCommands(
    {
      SELECT_CHECKING: () => {
        const acc = accounts.find(a => a.type === 'checking');
        if (acc) handleSelect(acc);
      },
      SELECT_SAVINGS: () => {
        const acc = accounts.find(a => a.type === 'savings');
        if (acc) handleSelect(acc);
      },
      CONFIRM: handleContinue,
      GO_BACK: handleClose,
      CANCEL: handleClose,
    },
    { context: 'AccountSelect' }
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
        dark
        showClose
        onClose={handleClose}
        accessibilityLabel="Close deposit flow"
      />

      <View style={styles.content}>
        <Text style={styles.title} accessible accessibilityRole="header">
          Choose the account for this deposit
        </Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={DARK_COLORS.BLUE}
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

      {/* Footer */}
      <View style={styles.footer}>
        <VoiceBanner
          state={voiceState}
          listeningText="Choose checking or savings, then say continue."
        />
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
  container: { flex: 1, backgroundColor: DARK_COLORS.BG },
  content: { flex: 1, paddingHorizontal: 21, paddingTop: 24, gap: 24 },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: DARK_COLORS.TEXT_PRIMARY,
    lineHeight: 36,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: DARK_COLORS.BORDER,
    gap: 16,
    minHeight: MIN_TOUCH_TARGET_SIZE * 2,
  },
  accountRowSelected: {
    borderColor: DARK_COLORS.BLUE,
    backgroundColor: DARK_COLORS.BLUE_DIM,
  },
  accountRowPressed: { opacity: 0.8 },
  radio: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: DARK_COLORS.TEXT_MUTED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: DARK_COLORS.BLUE },
  radioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: DARK_COLORS.BLUE,
  },
  accountInfo: { flex: 1, gap: 4 },
  accountName: { fontSize: 18, fontWeight: '600', color: DARK_COLORS.TEXT_PRIMARY },
  accountBalance: { fontSize: 16, color: DARK_COLORS.TEXT_SECONDARY },
  separator: { height: 12 },
  footer: { paddingHorizontal: 21, paddingBottom: 24, paddingTop: 12, gap: 12 },
  continueBtn: { width: '100%' },
});
