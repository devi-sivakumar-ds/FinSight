// ============================================================================
// Haptics Service
// Vibration pattern library for spatial guidance and feedback
// ============================================================================

import * as Haptics from 'expo-haptics';
import { HapticPattern } from '@/types/index';

class HapticsService {
  private enabled: boolean = true;
  private isPlaying: boolean = false;
  private continuousInterval: NodeJS.Timeout | null = null;

  /**
   * Trigger a haptic pattern
   * @param pattern - HapticPattern enum value
   */
  public async trigger(pattern: HapticPattern): Promise<void> {
    if (!this.enabled) {
      console.log('[Haptics] Disabled, skipping pattern:', pattern);
      return;
    }

    console.log('[Haptics] Triggering pattern:', pattern);

    // Stop any continuous pattern first
    this.stopContinuous();

    switch (pattern) {
      case HapticPattern.SUCCESS:
        await this.playSuccess();
        break;

      case HapticPattern.ERROR:
        await this.playError();
        break;

      case HapticPattern.WARNING:
        await this.playWarning();
        break;

      case HapticPattern.EDGE_DETECTED:
        await this.playSinglePulse();
        break;

      case HapticPattern.ALIGNED:
        await this.playDoublePulse();
        break;

      case HapticPattern.MOVE_LEFT:
        await this.playMoveLeft();
        break;

      case HapticPattern.MOVE_RIGHT:
        await this.playMoveRight();
        break;

      case HapticPattern.MOVE_UP:
        await this.playMoveUp();
        break;

      case HapticPattern.MOVE_DOWN:
        await this.playMoveDown();
        break;

      case HapticPattern.HOLD_STEADY:
        await this.playHoldSteady();
        break;

      default:
        console.warn('[Haptics] Unknown pattern:', pattern);
    }
  }

  /**
   * Success pattern: Two quick pulses
   */
  private async playSuccess(): Promise<void> {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  /**
   * Error pattern: Three heavy pulses
   */
  private async playError(): Promise<void> {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }

  /**
   * Warning pattern: Two medium pulses
   */
  private async playWarning(): Promise<void> {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }

  /**
   * Single pulse
   */
  private async playSinglePulse(): Promise<void> {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  /**
   * Double pulse: Used when aligned
   */
  private async playDoublePulse(): Promise<void> {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await this.delay(100);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  /**
   * Move Left pattern: Short-Long-Short
   */
  private async playMoveLeft(): Promise<void> {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await this.delay(50);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await this.delay(50);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  /**
   * Move Right pattern: Short-Short-Long
   */
  private async playMoveRight(): Promise<void> {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await this.delay(50);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await this.delay(50);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }

  /**
   * Move Up pattern: Light-Medium-Heavy (ascending intensity)
   */
  private async playMoveUp(): Promise<void> {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await this.delay(75);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await this.delay(75);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }

  /**
   * Move Down pattern: Heavy-Medium-Light (descending intensity)
   */
  private async playMoveDown(): Promise<void> {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await this.delay(75);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await this.delay(75);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  /**
   * Hold Steady pattern: Continuous gentle pulse
   * This is a repeating pattern
   */
  private async playHoldSteady(): Promise<void> {
    // Play initial pulse
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Start continuous pattern
    this.continuousInterval = setInterval(async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 500); // Pulse every 500ms
  }

  /**
   * Stop continuous haptic patterns
   */
  public stopContinuous(): void {
    if (this.continuousInterval) {
      clearInterval(this.continuousInterval);
      this.continuousInterval = null;
      console.log('[Haptics] Stopped continuous pattern');
    }
  }

  /**
   * Enable haptic feedback
   */
  public enable(): void {
    this.enabled = true;
    console.log('[Haptics] Enabled');
  }

  /**
   * Disable haptic feedback
   */
  public disable(): void {
    this.enabled = false;
    this.stopContinuous();
    console.log('[Haptics] Disabled');
  }

  /**
   * Check if haptics is enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Selection feedback (for button taps, etc.)
   */
  public async selection(): Promise<void> {
    if (!this.enabled) return;
    await Haptics.selectionAsync();
  }

  /**
   * Light impact feedback
   */
  public async light(): Promise<void> {
    if (!this.enabled) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  /**
   * Medium impact feedback
   */
  public async medium(): Promise<void> {
    if (!this.enabled) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  /**
   * Heavy impact feedback
   */
  public async heavy(): Promise<void> {
    if (!this.enabled) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }

  /**
   * Utility: Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export default new HapticsService();
