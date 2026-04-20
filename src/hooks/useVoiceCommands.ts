// ============================================================================
// useVoiceCommands Hook
// Registers LLM action handlers for the current screen and manages mic state.
//
// Usage:
//   useVoiceCommands(
//     {
//       SELECT_CHECKING: () => selectChecking(),
//       SELECT_SAVINGS:  () => selectSavings(),
//       GO_BACK:         () => navigation.goBack(),
//       CANCEL:          () => navigation.goBack(),
//     },
//     { context: 'AccountSelect' }
//   );
//
// Design note — stale closure fix:
//   The `actions` object changes identity on every render (new inline closures).
//   If we registered it directly in the effect, voiceService would hold stale
//   handler references captured from the first render (e.g. accounts = []).
//
//   Solution: synchronously keep `actionsRef.current` up-to-date each render,
//   then register *stable wrapper* functions that always delegate through the
//   ref. voiceService always calls the *current* handler.
// ============================================================================

import { useEffect, useCallback, useState, useRef } from 'react';
import voiceService from '@services/voiceService';

interface UseVoiceCommandsOptions {
  context?: string;
  autoStart?: boolean;
}

export const useVoiceCommands = (
  actions: Record<string, () => void>,
  options: UseVoiceCommandsOptions = {}
) => {
  const { context = 'global', autoStart = false } = options;
  const [isListening, setIsListening] = useState(false);

  // Always points at the latest `actions` — updated synchronously during render
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  // Register stable wrapper functions on mount (or when screen context changes).
  // Wrappers delegate to actionsRef.current so voiceService always calls the
  // latest closure even though the wrappers themselves are only created once.
  useEffect(() => {
    voiceService.setContext(context);

    const actionKeys = Object.keys(actions);
    const stableWrappers: Record<string, () => void> = {};
    actionKeys.forEach((key) => {
      stableWrappers[key] = () => actionsRef.current[key]?.();
    });

    voiceService.registerActions(stableWrappers);

    if (autoStart) {
      startListening();
    }

    return () => {
      voiceService.unregisterActions(actionKeys);
      stopListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

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

  return { isListening, startListening, stopListening, toggleListening };
};
