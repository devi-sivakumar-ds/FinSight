// ============================================================================
// AppNavigator
// Main navigation setup with bottom tabs
// ============================================================================

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MainScreen, SettingsScreen } from '@screens';
import { COLORS } from '@utils/constants';

const Tab = createBottomTabNavigator();

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
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
            tabBarAccessibilityHint: 'View your banking tasks',
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarAccessibilityLabel: 'Settings',
            tabBarAccessibilityHint: 'Adjust app settings',
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};
