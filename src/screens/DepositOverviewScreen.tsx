// ============================================================================
// DepositOverviewScreen
// Intro screen shown before account selection
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
import { VoiceBanner } from '@components/VoiceBanner';
import { useTTS } from '@hooks/useTTS';
import { useVoiceCommands } from '@hooks/useVoiceCommands';
import { useAlwaysOnVoice } from '@hooks/useAlwaysOnVoice';
import { useVoiceSettings } from '@hooks/useVoiceSettings';
import { COLORS, DARK_COLORS } from '@utils/constants';
import { ttsStrings, v } from '@utils/ttsStrings';

type Props = {
  navigation: StackNavigationProp<DepositStackParamList, 'DepositOverview'>;
};

const STEPS = [
  'Choose an account to deposit into',
  'Enter the check amount',
  'Capture the front and back of the check',
];

export const DepositOverviewScreen: React.FC<Props> = ({ navigation }) => {
  const { speakMedium } = useTTS();
  const { voiceState } = useAlwaysOnVoice();
  const { verbosity } = useVoiceSettings();

  useEffect(() => {
    setTimeout(() => {
      speakMedium(v(verbosity, ttsStrings.depositOverview.intro));
      setTimeout(() => {
        speakMedium(v(verbosity, ttsStrings.depositOverview.process));
        setTimeout(() => {
          speakMedium(v(verbosity, ttsStrings.depositOverview.continuePrompt));
        }, 1700);
      }, 900);
    }, 400);
  }, []);

  const handleContinue = useCallback(() => {
    navigation.navigate('DepositPrivacy');
  }, [navigation]);

  const handleClose = useCallback(() => {
    navigation.getParent()?.goBack();
  }, [navigation]);

  useVoiceCommands(
    {
      CONFIRM: handleContinue,
      GO_BACK: handleClose,
      CANCEL: handleClose,
    },
    { context: 'DepositOverview' }
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
        <View style={styles.heroIcon} accessible accessibilityLabel="Deposit a check">
          <Ionicons name="card-outline" size={44} color={COLORS.ORANGE_600} />
          <Ionicons name="create-outline" size={22} color={COLORS.ORANGE_600} style={styles.heroPen} />
        </View>

        <Text style={styles.title} accessibilityRole="header">
          Deposit a check
        </Text>

        <View style={styles.stepsList}>
          {STEPS.map((step, index) => (
            <View key={step} style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <VoiceBanner
          state={voiceState}
          listeningText="Say continue when you're ready."
        />
        <AccessibleButton
          label="Continue"
          onPress={handleContinue}
          size="large"
          style={styles.continueButton}
          accessibilityHint="Continue to the privacy information screen"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK_COLORS.BG },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 36,
    alignItems: 'flex-start',
  },
  heroIcon: {
    width: 92,
    height: 92,
    borderRadius: 24,
    backgroundColor: COLORS.ORANGE_50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    position: 'relative',
  },
  heroPen: {
    position: 'absolute',
    right: 20,
    top: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: DARK_COLORS.TEXT_PRIMARY,
    lineHeight: 36,
    marginBottom: 28,
  },
  stepsList: {
    width: '100%',
    gap: 22,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingRight: 12,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: DARK_COLORS.BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepBadgeText: {
    color: DARK_COLORS.TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 18,
    lineHeight: 28,
    color: DARK_COLORS.TEXT_PRIMARY,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
    gap: 12,
  },
  continueButton: {
    width: '100%',
  },
});
