// ============================================================================
// AmountInputScreen
// Step 2 — enter the check amount via voice or numpad
//
// Voice path:
//   useFocusEffect registers setRawTranscriptCallback(handleVoiceResult) while
//   this screen is focused.  The always-on VAD segment is already running;
//   captured speech is routed here instead of the NLU intent pipeline.
// ============================================================================

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { DepositStackParamList, HapticPattern } from '@/types/index';
import { ScreenHeader } from '@components/ScreenHeader';
import { AccessibleButton } from '@components/AccessibleButton';
import { VisualMic } from '@components/VisualMic';
import { useTTS } from '@hooks/useTTS';
import { useHaptics } from '@hooks/useHaptics';
import { useVoiceCommands } from '@hooks/useVoiceCommands';
import { useVoiceSettings } from '@hooks/useVoiceSettings';
import voiceService from '@services/voiceService';
import ttsService from '@services/ttsService';
import {
  parseVoiceAmount,
  formatAmountForSpeech,
  formatAmountDisplay,
} from '@utils/amountParser';
import { DARK_COLORS, DEPOSIT_LIMITS, MIN_TOUCH_TARGET_SIZE } from '@utils/constants';
import { ttsStrings, v } from '@utils/ttsStrings';

type Props = {
  navigation: StackNavigationProp<DepositStackParamList, 'AmountInput'>;
  route: RouteProp<DepositStackParamList, 'AmountInput'>;
};

type InputMode = 'idle' | 'listening' | 'confirming' | 'error';

const NUMPAD_KEYS = [
  '1', '2', '3',
  '4', '5', '6',
  '7', '8', '9',
  '.', '0', '⌫',
];

export const AmountInputScreen: React.FC<Props> = ({ navigation, route }) => {
  const { accountId, accountType } = route.params;
  const { speakMedium, speakHigh } = useTTS();
  const { selection } = useHaptics();
  const { verbosity } = useVoiceSettings();

  const [displayValue, setDisplayValue] = useState('0');
  const [confirmedAmount, setConfirmedAmount] = useState<number | null>(null);
  const [mode, setMode] = useState<InputMode>('idle');
  const pendingAmount = useRef<number | null>(null);
  // Refs so callbacks registered once (via useFocusEffect) always see current values
  const modeRef = useRef<InputMode>('idle');
  const proceedToCameraRef = useRef<() => void>(() => {});

  const accountLabel = accountType === 'checking' ? 'Checking' : 'Savings';

  // ── On mount: announce context ──────────────────────────────────────────
  useEffect(() => {
    setTimeout(() => {
      const ctxStr = v(verbosity, ttsStrings.amountInput.context(accountLabel));
      if (ctxStr) speakMedium(ctxStr);
      setTimeout(() => {
        speakMedium(v(verbosity, ttsStrings.amountInput.prompt));
        setTimeout(() => {
          const limitStr = v(verbosity, ttsStrings.amountInput.dailyLimit(formatAmountForSpeech(DEPOSIT_LIMITS.DAILY_LIMIT)));
          if (limitStr) speakMedium(limitStr);
        }, 1500);
      }, 1000);
    }, 400);
  }, []);

  // Keep refs in sync with state so stale-closure callbacks see current values
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // ── Numpad logic ────────────────────────────────────────────────────────
  const handleNumpadPress = useCallback((key: string) => {
    selection();
    setDisplayValue(prev => {
      if (key === '⌫') {
        const next = prev.length > 1 ? prev.slice(0, -1) : '0';
        return next;
      }
      if (key === '.' && prev.includes('.')) return prev;
      if (key === '.' && prev === '0') return '0.';
      if (prev === '0' && key !== '.') return key;
      // Limit to 2 decimal places
      if (prev.includes('.')) {
        const decimals = prev.split('.')[1];
        if (decimals.length >= 2) return prev;
      }
      return prev + key;
    });
    setConfirmedAmount(null);
    setMode('idle');
  }, []);

  const numericAmount = parseFloat(displayValue) || 0;

  // ── Validation ──────────────────────────────────────────────────────────
  const validateAmount = useCallback((amount: number): string | null => {
    if (amount < DEPOSIT_LIMITS.MIN_AMOUNT) return 'Amount must be at least 1 cent.';
    if (amount > DEPOSIT_LIMITS.MAX_AMOUNT)
      return `Amount exceeds daily limit of ${formatAmountForSpeech(DEPOSIT_LIMITS.DAILY_LIMIT)}.`;
    return null;
  }, []);

  // ── Voice amount result handler ─────────────────────────────────────────
  // Receives raw transcript from the always-on VAD (bypasses NLU intent pipeline).
  // Registered via voiceService.setRawTranscriptCallback in useFocusEffect below.
  const handleVoiceResult = useCallback((transcript: string) => {
    const lower = transcript.toLowerCase().trim();

    // When waiting for yes/no confirmation, intercept before amount parsing
    if (modeRef.current === 'confirming') {
      if (/\b(yes|yeah|yep|correct|continue|proceed|confirm)\b/.test(lower)) {
        proceedToCameraRef.current();
        return;
      }
      if (/\b(no|nope|cancel|try again|change|different|again)\b/.test(lower)) {
        setMode('idle');
        setDisplayValue('0');
        pendingAmount.current = null;
        speakMedium(v(verbosity, ttsStrings.amountInput.retryPrompt));
        return;
      }
      // Unrecognised word in confirming mode — treat as a new amount attempt
    }

    const amount = parseVoiceAmount(transcript);

    if (amount === null) {
      speakHigh(v(verbosity, ttsStrings.amountInput.didntCatch));
      setMode('error');
      return;
    }

    const error = validateAmount(amount);
    if (error) {
      speakHigh(error);
      setMode('error');
      return;
    }

    pendingAmount.current = amount;
    setDisplayValue(amount.toFixed(2));
    setMode('confirming');
    setTimeout(() => {
      speakMedium(v(verbosity, ttsStrings.amountInput.voiceConfirm(formatAmountForSpeech(amount))));
    }, 300);
  }, [validateAmount]);

  // ── Wire raw transcript callback while this screen is focused ───────────
  useFocusEffect(
    useCallback(() => {
      voiceService.setRawTranscriptCallback(handleVoiceResult);
      return () => {
        voiceService.setRawTranscriptCallback(null);
        ttsService.reset(); // drain any queued TTS when leaving this screen
      };
    }, [handleVoiceResult])
  );

  // ── Confirm typed/numpad amount ─────────────────────────────────────────
  const handleConfirmAmount = useCallback(() => {
    const error = validateAmount(numericAmount);
    if (error) {
      speakHigh(error);
      return;
    }
    setConfirmedAmount(numericAmount);
    setMode('confirming');
    speakMedium(v(verbosity, ttsStrings.amountInput.typedConfirm(formatAmountForSpeech(numericAmount))));
  }, [numericAmount, validateAmount]);

  // ── Navigate to camera ──────────────────────────────────────────────────
  const proceedToCamera = useCallback(() => {
    const amount = confirmedAmount ?? numericAmount;
    const error = validateAmount(amount);
    if (error) { speakHigh(error); return; }

    navigation.navigate('CheckCapture', {
      accountId,
      accountType,
      amount,
      side: 'front',
    });
  }, [confirmedAmount, numericAmount, accountId, accountType, navigation]);

  useEffect(() => { proceedToCameraRef.current = proceedToCamera; }, [proceedToCamera]);

  // ── Voice commands — LLM maps natural speech to these action keys ────────
  useVoiceCommands(
    {
      CONFIRM: () => { if (mode === 'confirming') proceedToCamera(); },
      CANCEL: () => {
        setMode('idle');
        setDisplayValue('0');
        pendingAmount.current = null;
        speakMedium(v(verbosity, ttsStrings.amountInput.retryPrompt));
      },
      GO_BACK: () => navigation.goBack(),
    },
    { context: 'AmountInput' }
  );

  const handleClose = () => navigation.getParent()?.goBack();

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader dark showClose onClose={handleClose} />

      <View style={styles.content}>
        {/* Context label */}
        <Text style={styles.contextLabel} accessibilityRole="text">
          Depositing to {accountLabel}
        </Text>

        {/* Prompt */}
        <Text style={styles.prompt} accessibilityRole="header">
          How much are you depositing?
        </Text>

        {/* Amount display */}
        <View
          style={styles.amountContainer}
          accessible
          accessibilityLabel={`Amount: ${formatAmountForSpeech(numericAmount)}`}
          accessibilityRole="text"
        >
          <Text style={styles.currencySymbol}>$</Text>
          <Text
            style={[
              styles.amountText,
              mode === 'error' && styles.amountError,
              mode === 'confirming' && styles.amountConfirming,
            ]}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {displayValue}
          </Text>
        </View>

        {/* Daily limit note */}
        <Text style={styles.limitNote}>
          Daily limit: {formatAmountDisplay(DEPOSIT_LIMITS.DAILY_LIMIT)}
        </Text>

        {/* Mode feedback */}
        {mode === 'confirming' && (
          <Text style={styles.confirmBanner} accessibilityLiveRegion="polite">
            Is this correct? Say "yes" or "no".
          </Text>
        )}
        {mode === 'error' && (
          <Text style={styles.errorBanner} accessibilityLiveRegion="assertive">
            Please enter a valid amount.
          </Text>
        )}

        {/* Numpad */}
        <View style={styles.numpad} accessibilityLabel="Numpad" accessibilityRole="keyboardkey">
          {NUMPAD_KEYS.map(key => (
            <Pressable
              key={key}
              accessible
              accessibilityRole="button"
              accessibilityLabel={key === '⌫' ? 'Backspace' : key}
              onPress={() => handleNumpadPress(key)}
              style={({ pressed }) => [
                styles.numpadKey,
                key === '⌫' && styles.numpadBackspace,
                pressed && styles.numpadKeyPressed,
              ]}
            >
              <Text style={styles.numpadKeyText}>{key}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Footer: voice banner + continue */}
      <View style={styles.footer}>
        <AccessibleButton
          label={mode === 'confirming' ? 'Continue' : 'Confirm Amount'}
          onPress={mode === 'confirming' ? proceedToCamera : handleConfirmAmount}
          disabled={numericAmount <= 0}
          size="large"
          style={styles.continueBtn}
          accessibilityHint="Confirm this amount and proceed to capture your check"
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
  content: { flex: 1, paddingHorizontal: 21, paddingTop: 16, gap: 12 },
  contextLabel: { fontSize: 16, color: DARK_COLORS.TEXT_SECONDARY },
  prompt: { fontSize: 26, fontWeight: 'bold', color: DARK_COLORS.TEXT_PRIMARY, lineHeight: 34 },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: DARK_COLORS.BLUE,
    marginHorizontal: 16,
  },
  currencySymbol: { fontSize: 36, fontWeight: '600', color: DARK_COLORS.TEXT_SECONDARY, marginRight: 4 },
  amountText: { fontSize: 52, fontWeight: 'bold', color: DARK_COLORS.TEXT_PRIMARY, flex: 1, textAlign: 'center' },
  amountError: { color: DARK_COLORS.RED },
  amountConfirming: { color: DARK_COLORS.BLUE },
  limitNote: { fontSize: 14, color: DARK_COLORS.TEXT_MUTED, textAlign: 'center' },
  confirmBanner: {
    backgroundColor: DARK_COLORS.BLUE_DIM,
    color: DARK_COLORS.BLUE,
    padding: 10,
    borderRadius: 8,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 15,
  },
  errorBanner: {
    backgroundColor: '#3a1010',
    color: DARK_COLORS.RED,
    padding: 10,
    borderRadius: 8,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 15,
  },
  numpad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginTop: 4,
  },
  numpadKey: {
    width: '30%',
    height: 56,
    borderRadius: 12,
    backgroundColor: DARK_COLORS.SURFACE_2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET_SIZE,
  },
  numpadBackspace: { backgroundColor: '#3a1f00' },
  numpadKeyPressed: { opacity: 0.6 },
  numpadKeyText: { fontSize: 22, fontWeight: '600', color: DARK_COLORS.TEXT_PRIMARY },
  footer: {
    paddingHorizontal: 21,
    paddingBottom: 24,
    paddingTop: 8,
    gap: 12,
  },
  micWrap: {
    alignItems: 'center',
    paddingTop: 8,
  },
  continueBtn: { width: '100%' },
});
