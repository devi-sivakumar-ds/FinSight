// ============================================================================
// CheckFlipScreen
// Transition screen — instructs user to flip check
// ============================================================================

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { DepositStackParamList } from '@/types/index';
import { AccessibleButton } from '@components/AccessibleButton';
import { VoiceBanner } from '@components/VoiceBanner';
import { useTTS } from '@hooks/useTTS';
import { useVoiceCommands } from '@hooks/useVoiceCommands';
import { useAlwaysOnVoice } from '@hooks/useAlwaysOnVoice';
import { DARK_COLORS } from '@utils/constants';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  navigation: StackNavigationProp<DepositStackParamList, 'CheckFlip'>;
  route: RouteProp<DepositStackParamList, 'CheckFlip'>;
};

export const CheckFlipScreen: React.FC<Props> = ({ navigation, route }) => {
  const { frontImageUri, accountId, accountType, amount } = route.params;
  const { speakMedium } = useTTS();
  const { voiceState } = useAlwaysOnVoice();

  // Announce instructions on mount
  useEffect(() => {
    setTimeout(() => {
      speakMedium('Front captured successfully.');
      setTimeout(() => {
        speakMedium('Now flip the check to show the back, where you would sign it.');
        setTimeout(() => {
          speakMedium('Tap the screen when ready.');
        }, 2000);
      }, 1200);
    }, 400);
  }, []);

  const proceedToBackSide = () => {
    navigation.navigate('CheckCapture', {
      accountId,
      accountType,
      amount,
      side: 'back',
      frontImageUri,
    });
  };

  // Voice commands — LLM maps natural speech to these action keys
  useVoiceCommands(
    {
      CONFIRM: proceedToBackSide,
      GO_BACK: () => navigation.getParent()?.goBack(),
      CANCEL: () => navigation.getParent()?.goBack(),
    },
    { context: 'CheckFlip' }
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success icon */}
        <View style={styles.iconContainer}>
          <Ionicons
            name="checkmark-circle"
            size={100}
            color={DARK_COLORS.GREEN}
            accessible
            accessibilityLabel="Success"
          />
        </View>

        {/* Title */}
        <Text style={styles.title} accessible accessibilityRole="header">
          Front Captured Successfully
        </Text>

        {/* Instruction */}
        <Text style={styles.instruction}>
          Now flip the check to show the back, where you would sign it.
        </Text>

        {/* Thumbnail (optional) */}
        {frontImageUri && (
          <View style={styles.thumbnailContainer}>
            <Image
              source={{ uri: frontImageUri }}
              style={styles.thumbnail}
              resizeMode="cover"
              accessible
              accessibilityLabel="Captured front image preview"
            />
            <View style={styles.thumbnailOverlay}>
              <Text style={styles.thumbnailLabel}>FRONT</Text>
            </View>
          </View>
        )}

        {/* Flip animation hint */}
        <View style={styles.flipHint}>
          <Text style={styles.flipText}>↻ Flip Check Over</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <VoiceBanner
          state={voiceState}
          listeningText="Say 'ready' when the back side is facing the camera."
        />
        <AccessibleButton
          label="Ready"
          onPress={proceedToBackSide}
          size="large"
          style={styles.readyButton}
          accessibilityHint="Proceed to capture the back side of the check"
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
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: DARK_COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    lineHeight: 36,
  },
  instruction: {
    fontSize: 18,
    color: DARK_COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 16,
  },
  thumbnailContainer: {
    width: 280,
    height: 112,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 16,
    borderWidth: 2,
    borderColor: DARK_COLORS.GREEN,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: DARK_COLORS.GREEN,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  thumbnailLabel: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  flipHint: {
    marginTop: 32,
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 16,
    backgroundColor: DARK_COLORS.BLUE_DIM,
  },
  flipText: {
    fontSize: 24,
    fontWeight: '700',
    color: DARK_COLORS.BLUE,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
    gap: 12,
  },
  readyButton: {
    width: '100%',
  },
});
