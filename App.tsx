import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { VoiceSettingsProvider } from './src/contexts/VoiceSettingsContext';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <VoiceSettingsProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </VoiceSettingsProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
