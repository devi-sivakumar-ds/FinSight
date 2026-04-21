import { useContext } from 'react';
import { VoiceSettingsContext } from '@/contexts/VoiceSettingsContext';

export const useVoiceSettings = () => useContext(VoiceSettingsContext);
