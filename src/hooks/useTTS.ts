// ============================================================================
// useTTS Hook
// React hook for Text-to-Speech functionality
// ============================================================================

import { useEffect, useCallback } from 'react';
import ttsService from '@services/ttsService';
import { TTSPriority } from '@types/index';

export const useTTS = () => {
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      ttsService.clearQueue();
    };
  }, []);

  const speak = useCallback(
    (text: string, priority?: TTSPriority, interrupt?: boolean) => {
      return ttsService.speak(text, priority, interrupt);
    },
    []
  );

  const speakLow = useCallback((text: string) => {
    return ttsService.speakLow(text);
  }, []);

  const speakMedium = useCallback((text: string) => {
    return ttsService.speakMedium(text);
  }, []);

  const speakHigh = useCallback((text: string) => {
    return ttsService.speakHigh(text);
  }, []);

  const speakCritical = useCallback((text: string) => {
    return ttsService.speakCritical(text);
  }, []);

  const stop = useCallback(() => {
    return ttsService.stop();
  }, []);

  const reset = useCallback(() => {
    return ttsService.reset();
  }, []);

  return {
    speak,
    speakLow,
    speakMedium,
    speakHigh,
    speakCritical,
    stop,
    reset,
  };
};
