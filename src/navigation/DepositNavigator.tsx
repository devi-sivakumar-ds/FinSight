// ============================================================================
// DepositNavigator
// Stack navigator for the full check deposit flow
// ============================================================================

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { DepositStackParamList } from '@/types/index';
import { COLORS } from '@utils/constants';
import { DepositOverviewScreen } from '@screens/DepositOverviewScreen';
import { DepositPrivacyScreen } from '@screens/DepositPrivacyScreen';
import { AccountSelectScreen } from '@screens/AccountSelectScreen';
import { CheckCaptureScreen } from '@screens/CheckCaptureScreen';
import { CheckFlipScreen } from '@screens/CheckFlipScreen';
import { OCRProcessingScreen } from '@screens/OCRProcessingScreen';
import { ConfirmationScreen } from '@screens/ConfirmationScreen';
import { SuccessScreen } from '@screens/SuccessScreen';
import { ErrorScreen } from '@screens/ErrorScreen';

const Stack = createStackNavigator<DepositStackParamList>();

export const DepositNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: COLORS.WHITE },
        animation: 'slide_from_right',
        gestureEnabled: false, // Disable swipe-back — use explicit close buttons
      }}
    >
      <Stack.Screen name="DepositOverview" component={DepositOverviewScreen} />
      <Stack.Screen name="DepositPrivacy" component={DepositPrivacyScreen} />
      <Stack.Screen name="AccountSelect" component={AccountSelectScreen} />
      <Stack.Screen name="CheckCapture" component={CheckCaptureScreen} />
      <Stack.Screen name="CheckFlip" component={CheckFlipScreen} />
      <Stack.Screen name="OCRProcessing" component={OCRProcessingScreen} />
      <Stack.Screen name="Confirmation" component={ConfirmationScreen} />
      <Stack.Screen name="Success" component={SuccessScreen} />
      <Stack.Screen name="Error" component={ErrorScreen} />
    </Stack.Navigator>
  );
};
