// ============================================================================
// AppNavigator
// Main navigation setup with tabs and deposit flow
// ============================================================================

import React, { useCallback, useEffect } from 'react';
import {
  NavigationContainer,
  NavigationState,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MainScreen, OnboardingScreen, SettingsScreen } from '@screens';
import { DepositNavigator } from './DepositNavigator';
import { RootStackParamList, TabParamList } from '@/types/index';
import { useVoiceSettings } from '@hooks/useVoiceSettings';
import { isPureWozMode } from '@/config/studyMode';
import wizardClient from '@services/wizardClient';
import { executeWizardCommand } from '@services/wizardExecutor';
import wizardState from '@services/wizardState';
import type { WizardAppState, WizardLogEvent } from '@/types/wizard';
import type { WizardCommandContext } from '@utils/wizardCommands';
import { COLORS } from '@utils/constants';
import voiceService from '@services/voiceService';

const Tab = createBottomTabNavigator<TabParamList>();
const RootStack = createStackNavigator<RootStackParamList>();

function getActiveRouteChain(state: NavigationState | undefined): string[] {
  const chain: string[] = [];
  let currentState: NavigationState | undefined = state;

  while (currentState) {
    const index = currentState.index ?? 0;
    const route = currentState.routes[index] as any;
    if (!route) break;

    chain.push(route.name);
    currentState = route.state as NavigationState | undefined;
  }

  return chain;
}

function getWizardContextFromRoute(routeName?: string): WizardCommandContext {
  switch (routeName) {
    case 'Onboarding':
      return 'Onboarding';
    case 'Tasks':
      return 'MainScreen';
    case 'Settings':
      return 'Settings';
    case 'DepositOverview':
      return 'DepositOverview';
    case 'DepositPrivacy':
      return 'DepositPrivacy';
    case 'AccountSelect':
      return 'AccountSelect';
    case 'AmountInput':
      return 'AmountInput';
    case 'CheckCapture':
      return 'CheckCapture';
    case 'CheckFlip':
      return 'CheckFlip';
    case 'OCRProcessing':
      return 'OCRProcessing';
    case 'Confirmation':
      return 'Confirmation';
    case 'Success':
      return 'Success';
    case 'Error':
      return 'Error';
    default:
      return 'global';
  }
}

const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Tasks') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.BLUE_600,
        tabBarInactiveTintColor: COLORS.GRAY_400,
        tabBarLabelStyle: {
          fontSize: 17,
          fontWeight: '600',
        },
        tabBarStyle: {
          paddingTop: 12,
          paddingBottom: 25,
          height: 85,
          borderTopWidth: 1,
          borderTopColor: COLORS.GRAY_200,
          backgroundColor: COLORS.WHITE,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Tasks"
        component={MainScreen}
        options={{
          tabBarAccessibilityLabel: 'Tasks',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarAccessibilityLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const {
    verbosity,
    pace,
    visualVerbosity,
    visualPace,
    setVisualVerbosity,
    setVisualPace,
  } = useVoiceSettings();

  const reportWizardState = useCallback((lastCommandId?: string) => {
    if (!isPureWozMode()) return;

    const rootState = navigationRef.getRootState();
    if (!rootState) return;

    const routeChain = getActiveRouteChain(rootState);
    const currentRoute = routeChain[routeChain.length - 1];
    const currentRootRoute = (routeChain[0] ?? 'TabNavigator') as keyof RootStackParamList;
    const currentDepositRoute =
      currentRootRoute === 'DepositFlow' && routeChain.length > 1
        ? routeChain[1]
        : undefined;

    const state: WizardAppState = {
      sessionId: wizardClient.getSessionInfo().sessionId,
      connected: wizardClient.isConnected(),
      currentContext: getWizardContextFromRoute(currentRoute),
      currentRootRoute,
      currentDepositRoute: currentDepositRoute as any,
      currentScreenTitle: currentRoute,
      lastCommandId,
      deposit: wizardState.getDepositState(),
      settings: {
        verbosity,
        pace,
      },
      updatedAt: new Date().toISOString(),
    };

    wizardClient.sendAppState(state);
  }, [navigationRef, pace, verbosity]);

  // Start always-on continuous listening once the app mounts.
  // A single VAD segment loop runs for the entire app lifetime — no mic button.
  useEffect(() => {
    if (isPureWozMode()) {
      console.log('[AppNavigator] pure_woz mode active — skipping always-on voice startup');
      return;
    }

    voiceService.startContinuousListening().catch(console.error);
    return () => voiceService.stopContinuousListening();
  }, []);

  useEffect(() => {
    if (!isPureWozMode()) return;

    wizardClient.start();

    wizardClient.sendSessionInfo({
      operatorLabel: 'Laptop Dashboard',
    });

    const unsubscribeConnection = wizardClient.addConnectionListener(connected => {
      const event: WizardLogEvent = {
        id: `evt_${Date.now()}`,
        sessionId: wizardClient.getSessionInfo().sessionId,
        timestamp: new Date().toISOString(),
        type: connected ? 'app_connected' : 'app_disconnected',
      };

      wizardClient.sendLogEvent(event);
      reportWizardState();
    });

    const unsubscribeCommands = wizardClient.addCommandListener(command => {
      const event: WizardLogEvent = {
        id: `evt_${Date.now()}`,
        sessionId: command.sessionId,
        timestamp: new Date().toISOString(),
        type: 'operator_command_sent',
        commandId: command.id,
        context: command.context,
        payload: command.payload,
      };

      wizardClient.sendLogEvent(event);
      executeWizardCommand(command, {
        navigationRef,
        verbosity,
        visualVerbosity,
        visualPace,
        setVisualVerbosity,
        setVisualPace,
      });

      setTimeout(() => {
        reportWizardState(command.id);
      }, 50);
    });

    return () => {
      unsubscribeConnection();
      unsubscribeCommands();
      wizardClient.stop();
    };
  }, [
    reportWizardState,
    navigationRef,
    verbosity,
    visualVerbosity,
    visualPace,
    setVisualVerbosity,
    setVisualPace,
  ]);

  useEffect(() => {
    reportWizardState();
  }, [pace, reportWizardState, verbosity]);

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => reportWizardState()}
      onStateChange={() => reportWizardState()}
    >
      <RootStack.Navigator
        initialRouteName="Onboarding"
        screenOptions={{
          headerShown: false,
          presentation: 'card',
        }}
      >
        <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
        <RootStack.Screen name="TabNavigator" component={TabNavigator} />
        <RootStack.Screen
          name="DepositFlow"
          component={DepositNavigator}
          options={{
            presentation: 'modal',
          }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
};
