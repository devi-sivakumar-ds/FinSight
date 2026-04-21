// ============================================================================
// MainScreen Component
// Main screen with 4 task cards — always-on voice, no mic button
// ============================================================================

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { VoiceBanner } from '@components/VoiceBanner';
import { useTTS } from '@hooks/useTTS';
import { useHaptics } from '@hooks/useHaptics';
import { useVoiceCommands } from '@hooks/useVoiceCommands';
import { useAlwaysOnVoice } from '@hooks/useAlwaysOnVoice';
import { useVoiceSettings } from '@hooks/useVoiceSettings';
import { RootStackParamList } from '@/types/index';
import { COLORS, MIN_TOUCH_TARGET_SIZE } from '@utils/constants';
import { ttsStrings, v } from '@utils/ttsStrings';

type MainNavProp = StackNavigationProp<RootStackParamList>;

interface TaskCardProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  backgroundColor: string;
  textColor: string;
  onPress: () => void;
  accessibilityHint: string;
}

const TaskCard: React.FC<TaskCardProps> = ({
  title,
  icon,
  backgroundColor,
  textColor,
  onPress,
  accessibilityHint,
}) => {
  const { selection } = useHaptics();

  const handlePress = () => {
    selection();
    onPress();
  };

  return (
    <Pressable
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.taskCard,
        { backgroundColor },
        pressed && styles.taskCardPressed,
      ]}
    >
      <View style={styles.taskCardIcon}>
        <Ionicons name={icon} size={36} color={textColor} />
      </View>
      <Text style={[styles.taskCardText, { color: textColor }]}>{title}</Text>
    </Pressable>
  );
};

export const MainScreen: React.FC = () => {
  const { speakMedium } = useTTS();
  const navigation = useNavigation<MainNavProp>();
  const { voiceState } = useAlwaysOnVoice();
  const { verbosity } = useVoiceSettings();

  useEffect(() => {
    speakMedium(v(verbosity, ttsStrings.main.welcome));
  }, []);

  const handleDepositCheck = () => {
    navigation.navigate('DepositFlow');
  };

  const handleSendMoney = () => {
    speakMedium(v(verbosity, ttsStrings.main.featureComingSoon('Send money')));
  };

  const handleCheckBalance = () => {
    speakMedium(v(verbosity, ttsStrings.main.featureComingSoon('Check balance')));
  };

  const handleTransferMoney = () => {
    speakMedium(v(verbosity, ttsStrings.main.featureComingSoon('Transfer money')));
  };

  const handleOpenSettings = () => {
    navigation.navigate('Settings' as any);
  };

  // Voice commands — LLM maps natural speech to these action keys
  useVoiceCommands(
    {
      DEPOSIT_CHECK: handleDepositCheck,
      SEND_MONEY: handleSendMoney,
      CHECK_BALANCE: handleCheckBalance,
      TRANSFER_MONEY: handleTransferMoney,
      OPEN_SETTINGS: handleOpenSettings,
    },
    { context: 'MainScreen' }
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        accessibilityRole="scrollbar"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text
            style={styles.title}
            accessible={true}
            accessibilityRole="header"
          >
            Welcome to FinSight
          </Text>
          <Text style={styles.subtitle}>
            Always listening — just speak a command
          </Text>
        </View>

        {/* Try Saying Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Try saying</Text>

          {/* Task Grid */}
          <View style={styles.taskGrid}>
            <TaskCard
              title="Send money"
              icon="send"
              backgroundColor={COLORS.BLUE_50}
              textColor={COLORS.BLUE_600}
              onPress={handleSendMoney}
              accessibilityHint="Opens send money workflow"
            />
            <TaskCard
              title="Check balance"
              icon="wallet"
              backgroundColor={COLORS.GREEN_50}
              textColor={COLORS.GREEN_600}
              onPress={handleCheckBalance}
              accessibilityHint="Shows your account balances"
            />
            <TaskCard
              title="Deposit a check"
              icon="document-text"
              backgroundColor={COLORS.ORANGE_50}
              textColor={COLORS.ORANGE_600}
              onPress={handleDepositCheck}
              accessibilityHint="Opens check deposit workflow"
            />
            <TaskCard
              title="Transfer money"
              icon="swap-horizontal"
              backgroundColor={COLORS.VIOLET_50}
              textColor={COLORS.VIOLET_600}
              onPress={handleTransferMoney}
              accessibilityHint="Opens transfer money workflow"
            />
          </View>
        </View>
      </ScrollView>

      {/* Always-on voice status strip */}
      <View style={styles.voiceBannerContainer}>
        <VoiceBanner
          state={voiceState}
          listeningText="Say a command — deposit, balance, send, or transfer."
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 62,
    paddingBottom: 100, // Space for voice banner
  },
  header: {
    paddingHorizontal: 21,
    paddingVertical: 48,
    gap: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: COLORS.GRAY_900,
    textAlign: 'center',
    letterSpacing: -0.34,
    lineHeight: 42,
  },
  subtitle: {
    fontSize: 22,
    color: COLORS.GRAY_700,
    textAlign: 'center',
    lineHeight: 31,
  },
  section: {
    paddingHorizontal: 21,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.GRAY_900,
    textAlign: 'center',
  },
  taskGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  taskCard: {
    width: '47%',
    height: 146,
    borderRadius: 20,
    padding: 20,
    gap: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  taskCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  taskCardIcon: {
    width: 36,
    height: 36,
  },
  taskCardText: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 29,
    flex: 1,
  },
  voiceBannerContainer: {
    paddingHorizontal: 21,
    paddingBottom: 24,
    paddingTop: 8,
    backgroundColor: COLORS.WHITE,
    borderTopWidth: 1,
    borderTopColor: COLORS.GRAY_200,
  },
});
