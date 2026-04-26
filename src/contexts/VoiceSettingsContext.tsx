// ============================================================================
// VoiceSettingsContext
// Persists verbosity + pace settings to disk; applies pace to TTSService.
// ============================================================================

import React, { createContext, useState, useEffect, useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import ttsService from '@services/ttsService';
import { isPureWozMode } from '@/config/studyMode';
import type { Verbosity } from '@utils/ttsStrings';

export type Pace = 0.5 | 1.0 | 1.5;

interface VoiceSettings {
  verbosity: Verbosity;
  pace: Pace;
}

interface VoiceSettingsContextValue extends VoiceSettings {
  setVerbosity: (v: Verbosity) => void;
  setPace: (p: Pace) => void;
}

const DEFAULTS: VoiceSettings = { verbosity: 'medium', pace: 1.0 };
const SETTINGS_FILE = (FileSystem.documentDirectory ?? '') + 'voice_settings.json';

export const VoiceSettingsContext = createContext<VoiceSettingsContextValue>({
  ...DEFAULTS,
  setVerbosity: () => {},
  setPace: () => {},
});

export const VoiceSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [verbosity, setVerbosityState] = useState<Verbosity>(DEFAULTS.verbosity);
  const [pace, setPaceState] = useState<Pace>(DEFAULTS.pace);

  // Load persisted settings on mount
  useEffect(() => {
    if (isPureWozMode()) {
      return;
    }

    (async () => {
      try {
        const info = await FileSystem.getInfoAsync(SETTINGS_FILE);
        if (info.exists) {
          const raw = await FileSystem.readAsStringAsync(SETTINGS_FILE);
          const saved: Partial<VoiceSettings> = JSON.parse(raw);
          if (saved.verbosity) setVerbosityState(saved.verbosity);
          if (saved.pace) {
            setPaceState(saved.pace);
            ttsService.setRate(saved.pace);
          }
        }
      } catch {
        // Ignore — fall back to defaults
      }
    })();
  }, []);

  const persist = useCallback(async (settings: VoiceSettings) => {
    if (isPureWozMode()) {
      return;
    }
    try {
      await FileSystem.writeAsStringAsync(SETTINGS_FILE, JSON.stringify(settings));
    } catch {
      // Non-fatal — settings will just reset next launch
    }
  }, []);

  const setVerbosity = useCallback((v: Verbosity) => {
    setVerbosityState(v);
    setPaceState(prev => {
      persist({ verbosity: v, pace: prev });
      return prev;
    });
  }, [persist]);

  const setPace = useCallback((p: Pace) => {
    ttsService.setRate(p);
    setPaceState(p);
    setVerbosityState(prev => {
      persist({ verbosity: prev, pace: p });
      return prev;
    });
  }, [persist]);

  return (
    <VoiceSettingsContext.Provider value={{ verbosity, pace, setVerbosity, setPace }}>
      {children}
    </VoiceSettingsContext.Provider>
  );
};
