// ============================================================================
// STT Service — Speech-to-Text via Groq Whisper
// Records audio with expo-av, sends to Groq Whisper, returns transcript string.
//
// Usage:
//   await sttService.start();        // begins recording
//   const text = await sttService.stop();  // stops, transcribes, returns text
// ============================================================================

import { Audio } from 'expo-av';
import { GROQ_API_KEY } from '@env';

const GROQ_WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

class STTService {
  private recording: Audio.Recording | null = null;
  private isRecording: boolean = false;

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Start recording audio from the microphone.
   * Requests mic permission if not already granted.
   * Throws if permission is denied.
   */
  async start(): Promise<void> {
    if (this.isRecording) {
      console.log('[STT] Already recording — ignoring start()');
      return;
    }

    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      throw new Error('Microphone permission denied. Enable it in device Settings.');
    }

    // Required on iOS so recording works while the ringer is silenced
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );

    this.recording = recording;
    this.isRecording = true;
    console.log('[STT] Recording started');
  }

  /**
   * Stop recording and transcribe via Groq Whisper.
   * Returns the transcript string (trimmed).
   * Throws if not currently recording or if Groq returns an error.
   */
  async stop(): Promise<string> {
    if (!this.recording || !this.isRecording) {
      throw new Error('[STT] stop() called but not recording');
    }

    await this.recording.stopAndUnloadAsync();
    const uri = this.recording.getURI();
    this.recording = null;
    this.isRecording = false;

    // Reset audio mode so playback works normally after recording
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });

    if (!uri) throw new Error('[STT] No recording URI returned by expo-av');

    console.log('[STT] Recording stopped. URI:', uri);
    return this.transcribe(uri);
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  // --------------------------------------------------------------------------
  // Private
  // --------------------------------------------------------------------------

  private async transcribe(uri: string): Promise<string> {
    const start = Date.now();
    console.log('[STT] Sending to Groq Whisper...');

    // React Native FormData accepts { uri, type, name } as a file part
    const formData = new FormData();
    formData.append('file', {
      uri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as unknown as Blob);
    formData.append('model', 'whisper-large-v3');
    formData.append('language', 'en');
    formData.append('response_format', 'text'); // plain text response, not JSON

    const response = await fetch(GROQ_WHISPER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        // Do NOT set Content-Type manually — FormData sets it with the correct boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`[STT] Groq Whisper ${response.status}: ${errBody.slice(0, 200)}`);
    }

    const transcript = (await response.text()).trim();
    console.log(`[STT] Transcript (${Date.now() - start}ms): "${transcript}"`);
    return transcript;
  }
}

export default new STTService();
