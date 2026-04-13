// ============================================================================
// Voice Recognition Service
// Command registration, recognition, and fuzzy matching
// ============================================================================

import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { VoiceCommand } from '@types/index';
import { VOICE_RECOGNITION } from '@utils/constants';
import ttsService from './ttsService';

class VoiceService {
  private commands: Map<string, VoiceCommand> = new Map();
  private isListening: boolean = false;
  private currentContext: string = 'global';
  private onResultCallback: ((result: string) => void) | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize voice recognition
   */
  private async initialize(): Promise<void> {
    // Check if speech recognition is available
    const available = await ExpoSpeechRecognitionModule.getStateAsync();
    console.log('[Voice] Recognition state:', available);
  }

  /**
   * Register a voice command
   * @param id - Unique identifier for the command
   * @param command - VoiceCommand object
   */
  public registerCommand(id: string, command: VoiceCommand): void {
    this.commands.set(id, command);
    console.log('[Voice] Registered command:', id, command.phrases);
  }

  /**
   * Unregister a voice command
   * @param id - Command identifier to remove
   */
  public unregisterCommand(id: string): void {
    this.commands.delete(id);
    console.log('[Voice] Unregistered command:', id);
  }

  /**
   * Clear all registered commands
   */
  public clearCommands(): void {
    this.commands.clear();
    console.log('[Voice] All commands cleared');
  }

  /**
   * Set the current context (screen name)
   * @param context - Context identifier
   */
  public setContext(context: string): void {
    this.currentContext = context;
    console.log('[Voice] Context set to:', context);
  }

  /**
   * Start listening for voice input
   * @param onResult - Optional callback for raw results
   */
  public async startListening(
    onResult?: (result: string) => void
  ): Promise<void> {
    if (this.isListening) {
      console.log('[Voice] Already listening');
      return;
    }

    try {
      this.onResultCallback = onResult || null;

      // Request permissions
      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) {
        console.error('[Voice] Microphone permission denied');
        await ttsService.speakHigh(
          'Microphone permission is required for voice commands. Please enable it in settings.'
        );
        return;
      }

      // Start recognition
      await ExpoSpeechRecognitionModule.start({
        lang: VOICE_RECOGNITION.LANGUAGE,
        interimResults: false,
        maxAlternatives: VOICE_RECOGNITION.MAX_ALTERNATIVES,
        continuous: VOICE_RECOGNITION.CONTINUOUS_LISTENING,
        requiresOnDeviceRecognition: false,
      });

      this.isListening = true;
      console.log('[Voice] Started listening');
    } catch (error) {
      console.error('[Voice] Error starting recognition:', error);
      await ttsService.speakHigh(
        'Unable to start voice recognition. Please try again.'
      );
    }
  }

  /**
   * Stop listening
   */
  public async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    try {
      await ExpoSpeechRecognitionModule.stop();
      this.isListening = false;
      this.onResultCallback = null;
      console.log('[Voice] Stopped listening');
    } catch (error) {
      console.error('[Voice] Error stopping recognition:', error);
    }
  }

  /**
   * Handle speech recognition result
   * This should be called from the component using useSpeechRecognitionEvent
   */
  public handleResult(transcription: string): void {
    console.log('[Voice] Received transcription:', transcription);

    // Normalize transcription
    const normalized = transcription.toLowerCase().trim();

    // Call onResult callback if set
    if (this.onResultCallback) {
      this.onResultCallback(normalized);
    }

    // Try to match with registered commands
    const matchedCommand = this.matchCommand(normalized);

    if (matchedCommand) {
      console.log('[Voice] Matched command');

      // Speak confirmation if provided
      if (matchedCommand.confirmation) {
        ttsService.speakMedium(matchedCommand.confirmation);
      }

      // Execute command action
      matchedCommand.action();
    } else {
      console.log('[Voice] No command matched for:', normalized);
      ttsService.speakMedium(
        "I didn't understand that. Please try again or tap the screen to navigate manually."
      );
    }
  }

  /**
   * Match transcription to a registered command
   * Uses fuzzy matching to handle variations
   */
  private matchCommand(transcription: string): VoiceCommand | null {
    let bestMatch: VoiceCommand | null = null;
    let highestScore = 0;

    for (const [id, command] of this.commands) {
      // Skip commands not in current context
      if (command.context && !command.context.includes(this.currentContext) && !command.context.includes('global')) {
        continue;
      }

      // Check each phrase for this command
      for (const phrase of command.phrases) {
        const score = this.calculateMatchScore(transcription, phrase.toLowerCase());

        if (score > highestScore) {
          highestScore = score;
          bestMatch = command;
        }
      }
    }

    // Only return match if score is above threshold (70%)
    if (highestScore >= 0.7) {
      console.log('[Voice] Match score:', highestScore);
      return bestMatch;
    }

    return null;
  }

  /**
   * Calculate fuzzy match score between two strings
   * Returns 0-1 score (1 = exact match)
   */
  private calculateMatchScore(input: string, phrase: string): number {
    // Exact match
    if (input === phrase) {
      return 1.0;
    }

    // Contains phrase
    if (input.includes(phrase)) {
      return 0.9;
    }

    // Phrase contains input
    if (phrase.includes(input)) {
      return 0.85;
    }

    // Word-by-word matching
    const inputWords = input.split(' ');
    const phraseWords = phrase.split(' ');

    let matchedWords = 0;
    for (const inputWord of inputWords) {
      if (phraseWords.some(phraseWord =>
        phraseWord.includes(inputWord) || inputWord.includes(phraseWord)
      )) {
        matchedWords++;
      }
    }

    const wordScore = matchedWords / Math.max(inputWords.length, phraseWords.length);

    // Levenshtein distance for similarity
    const distanceScore = 1 - (this.levenshteinDistance(input, phrase) / Math.max(input.length, phrase.length));

    // Weighted average
    return (wordScore * 0.6) + (distanceScore * 0.4);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Check if currently listening
   */
  public getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Get current context
   */
  public getContext(): string {
    return this.currentContext;
  }

  /**
   * Get all registered commands (for debugging)
   */
  public getCommands(): Map<string, VoiceCommand> {
    return this.commands;
  }
}

// Export singleton instance
export default new VoiceService();
