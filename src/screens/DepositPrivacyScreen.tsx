// ============================================================================
// DepositPrivacyScreen
// Privacy note shown before account selection
// ============================================================================

import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { DepositStackParamList } from '@/types/index';
import { ScreenHeader } from '@components/ScreenHeader';
import { AccessibleButton } from '@components/AccessibleButton';
import { VisualMic } from '@components/VisualMic';
import { useTTS } from '@hooks/useTTS';
import { useVoiceCommands } from '@hooks/useVoiceCommands';
import { useVoiceSettings } from '@hooks/useVoiceSettings';
import { COLORS, DARK_COLORS } from '@utils/constants';
import { ttsStrings, v } from '@utils/ttsStrings';

type Props = {
  navigation: StackNavigationProp<DepositStackParamList, 'DepositPrivacy'>;
};

export const DepositPrivacyScreen: React.FC<Props> = ({ navigation }) => {
  const { speakMedium } = useTTS();
  const { verbosity } = useVoiceSettings();

  useEffect(() => {
    setTimeout(() => {
      speakMedium(v(verbosity, ttsStrings.depositPrivacy.intro));
      setTimeout(() => {
        speakMedium(v(verbosity, ttsStrings.depositPrivacy.details));
        setTimeout(() => {
          speakMedium(v(verbosity, ttsStrings.depositPrivacy.continuePrompt));
        }, 1700);
      }, 900);
    }, 400);
  }, []);

  const handleContinue = useCallback(() => {
    navigation.navigate('AccountSelect');
  }, [navigation]);

  const handleClose = useCallback(() => {
    navigation.getParent()?.goBack();
  }, [navigation]);

  useVoiceCommands(
    {
      CONFIRM: handleContinue,
      GO_BACK: () => navigation.goBack(),
      CANCEL: handleClose,
    },
    { context: 'DepositPrivacy' }
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        dark
        showClose
        onClose={handleClose}
        accessibilityLabel="Close deposit flow"
      />

      <View style={styles.content}>
        <View style={styles.heroIcon} accessible accessibilityLabel="Privacy">
          <Ionicons name="shield-checkmark" size={44} color={COLORS.VIOLET_600} />
        </View>

        <Text style={styles.title} accessibilityRole="header">
          Your privacy matters
        </Text>

        <Text style={styles.body}>
          Your deposit information is used only for this flow and is not stored in the app after this session.
        </Text>
      </View>

      <View style={styles.footer}>
        <AccessibleButton
          label="Continue"
          onPress={handleContinue}
          size="large"
          style={styles.continueButton}
          accessibilityHint="Continue to choose the account for this deposit"
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
    paddingHorizontal: 28,
    paddingTop: 54,
    alignItems: 'center',
  },
  heroIcon: {
    width: 104,
    height: 104,
    borderRadius: 28,
    backgroundColor: COLORS.VIOLET_50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: DARK_COLORS.TEXT_PRIMARY,
    lineHeight: 36,
    textAlign: 'center',
    marginBottom: 20,
  },
  body: {
    fontSize: 18,
    lineHeight: 30,
    color: DARK_COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    maxWidth: 320,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
    gap: 12,
  },
  micWrap: {
    alignItems: 'center',
    paddingTop: 8,
  },
  continueButton: {
    width: '100%',
  },
});
