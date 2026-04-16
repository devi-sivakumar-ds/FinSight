// ============================================================================
// useVoiceCommands Hook
// React hook for voice command registration and handling
// ============================================================================

import { useEffect, useCallback, useState } from 'react';
import { useSpeechRecognitionEvent } from 'expo-speech-recognition';
import voiceService from '@services/voiceService';
import { VoiceCommand } from '@/types/index';

interface UseVoiceCommandsOptions {
  context?: string;
  autoStart?: boolean;
}

export const useVoiceCommands = (
  commands: Record<string, VoiceCommand>,
  options: UseVoiceCommandsOptions = {}
) => {
  const { context = 'global', autoStart = false } = options;
  const [isListening, setIsListening] = useState(false);

  // Register commands on mount
  useEffect(() => {
    // Set context
    voiceService.setContext(context);

    // Register all commands
    Object.entries(commands).forEach(([id, command]) => {
      voiceService.registerCommand(id, command);
    });

    // Auto-start if requested
    if (autoStart) {
      startListening();
    }

    // Cleanup on unmount
    return () => {
      Object.keys(commands).forEach(id => {
        voiceService.unregisterCommand(id);
      });
      stopListening();
    };
  }, [context]);

  // Listen for speech recognition events
  useSpeechRecognitionEvent('result', event => {
    if (event.results && event.results[0]?.transcript) {
      const transcription = event.results[0].transcript;
      voiceService.handleResult(transcription);
    }
  });

  useSpeechRecognitionEvent('error', event => {
    console.error('[Voice Hook] Recognition error:', event.error);
    setIsListening(false);
  });

  useSpeechRecognitionEvent('end', () => {
    console.log('[Voice Hook] Recognition ended');
    setIsListening(false);
  });

  const startListening = useCallback(async () => {
    await voiceService.startListening();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(async () => {
    await voiceService.stopListening();
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(async () => {
    if (isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    startListening,
    stopListening,
    toggleListening,
  };
};
