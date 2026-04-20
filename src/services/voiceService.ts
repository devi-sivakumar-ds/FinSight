// ============================================================================
// Voice Recognition Service
// Orchestrates STT (sttService) + NLU (intentService) + action dispatch.
//
// Two operating modes:
//
// 1. Legacy push-to-talk (startListening / stopListening)
//    Kept for backward compatibility; not used in always-on mode.
//
// 2. Always-on continuous listening (startContinuousListening)
//    • sttService.startSegment() runs a VAD loop.
//    • TTS start → mic paused via onTTSStart().
//    • TTS end   → mic resumed via onTTSEnd() (300ms delay).
//    • UI state broadcasts to subscribed components via addStateListener().
// ============================================================================

import ttsService from './ttsService';
import sttService from './sttService';
import intentService from './intentService';
import { AlwaysOnVoiceState } from '@/types/index';

class VoiceService {
  // ── Action registry ────────────────────────────────────────────────────────
  private actionHandlers: Map<string, () => void> = new Map();
  private currentContext: string = 'global';

  // ── Legacy push-to-talk state ─────────────────────────────────────────────
  private isListening: boolean = false;
  private onResultCallback: ((result: string) => void) | null = null;

  // ── Always-on continuous listening state ──────────────────────────────────
  private isContinuous: boolean = false;
  private isMicPaused: boolean = false;

  // Raw-transcript override: set by AmountInputScreen while focused so that
  // captured speech is routed directly to amount parsing instead of the NLU.
  private rawTranscriptCallback: ((transcript: string) => void) | null = null;

  // Pub/sub state listeners — each subscribed component gets the latest
  // AlwaysOnVoiceState whenever the mic or TTS state changes.
  private stateListeners: Set<(state: AlwaysOnVoiceState) => void> = new Set();

  constructor() {
    console.log('[Voice] VoiceService ready — STT: Groq Whisper, NLU: Groq Llama');
  }

  // --------------------------------------------------------------------------
  // Action registration (called by useVoiceCommands on each screen)
  // --------------------------------------------------------------------------

  public registerActions(actions: Record<string, () => void>): void {
    Object.entries(actions).forEach(([action, handler]) => {
      this.actionHandlers.set(action, handler);
    });
    console.log('[Voice] Registered actions:', Object.keys(actions).join(', '));
  }

  public unregisterActions(actionNames: string[]): void {
    actionNames.forEach(name => this.actionHandlers.delete(name));
    console.log('[Voice] Unregistered actions:', actionNames.join(', '));
  }

  // --------------------------------------------------------------------------
  // Context
  // --------------------------------------------------------------------------

  public setContext(context: string): void {
    this.currentContext = context;
    console.log('[Voice] Context:', context);
  }

  public getContext(): string {
    return this.currentContext;
  }

  // --------------------------------------------------------------------------
  // Always-on continuous listening
  // --------------------------------------------------------------------------

  /**
   * Start the continuous listening loop. Called once on app mount
   * (AppNavigator). Registers TTS callbacks so the mic pauses during speech.
   */
  public async startContinuousListening(): Promise<void> {
    if (this.isContinuous) {
      console.log('[Voice] Already in continuous mode');
      return;
    }
    this.isContinuous = true;
    this.isMicPaused = false;

    // Wire TTS start/end → mic pause/resume
    ttsService.setSpeakCallbacks(
      () => this.onTTSStart(),
      () => this.onTTSEnd()
    );

    console.log('[Voice] Continuous listening started');
    await this.runNextSegment();
  }

  /**
   * Tear down continuous listening (called on app unmount).
   */
  public stopContinuousListening(): void {
    if (!this.isContinuous) return;
    this.isContinuous = false;
    this.isMicPaused = false;
    sttService.cancelSegment();
    console.log('[Voice] Continuous listening stopped');
  }

  /**
   * Launch the next STT segment. The VAD loop inside sttService handles
   * silence detection; once a transcript is ready it calls our callback,
   * which dispatches the intent and then re-arms the next segment.
   */
  private async runNextSegment(): Promise<void> {
    if (!this.isContinuous || this.isMicPaused) return;

    this.notifyState('listening');

    try {
      await sttService.startSegment(async (transcript) => {
        // sttService has already confirmed valid speech — move to processing
        this.notifyState('processing');

        await this.handleResult(transcript);

        // Give TTS 150ms to start (if the action triggered speech).
        // If TTS does start, onTTSStart() will re-arm the mic once it finishes.
        // If no TTS, restart the segment immediately.
        setTimeout(() => {
          if (this.isContinuous && !this.isMicPaused && !ttsService.getIsSpeaking()) {
            this.runNextSegment();
          }
        }, 150);
      });
    } catch (error) {
      console.error('[Voice] Segment error:', error);
      this.notifyState('error');
      if (this.isContinuous) {
        setTimeout(() => this.runNextSegment(), 2000);
      }
    }
  }

  /** Called by ttsService when an utterance starts. Mutes the mic. */
  private onTTSStart(): void {
    this.isMicPaused = true;
    this.notifyState('paused');
    sttService.cancelSegment();
    console.log('[Voice] TTS started — mic paused');
  }

  /** Called by ttsService when an utterance finishes. Re-arms the mic. */
  private onTTSEnd(): void {
    this.isMicPaused = false;
    console.log('[Voice] TTS ended — resuming mic');
    if (this.isContinuous) {
      setTimeout(() => this.runNextSegment(), 300);
    }
  }

  // --------------------------------------------------------------------------
  // State pub/sub
  // --------------------------------------------------------------------------

  /**
   * Subscribe to voice state changes. Returns an unsubscribe function.
   * Used by useAlwaysOnVoice hook in each screen.
   */
  public addStateListener(cb: (state: AlwaysOnVoiceState) => void): () => void {
    this.stateListeners.add(cb);
    return () => this.stateListeners.delete(cb);
  }

  private notifyState(state: AlwaysOnVoiceState): void {
    this.stateListeners.forEach(cb => cb(state));
  }

  // --------------------------------------------------------------------------
  // Raw transcript override (AmountInputScreen)
  // --------------------------------------------------------------------------

  /**
   * While set, all transcripts are forwarded here instead of the NLU pipeline.
   * AmountInputScreen sets this via useFocusEffect so amount speech bypasses
   * intent classification.
   */
  public setRawTranscriptCallback(cb: ((transcript: string) => void) | null): void {
    this.rawTranscriptCallback = cb;
    console.log('[Voice] Raw transcript callback:', cb ? 'set' : 'cleared');
  }

  // --------------------------------------------------------------------------
  // Legacy push-to-talk (kept for backward compatibility)
  // --------------------------------------------------------------------------

  public async startListening(onResult?: (result: string) => void): Promise<void> {
    if (this.isListening) {
      console.log('[Voice] Already listening');
      return;
    }

    try {
      this.onResultCallback = onResult ?? null;
      await ttsService.reset();
      await sttService.start();
      this.isListening = true;
      console.log('[Voice] Legacy listening started');
    } catch (error) {
      console.error('[Voice] Error starting recording:', error);
      ttsService.speakHigh('Unable to start voice input. Please check microphone permissions.');
    }
  }

  public async stopListening(): Promise<void> {
    if (!this.isListening) return;
    this.isListening = false;

    try {
      const transcript = await sttService.stop();
      console.log('[Voice] Legacy transcript:', transcript);
      await this.handleResult(transcript);
    } catch (error) {
      console.error('[Voice] Error stopping / transcribing:', error);
      ttsService.speakHigh("Sorry, I couldn't hear that. Please try again.");
    } finally {
      this.onResultCallback = null;
    }
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  // --------------------------------------------------------------------------
  // Dispatch
  // --------------------------------------------------------------------------

  /**
   * Handle a transcript:
   *   1. If rawTranscriptCallback is set (AmountInputScreen) → forward and return.
   *   2. If legacy onResultCallback is set → forward and return.
   *   3. Otherwise classify via intentService and dispatch to registered handler.
   */
  public async handleResult(transcript: string): Promise<void> {
    const normalized = transcript.toLowerCase().trim();
    console.log('[Voice] Handling transcript:', normalized);

    // AmountInputScreen raw path
    if (this.rawTranscriptCallback) {
      this.rawTranscriptCallback(normalized);
      return;
    }

    // Legacy raw path
    if (this.onResultCallback) {
      this.onResultCallback(normalized);
      return;
    }

    // Intent path — classify then dispatch
    const availableActions = Array.from(this.actionHandlers.keys());

    try {
      const intent = await intentService.classify(normalized, this.currentContext, availableActions);

      if (intent.action === 'UNKNOWN') {
        ttsService.speakMedium("I didn't catch that. Please try again or use the buttons.");
        return;
      }

      const handler = this.actionHandlers.get(intent.action);
      if (handler) {
        console.log(
          `[Voice] Executing: ${intent.action} (${intent.source}, conf ${intent.confidence.toFixed(2)})`
        );
        handler();
      } else {
        console.log('[Voice] No handler for action:', intent.action);
        ttsService.speakMedium("I'm not sure how to help with that right now.");
      }
    } catch (error) {
      console.error('[Voice] Intent classification error:', error);
      ttsService.speakMedium('Something went wrong. Please try again.');
    }
  }
}

export default new VoiceService();
