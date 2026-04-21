// ============================================================================
// ErrorScreen
// Error state — show error message and retry options
// ============================================================================

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { DepositStackParamList } from '@/types/index';
import { AccessibleButton } from '@components/AccessibleButton';
import { useTTS } from '@hooks/useTTS';
import { useVoiceSettings } from '@hooks/useVoiceSettings';
import { DARK_COLORS } from '@utils/constants';
import { ttsStrings, v } from '@utils/ttsStrings';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  navigation: StackNavigationProp<DepositStackParamList, 'Error'>;
  route: RouteProp<DepositStackParamList, 'Error'>;
};

export const ErrorScreen: React.FC<Props> = ({ navigation, route }) => {
  const { error, canRetry, retryScreen } = route.params;
  const { speakHigh } = useTTS();
  const { verbosity } = useVoiceSettings();

  // Announce error on mount
  useEffect(() => {
    setTimeout(() => {
      speakHigh(v(verbosity, ttsStrings.error.announcement(error)));
      if (canRetry) {
        setTimeout(() => {
          speakHigh(v(verbosity, ttsStrings.error.retryOption));
        }, 1500);
      }
    }, 400);
  }, [error, canRetry]);

  const handleRetry = () => {
    if (retryScreen) {
      // Navigate to specific retry screen
      navigation.navigate(retryScreen as any);
    } else {
      // Default: restart from account selection
      navigation.navigate('AccountSelect');
    }
  };

  const handleGoHome = () => {
    navigation.getParent()?.getParent()?.navigate('TabNavigator');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Error icon */}
        <View style={styles.iconContainer}>
          <Ionicons
            name="alert-circle"
            size={120}
            color={DARK_COLORS.RED}
            accessible
            accessibilityLabel="Error"
          />
        </View>

        {/* Title */}
        <Text
          style={styles.title}
          accessible
          accessibilityRole="header"
        >
          Something Went Wrong
        </Text>

        {/* Error message */}
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>

        {/* Help text */}
        {canRetry && (
          <Text style={styles.helpText}>
            Don't worry! You can try again or contact support if the problem persists.
          </Text>
        )}
      </View>

      {/* Footer buttons */}
      <View style={styles.footer}>
        {canRetry && (
          <AccessibleButton
            label="Try Again"
            onPress={handleRetry}
            variant="primary"
            size="large"
            style={styles.retryButton}
            accessibilityHint="Retry the deposit process"
          />
        )}
        <AccessibleButton
          label="Go Home"
          onPress={handleGoHome}
          variant={canRetry ? 'outline' : 'primary'}
          size="large"
          style={canRetry ? styles.homeButtonSecondary : styles.homeButtonPrimary}
          accessibilityHint="Return to main screen"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK_COLORS.BG },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    alignItems: 'center',
    gap: 24,
  },
  iconContainer: {
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: DARK_COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    lineHeight: 36,
  },
  errorBox: {
    width: '100%',
    backgroundColor: '#2a0a0a',
    borderLeftWidth: 4,
    borderLeftColor: DARK_COLORS.RED,
    borderRadius: 12,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: DARK_COLORS.TEXT_PRIMARY,
    lineHeight: 24,
    textAlign: 'center',
  },
  helpText: {
    fontSize: 15,
    color: DARK_COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
    gap: 12,
  },
  retryButton: { width: '100%' },
  homeButtonSecondary: { width: '100%' },
  homeButtonPrimary: { width: '100%' },
});
