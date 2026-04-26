import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/types/index';
import { VisualMic } from '@components/VisualMic';
import { useTTS } from '@hooks/useTTS';
import { useVoiceCommands } from '@hooks/useVoiceCommands';
import { useVoiceSettings } from '@hooks/useVoiceSettings';
import { DARK_COLORS } from '@utils/constants';
import { ttsStrings, v } from '@utils/ttsStrings';

type NavProp = StackNavigationProp<RootStackParamList, 'Onboarding'>;

export const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { speakMedium } = useTTS();
  const { verbosity } = useVoiceSettings();

  useEffect(() => {
    speakMedium(v(verbosity, ttsStrings.onboarding.welcome));
  }, [speakMedium, verbosity]);

  const handleContinue = useCallback(() => {
    navigation.replace('TabNavigator');
  }, [navigation]);

  useVoiceCommands(
    {
      CONFIRM: handleContinue,
      GO_BACK: handleContinue,
    },
    { context: 'Onboarding' }
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          Welcome to FinSight
        </Text>

        <Text style={styles.body}>
          FinSight is your AI voice assistant for banking tasks. I'll guide you through everything by voice.
        </Text>

        <Text style={styles.prompt}>
          First, tap the mic button below.
        </Text>

        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel="Continue to home"
          accessibilityHint="Moves from onboarding to the home page"
          onPress={handleContinue}
          style={({ pressed }) => [
            styles.micButton,
            pressed && styles.micButtonPressed,
          ]}
        >
          <VisualMic size="large" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_COLORS.BG,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 88,
    paddingBottom: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 56,
    fontWeight: 'bold',
    color: DARK_COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 62,
    letterSpacing: -1.2,
  },
  body: {
    fontSize: 18,
    color: DARK_COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    lineHeight: 31,
    maxWidth: 320,
    marginBottom: 34,
  },
  prompt: {
    fontSize: 18,
    fontWeight: '700',
    color: DARK_COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    lineHeight: 28,
    maxWidth: 340,
    marginBottom: 34,
  },
  micButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.92,
  },
});
