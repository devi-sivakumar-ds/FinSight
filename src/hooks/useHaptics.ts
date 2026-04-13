// ============================================================================
// useHaptics Hook
// React hook for haptic feedback
// ============================================================================

import { useCallback, useEffect } from 'react';
import hapticsService from '@services/hapticsService';
import { HapticPattern } from '@types/index';

export const useHaptics = () => {
  // Cleanup continuous patterns on unmount
  useEffect(() => {
    return () => {
      hapticsService.stopContinuous();
    };
  }, []);

  const trigger = useCallback((pattern: HapticPattern) => {
    return hapticsService.trigger(pattern);
  }, []);

  const selection = useCallback(() => {
    return hapticsService.selection();
  }, []);

  const light = useCallback(() => {
    return hapticsService.light();
  }, []);

  const medium = useCallback(() => {
    return hapticsService.medium();
  }, []);

  const heavy = useCallback(() => {
    return hapticsService.heavy();
  }, []);

  const stopContinuous = useCallback(() => {
    hapticsService.stopContinuous();
  }, []);

  return {
    trigger,
    selection,
    light,
    medium,
    heavy,
    stopContinuous,
  };
};
