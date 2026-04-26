import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { VisualMic } from '@components/VisualMic';
import { useTTS } from '@hooks/useTTS';
import { useHaptics } from '@hooks/useHaptics';
import { useVoiceCommands } from '@hooks/useVoiceCommands';
import { useAlwaysOnVoice } from '@hooks/useAlwaysOnVoice';
import { useVoiceSettings } from '@hooks/useVoiceSettings';
import { RootStackParamList } from '@/types/index';
import { COLORS, DARK_COLORS, MIN_TOUCH_TARGET_SIZE } from '@utils/constants';
import { ttsStrings, v } from '@utils/ttsStrings';

type MainNavProp = StackNavigationProp<RootStackParamList>;

interface TaskCardProps {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  backgroundColor: string;
  onPress: () => void;
  accessibilityHint: string;
}

const TaskCard: React.FC<TaskCardProps> = ({
  title,
  subtitle,
  icon,
  backgroundColor,
  onPress,
  accessibilityHint,
}) => {
  const { selection } = useHaptics();

  return (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      onPress={() => {
        selection();
        onPress();
      }}
      style={({ pressed }) => [
        styles.taskCard,
        { backgroundColor },
        pressed && styles.taskCardPressed,
      ]}
    >
      <View style={styles.taskIconWrap}>
        <Ionicons name={icon} size={24} color="#1b1b1b" />
      </View>
      <View style={styles.taskTextWrap}>
        <Text style={styles.taskTitle}>{title}</Text>
        <Text style={styles.taskSubtitle}>“{subtitle}”</Text>
      </View>
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
  }, [speakMedium, verbosity]);

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

  const statusText =
    voiceState === 'listening'
      ? 'Listening...'
      : voiceState === 'processing'
        ? 'Processing...'
        : voiceState === 'paused'
          ? 'Speaking...'
          : "Didn't catch that.";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.topBar}>
          <View style={styles.timeStub} />
          <Pressable
            accessible
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            onPress={handleOpenSettings}
            style={({ pressed }) => [styles.settingsButton, pressed && styles.settingsButtonPressed]}
          >
            <Ionicons name="settings-outline" size={26} color={DARK_COLORS.TEXT_PRIMARY} />
          </Pressable>
        </View>

        <Text style={styles.title} accessibilityRole="header">
          What would you like to do today?
        </Text>

        <View style={styles.cards}>
          <TaskCard
            title="View account balance"
            subtitle="Show my account balance"
            icon="wallet-outline"
            backgroundColor="#D4E8A6"
            onPress={handleCheckBalance}
            accessibilityHint="Shows your account balances"
          />
          <TaskCard
            title="Send money"
            subtitle="Send money to my friend"
            icon="cash-outline"
            backgroundColor="#79AFF5"
            onPress={handleSendMoney}
            accessibilityHint="Opens send money workflow"
          />
          <TaskCard
            title="Deposit a check"
            subtitle="I want to deposit a check"
            icon="create-outline"
            backgroundColor="#FBCB86"
            onPress={handleDepositCheck}
            accessibilityHint="Opens check deposit workflow"
          />
        </View>

        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel="Voice command"
          accessibilityHint="Use a voice command or select one of the options above"
          onPress={() => {}}
          style={({ pressed }) => [styles.micButton, pressed && styles.micButtonPressed]}
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
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },
  topBar: {
    minHeight: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 26,
  },
  timeStub: {
    width: 40,
  },
  settingsButton: {
    width: MIN_TOUCH_TARGET_SIZE,
    height: MIN_TOUCH_TARGET_SIZE,
    borderRadius: MIN_TOUCH_TARGET_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButtonPressed: {
    opacity: 0.7,
  },
  title: {
    fontSize: 38,
    fontWeight: 'bold',
    color: DARK_COLORS.TEXT_PRIMARY,
    lineHeight: 44,
    letterSpacing: -0.8,
    marginBottom: 28,
    maxWidth: 300,
  },
  cards: {
    gap: 18,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 14,
  },
  taskCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  taskIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskTextWrap: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#161616',
    lineHeight: 24,
    marginBottom: 4,
  },
  taskSubtitle: {
    fontSize: 14,
    fontStyle: 'italic',
    color: 'rgba(22,22,22,0.8)',
    lineHeight: 18,
  },
  listeningCard: {
    marginTop: 28,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#5A5A5A',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  listeningStatus: {
    fontSize: 18,
    color: DARK_COLORS.TEXT_SECONDARY,
    marginBottom: 6,
  },
  listeningTranscript: {
    fontSize: 30,
    color: DARK_COLORS.TEXT_PRIMARY,
    lineHeight: 34,
  },
  micButton: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 22,
  },
  micButtonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.92,
  },
});
