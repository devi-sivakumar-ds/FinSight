// ============================================================================
// SettingsScreen
// Voice settings — verbosity and speech pace, fully voice-navigable
// ============================================================================

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTTS } from '@hooks/useTTS';
import { useVoiceSettings } from '@hooks/useVoiceSettings';
import { useVoiceCommands } from '@hooks/useVoiceCommands';
import { VisualMic } from '@components/VisualMic';
import { DARK_COLORS } from '@utils/constants';
import { ttsStrings, v } from '@utils/ttsStrings';
import type { Verbosity } from '@utils/ttsStrings';
import type { Pace } from '@/contexts/VoiceSettingsContext';

const VERBOSITY_OPTIONS: { label: string; value: Verbosity }[] = [
  { label: 'Low',    value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High',   value: 'high' },
];

const PACE_OPTIONS: { label: string; value: Pace }[] = [
  { label: '0.5x', value: 0.5 },
  { label: '1.0x', value: 1.0 },
  { label: '1.5x', value: 1.5 },
];

export const SettingsScreen: React.FC = () => {
  const { speakMedium } = useTTS();
  const { verbosity, pace, setVerbosity, setPace } = useVoiceSettings();
  const navigation = useNavigation();

  // Announce current settings + voice options on mount
  useEffect(() => {
    const str = v(verbosity, ttsStrings.settings.screenAnnounce(verbosity, pace));
    speakMedium(str);
  }, []);

  const handleGoHome = useCallback(() => {
    (navigation as any).navigate('Tasks');
  }, [navigation]);

  const handleSetVerbosity = useCallback((val: Verbosity) => {
    setVerbosity(val);
    const label = VERBOSITY_OPTIONS.find(o => o.value === val)?.label ?? val;
    speakMedium(v(val, ttsStrings.settings.verbosityChanged(label)));
  }, [setVerbosity]);

  const handleSetPace = useCallback((val: Pace) => {
    setPace(val);
    speakMedium(v(verbosity, ttsStrings.settings.paceChanged(val)));
  }, [setPace, verbosity]);

  // Voice commands — LLM routes speech to these action keys
  useVoiceCommands(
    {
      SET_VERBOSITY_LOW:    () => handleSetVerbosity('low'),
      SET_VERBOSITY_MEDIUM: () => handleSetVerbosity('medium'),
      SET_VERBOSITY_HIGH:   () => handleSetVerbosity('high'),
      SET_PACE_SLOW:        () => handleSetPace(0.5),
      SET_PACE_NORMAL:      () => handleSetPace(1.0),
      SET_PACE_FAST:        () => handleSetPace(1.5),
      GO_HOME:              handleGoHome,
      GO_BACK:              handleGoHome,
    },
    { context: 'Settings' }
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Text style={styles.title} accessible accessibilityRole="header">
          Settings
        </Text>

        {/* Verbosity section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verbosity</Text>
          <Text style={styles.sectionDesc}>
            Select how much detail you want for the guidance.
          </Text>
          <View style={styles.optionRow} accessibilityRole="radiogroup">
            {VERBOSITY_OPTIONS.map(({ label, value }) => {
              const selected = verbosity === value;
              return (
                <Pressable
                  key={value}
                  accessible
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Verbosity ${label}`}
                  onPress={() => handleSetVerbosity(value)}
                  style={[styles.optionBtn, selected && styles.optionBtnSelected]}
                >
                  <Text style={[styles.optionBtnText, selected && styles.optionBtnTextSelected]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Pacing section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pacing</Text>
          <Text style={styles.sectionDesc}>
            Select how fast the app speaks to you.
          </Text>
          <View style={styles.optionRow} accessibilityRole="radiogroup">
            {PACE_OPTIONS.map(({ label, value }) => {
              const selected = pace === value;
              return (
                <Pressable
                  key={value}
                  accessible
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Speech pace ${label}`}
                  onPress={() => handleSetPace(value)}
                  style={[styles.optionBtn, selected && styles.optionBtnSelected]}
                >
                  <Text style={[styles.optionBtnText, selected && styles.optionBtnTextSelected]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Visual mic */}
      <View style={styles.footer}>
        <VisualMic size="small" />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_COLORS.BG,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    gap: 40,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: DARK_COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 8,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: DARK_COLORS.TEXT_PRIMARY,
  },
  sectionDesc: {
    fontSize: 15,
    color: DARK_COLORS.TEXT_SECONDARY,
    lineHeight: 22,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 16,
    backgroundColor: DARK_COLORS.SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionBtnSelected: {
    backgroundColor: DARK_COLORS.BLUE,
    borderColor: DARK_COLORS.BLUE,
  },
  optionBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: DARK_COLORS.TEXT_SECONDARY,
  },
  optionBtnTextSelected: {
    color: DARK_COLORS.TEXT_PRIMARY,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
  },
});
