// ============================================================================
// AppNavigator
// Main navigation setup with tabs and deposit flow
// ============================================================================

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MainScreen, SettingsScreen } from '@screens';
import { DepositNavigator } from './DepositNavigator';
import { RootStackParamList, TabParamList } from '@/types/index';
import { isPureWozMode } from '@/config/studyMode';
import { COLORS } from '@utils/constants';
import voiceService from '@services/voiceService';

const Tab = createBottomTabNavigator<TabParamList>();
const RootStack = createStackNavigator<RootStackParamList>();

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

  return (
    <NavigationContainer>
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
          presentation: 'card',
        }}
      >
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
