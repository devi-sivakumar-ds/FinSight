// ============================================================================
// Accessibility Utilities
// ============================================================================

import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Check if screen reader is currently enabled
 */
export const isScreenReaderEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await AccessibilityInfo.isScreenReaderEnabled();
    return enabled;
  } catch (error) {
    console.warn('Error checking screen reader status:', error);
    return false;
  }
};

/**
 * Announce message to screen reader
 * @param message - Text to announce
 * @param assertive - If true, interrupts current announcement
 */
export const announceForAccessibility = (
  message: string,
  assertive: boolean = false
): void => {
  if (Platform.OS === 'ios') {
    AccessibilityInfo.announceForAccessibility(message);
  } else {
    // Android TalkBack
    AccessibilityInfo.announceForAccessibility(message);
  }
};

/**
 * Format currency for screen readers
 * @param amount - Amount in dollars
 * @returns Formatted string for screen readers
 */
export const formatCurrencyForSpeech = (amount: number): string => {
  const dollars = Math.floor(amount);
  const cents = Math.round((amount - dollars) * 100);

  if (cents === 0) {
    return `${dollars} dollar${dollars !== 1 ? 's' : ''}`;
  }

  return `${dollars} dollar${dollars !== 1 ? 's' : ''} and ${cents} cent${
    cents !== 1 ? 's' : ''
  }`;
};

/**
 * Format account number for speech (reads last 4 digits)
 * @param accountNumber - Full account number
 * @returns "ending in XXXX"
 */
export const formatAccountNumberForSpeech = (accountNumber: string): string => {
  const lastFour = accountNumber.slice(-4);
  return `ending in ${lastFour.split('').join(' ')}`;
};

/**
 * Get accessibility props for a button
 */
export const getButtonA11yProps = (
  label: string,
  hint?: string,
  disabled?: boolean
) => ({
  accessible: true,
  accessibilityRole: 'button' as const,
  accessibilityLabel: label,
  accessibilityHint: hint,
  accessibilityState: { disabled: disabled || false },
});

/**
 * Get accessibility props for a radio button
 */
export const getRadioButtonA11yProps = (
  label: string,
  selected: boolean,
  position?: number,
  total?: number
) => ({
  accessible: true,
  accessibilityRole: 'radio' as const,
  accessibilityLabel: label,
  accessibilityState: { selected },
  ...(position && total
    ? {
        accessibilityValue: {
          text: `${position} of ${total}`,
        },
      }
    : {}),
});

/**
 * Get accessibility props for text input
 */
export const getTextInputA11yProps = (
  label: string,
  value: string,
  hint?: string
) => ({
  accessible: true,
  accessibilityLabel: label,
  accessibilityHint: hint,
  accessibilityValue: { text: value },
});

/**
 * Check if reduce motion is enabled (for animations)
 */
export const isReduceMotionEnabled = async (): Promise<boolean> => {
  try {
    const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
    return reduceMotion || false;
  } catch (error) {
    console.warn('Error checking reduce motion status:', error);
    return false;
  }
};

/**
 * Set accessibility focus to a specific element
 */
export const setAccessibilityFocus = (reactTag: number): void => {
  if (Platform.OS === 'ios') {
    AccessibilityInfo.setAccessibilityFocus(reactTag);
  }
};
