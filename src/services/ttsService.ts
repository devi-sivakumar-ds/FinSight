// ============================================================================
// Text-to-Speech Service
// Queue-based announcement system with priority and interruption handling
// ============================================================================

import * as Speech from 'expo-speech';
import { TTSMessage, TTSPriority } from '@/types/index';
import { isScreenReaderEnabled } from '@utils/accessibility';
import { TTS_SETTINGS } from '@utils/constants';

class TTSService {
  private queue: TTSMessage[] = [];
  private isSpeaking: boolean = false;
  private currentMessage: TTSMessage | null = null;
  private screenReaderEnabled: boolean = false;
  private rate: number = TTS_SETTINGS.DEFAULT_RATE;
  private pitch: number = TTS_SETTINGS.DEFAULT_PITCH;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize TTS service and check screen reader status
   */
  private async initialize(): Promise<void> {
    this.screenReaderEnabled = await isScreenReaderEnabled();
    console.log('TTS Service initialized. Screen reader:', this.screenReaderEnabled);
  }

  /**
   * Speak text with specified priority
   * @param text - Text to speak
   * @param priority - Priority level (default: MEDIUM)
   * @param interrupt - Whether to interrupt current speech (default: false)
   */
  public async speak(
    text: string,
    priority: TTSPriority = TTSPriority.MEDIUM,
    interrupt: boolean = false
  ): Promise<void> {
    // If screen reader is active, suppress our TTS to avoid double-speaking
    if (this.screenReaderEnabled) {
      console.log('[TTS] Screen reader active, skipping:', text);
      return;
    }

    const message: TTSMessage = { text, priority, interrupt };

    // Handle interruption for CRITICAL priority
    if (interrupt || priority === TTSPriority.CRITICAL) {
      await this.stop();
      this.queue = []; // Clear queue
      this.currentMessage = message;
      await this.speakMessage(message);
      return;
    }

    // Add to queue
    this.addToQueue(message);

    // Start processing if not already speaking
    if (!this.isSpeaking) {
      await this.processQueue();
    }
  }

  /**
   * Add message to queue based on priority
   */
  private addToQueue(message: TTSMessage): void {
    // Insert based on priority (higher priority first)
    let inserted = false;
    for (let i = 0; i < this.queue.length; i++) {
      if (message.priority > this.queue[i].priority) {
        this.queue.splice(i, 0, message);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      this.queue.push(message);
    }

    console.log('[TTS] Added to queue. Queue length:', this.queue.length);
  }

  /**
   * Process the TTS queue
   */
  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.isSpeaking = false;
      return;
    }

    this.isSpeaking = true;
    const message = this.queue.shift()!;
    this.currentMessage = message;

    await this.speakMessage(message);

    // Process next message in queue
    await this.processQueue();
  }

  /**
   * Speak a single message
   */
  private async speakMessage(message: TTSMessage): Promise<void> {
    return new Promise((resolve) => {
      console.log('[TTS] Speaking:', message.text);

      Speech.speak(message.text, {
        rate: this.rate,
        pitch: this.pitch,
        onDone: () => {
          console.log('[TTS] Finished speaking');
          this.currentMessage = null;
          resolve();
        },
        onError: (error) => {
          console.error('[TTS] Error:', error);
          this.currentMessage = null;
          resolve();
        },
        onStopped: () => {
          console.log('[TTS] Stopped');
          this.currentMessage = null;
          resolve();
        },
      });
    });
  }

  /**
   * Stop current speech
   */
  public async stop(): Promise<void> {
    if (this.isSpeaking) {
      await Speech.stop();
      this.isSpeaking = false;
      this.currentMessage = null;
    }
  }

  /**
   * Clear the queue without stopping current speech
   */
  public clearQueue(): void {
    this.queue = [];
    console.log('[TTS] Queue cleared');
  }

  /**
   * Stop and clear everything
   */
  public async reset(): Promise<void> {
    await this.stop();
    this.clearQueue();
  }

  /**
   * Set speech rate
   * @param rate - Speech rate (0.5 to 2.0)
   */
  public setRate(rate: number): void {
    this.rate = Math.max(
      TTS_SETTINGS.MIN_RATE,
      Math.min(TTS_SETTINGS.MAX_RATE, rate)
    );
    console.log('[TTS] Rate set to:', this.rate);
  }

  /**
   * Set speech pitch
   * @param pitch - Speech pitch (0.5 to 2.0)
   */
  public setPitch(pitch: number): void {
    this.pitch = Math.max(0.5, Math.min(2.0, pitch));
    console.log('[TTS] Pitch set to:', this.pitch);
  }

  /**
   * Check if currently speaking
   */
  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Get current queue length
   */
  public getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Update screen reader status
   */
  public async updateScreenReaderStatus(): Promise<void> {
    this.screenReaderEnabled = await isScreenReaderEnabled();
    console.log('[TTS] Screen reader status updated:', this.screenReaderEnabled);
  }

  /**
   * Convenience method: Speak with LOW priority
   */
  public speakLow(text: string): Promise<void> {
    return this.speak(text, TTSPriority.LOW);
  }

  /**
   * Convenience method: Speak with MEDIUM priority
   */
  public speakMedium(text: string): Promise<void> {
    return this.speak(text, TTSPriority.MEDIUM);
  }

  /**
   * Convenience method: Speak with HIGH priority
   */
  public speakHigh(text: string): Promise<void> {
    return this.speak(text, TTSPriority.HIGH);
  }

  /**
   * Convenience method: Speak with CRITICAL priority (interrupts)
   */
  public speakCritical(text: string): Promise<void> {
    return this.speak(text, TTSPriority.CRITICAL, true);
  }
}

// Export singleton instance
export default new TTSService();
