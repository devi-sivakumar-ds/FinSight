// ============================================================================
// STT Service — Speech-to-Text via Groq Whisper
//
// Two modes:
//
// 1. Legacy (manual push-to-talk):
//      await sttService.start();
//      const text = await sttService.stop();
//
// 2. Always-on (VAD-driven, used by continuous listening):
//      sttService.startSegment(onTranscript)  — runs a VAD capture loop
//      sttService.cancelSegment()             — aborts the current segment
//
// VAD logic:
//   • expo-av metering sampled every VAD_PROGRESS_INTERVAL_MS (100ms).
//   • dB > VAD_SPEECH_THRESHOLD_DB (-35) → speech phase.
//   • VAD_SILENCE_TIMEOUT_MS (1 500ms) of silence after speech → send to Groq.
//   • VAD_MIN_SPEECH_MS (400ms) minimum speech required to bother transcribing.
//   • VAD_MAX_IDLE_MS (8 000ms) no speech detected → restart capture silently.
//   • VAD_MAX_SEGMENT_MS (25 000ms) hard cap per segment.
// ============================================================================

import { Audio } from 'expo-av';
import { GROQ_API_KEY } from '@env';

const GROQ_WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

// VAD tuning constants
const VAD_SPEECH_THRESHOLD_DB = -35;   // dB above this = speech
const VAD_SILENCE_TIMEOUT_MS  = 1500;  // silence after speech → end segment
const VAD_MIN_SPEECH_MS       = 400;   // minimum speech to send to Groq
const VAD_MAX_IDLE_MS         = 8000;  // restart if no speech detected
const VAD_MAX_SEGMENT_MS      = 25000; // hard cap per segment
const VAD_PROGRESS_INTERVAL_MS = 100;  // metering poll rate

type VADPhase = 'idle' | 'speech' | 'end';

// Recording options with metering enabled
const RECORDING_OPTIONS_WITH_METERING: Audio.RecordingOptions = {
  ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
};

class STTService {
  // ── Legacy recording state ──────────────────────────────────────────────
  private legacyRecording: Audio.Recording | null = null;
  private isLegacyRecording: boolean = false;

  // ── Always-on VAD state (class-level so cancelSegment can touch it) ─────
  private activeSegmentId: number = 0;
  private vadRecording: Audio.Recording | null = null;
  private vadPhase: VADPhase = 'end';
  private speechStartTime: number | null = null;
  private segmentResolve: ((uri: string | null) => void) | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private maxSegTimer: ReturnType<typeof setTimeout> | null = null;

  // --------------------------------------------------------------------------
  // Public API — Legacy (push-to-talk)
  // --------------------------------------------------------------------------

  async start(): Promise<void> {
    if (this.isLegacyRecording) {
      console.log('[STT] Already recording — ignoring start()');
      return;
    }

    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) throw new Error('Microphone permission denied. Enable it in device Settings.');

    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );

    this.legacyRecording = recording;
    this.isLegacyRecording = true;
    console.log('[STT] Legacy recording started');
  }

  async stop(): Promise<string> {
    if (!this.legacyRecording || !this.isLegacyRecording) {
      throw new Error('[STT] stop() called but not recording');
    }

    await this.legacyRecording.stopAndUnloadAsync();
    const uri = this.legacyRecording.getURI();
    this.legacyRecording = null;
    this.isLegacyRecording = false;

    await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });

    if (!uri) throw new Error('[STT] No recording URI');
    console.log('[STT] Legacy stopped. URI:', uri);
    return this.transcribe(uri);
  }

  getIsRecording(): boolean {
    return this.isLegacyRecording;
  }

  // --------------------------------------------------------------------------
  // Public API — Always-on VAD
  // --------------------------------------------------------------------------

  /**
   * Start a VAD-driven capture loop.
   * Internally calls captureOneAttempt in a while-loop:
   *   • If no speech detected (idle timeout) → restart silently.
   *   • If speech captured → transcribe → call onTranscript → exit loop.
   *   • If cancelled (cancelSegment called) → exit loop.
   *
   * The caller (voiceService) is responsible for restarting via runNextSegment().
   */
  async startSegment(onTranscript: (transcript: string) => void): Promise<void> {
    this.activeSegmentId++;
    const segId = this.activeSegmentId;
    console.log('[STT] Starting segment id:', segId);

    while (this.activeSegmentId === segId) {
      const uri = await this.captureOneAttempt(segId);

      // Segment was cancelled mid-capture
      if (this.activeSegmentId !== segId) break;

      // No speech detected (idle timeout) — restart recording loop
      if (!uri) {
        console.log('[STT] Idle timeout — restarting capture...');
        continue;
      }

      // Got audio — transcribe then hand off to caller
      try {
        const transcript = await this.transcribe(uri);
        if (this.activeSegmentId === segId && transcript.trim()) {
          onTranscript(transcript.trim());
        }
      } catch (err) {
        console.error('[STT] Transcription error:', err);
      }

      // Done — voiceService.runNextSegment() will restart the next segment
      break;
    }
    console.log('[STT] Segment', segId, 'loop exited');
  }

  /**
   * Abort the current VAD capture immediately.
   * The in-flight Promise resolves null, the while-loop exits.
   */
  cancelSegment(): void {
    this.activeSegmentId++;
    console.log('[STT] cancelSegment — new id:', this.activeSegmentId);
    this.finishCapture(false);
  }

  // --------------------------------------------------------------------------
  // Private — VAD capture
  // --------------------------------------------------------------------------

  /**
   * Record one audio segment using VAD.
   * Returns the audio file URI if valid speech was captured, null otherwise.
   */
  private async captureOneAttempt(segId: number): Promise<string | null> {
    if (this.activeSegmentId !== segId) return null;

    // Reset VAD state for fresh capture
    this.vadPhase = 'idle';
    this.speechStartTime = null;
    this.clearVADTimers();

    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) throw new Error('Mic permission denied');
    if (this.activeSegmentId !== segId) return null;

    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    if (this.activeSegmentId !== segId) return null;

    return new Promise<string | null>(async (resolve) => {
      this.segmentResolve = resolve;

      // Idle timeout — no speech for MAX_IDLE_MS
      this.idleTimer = setTimeout(() => {
        console.log('[STT] No speech detected — idle timeout');
        this.finishCapture(false);
      }, VAD_MAX_IDLE_MS);

      // Hard segment cap
      this.maxSegTimer = setTimeout(() => {
        const duration = this.speechStartTime ? Date.now() - this.speechStartTime : 0;
        console.log('[STT] Max segment time — duration:', duration, 'ms');
        this.finishCapture(duration >= VAD_MIN_SPEECH_MS);
      }, VAD_MAX_SEGMENT_MS);

      try {
        const { recording } = await Audio.Recording.createAsync(
          RECORDING_OPTIONS_WITH_METERING,
          (status) => this.onRecordingStatus(status, segId),
          VAD_PROGRESS_INTERVAL_MS
        );

        // Check for cancellation that arrived during createAsync await
        if (this.activeSegmentId !== segId) {
          try { await recording.stopAndUnloadAsync(); } catch {}
          if (this.segmentResolve) {
            this.segmentResolve(null);
            this.segmentResolve = null;
          }
          return;
        }

        this.vadRecording = recording;
      } catch (err) {
        console.error('[STT] Failed to start recording:', err);
        this.vadPhase = 'end';
        this.clearVADTimers();
        const res = this.segmentResolve;
        this.segmentResolve = null;
        res?.(null);
      }
    });
  }

  /**
   * Called by expo-av on each metering update. Drives the VAD state machine.
   */
  private onRecordingStatus(status: Audio.RecordingStatus, segId: number): void {
    if (this.activeSegmentId !== segId || this.vadPhase === 'end') return;
    if (!status.isRecording) return;

    const db = status.metering ?? -160;
    const isSpeech = db > VAD_SPEECH_THRESHOLD_DB;
    const now = Date.now();

    if (isSpeech && this.vadPhase === 'idle') {
      // Speech onset
      this.vadPhase = 'speech';
      this.speechStartTime = now;
      clearTimeout(this.idleTimer!);
      this.idleTimer = null;
      console.log('[STT] Speech detected, dB:', db.toFixed(1));
    } else if (!isSpeech && this.vadPhase === 'speech') {
      // Silence after speech — start countdown
      if (!this.silenceTimer) {
        this.silenceTimer = setTimeout(() => {
          const duration = this.speechStartTime ? Date.now() - this.speechStartTime : 0;
          console.log(`[STT] Silence timeout — speech was ${duration}ms`);
          this.finishCapture(duration >= VAD_MIN_SPEECH_MS);
        }, VAD_SILENCE_TIMEOUT_MS);
      }
    } else if (isSpeech && this.silenceTimer) {
      // Speech resumed during silence window
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  /**
   * Stop the current VAD recording and resolve the segment Promise.
   * Safe to call multiple times (guarded by vadPhase === 'end').
   */
  private finishCapture(hasValidSpeech: boolean): void {
    if (this.vadPhase === 'end') return;
    this.vadPhase = 'end';
    this.clearVADTimers();
    this.doStop(hasValidSpeech);
  }

  private async doStop(hasValidSpeech: boolean): Promise<void> {
    const resolve = this.segmentResolve;
    this.segmentResolve = null;

    const rec = this.vadRecording;
    this.vadRecording = null;

    if (!rec) {
      resolve?.(null);
      return;
    }

    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      resolve?.(hasValidSpeech && uri ? uri : null);
    } catch (err) {
      console.error('[STT] Error stopping recording:', err);
      try {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      } catch {}
      resolve?.(null);
    }
  }

  private clearVADTimers(): void {
    if (this.silenceTimer) { clearTimeout(this.silenceTimer); this.silenceTimer = null; }
    if (this.idleTimer)    { clearTimeout(this.idleTimer);    this.idleTimer = null;    }
    if (this.maxSegTimer)  { clearTimeout(this.maxSegTimer);  this.maxSegTimer = null;  }
  }

  // --------------------------------------------------------------------------
  // Private — Groq Whisper transcription (shared by both modes)
  // --------------------------------------------------------------------------

  private async transcribe(uri: string): Promise<string> {
    const start = Date.now();
    console.log('[STT] Sending to Groq Whisper...');

    const formData = new FormData();
    formData.append('file', {
      uri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as unknown as Blob);
    formData.append('model', 'whisper-large-v3');
    formData.append('language', 'en');
    formData.append('response_format', 'text');

    const response = await fetch(GROQ_WHISPER_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
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
