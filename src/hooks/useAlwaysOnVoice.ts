// ============================================================================
// useAlwaysOnVoice
//
// Subscribes to voiceService's state pub/sub and returns the current
// AlwaysOnVoiceState so any screen can reflect the mic/TTS status.
//
// Usage:
//   const { voiceState } = useAlwaysOnVoice();
//   <VoiceBanner state={voiceState} listeningText="Say an amount." />
//
// No mic button, no toggle — the mic is always running.  State changes come
// from voiceService.notifyState() whenever the VAD phase or TTS activity
// changes.
// ============================================================================

import { useState, useEffect } from 'react';
import { AlwaysOnVoiceState } from '@/types/index';
import voiceService from '@services/voiceService';

export const useAlwaysOnVoice = () => {
  const [voiceState, setVoiceState] = useState<AlwaysOnVoiceState>('listening');

  useEffect(() => {
    // addStateListener returns an unsubscribe function
    const unsubscribe = voiceService.addStateListener(setVoiceState);
    return unsubscribe;
  }, []);

  return { voiceState };
};
