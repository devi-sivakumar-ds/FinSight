// ============================================================================
// Constants for FinSight App
// ============================================================================

// Accessibility
export const MIN_TOUCH_TARGET_SIZE = 44; // iOS: 44x44pt, Android: 48x48dp

// Check Deposit Limits
export const DEPOSIT_LIMITS = {
  MIN_AMOUNT: 0.01,
  MAX_AMOUNT: 7500.0,
  DAILY_LIMIT: 7500.0,
} as const;

// Camera Settings
export const CAMERA_SETTINGS = {
  RESOLUTION: '1080p' as const,
  AUTO_FOCUS: true,
  FOCUS_MODE: 'continuous' as const,
  FLASH_MODE: 'auto' as const,
  CAPTURE_DELAY: 1500, // ms - hold "perfect" state before auto-capture
  POSITIONING_TIMEOUT: 30000, // ms - 30s timeout for positioning
} as const;

// Check Detection Thresholds
export const CHECK_DETECTION = {
  MIN_COVERAGE: 70,
  MAX_COVERAGE: 95,
  MIN_ALIGNMENT: 90,
  MIN_FOCUS: 80,
  MIN_LIGHTING: 60,
  ASPECT_RATIO: 2.5, // ~2.5:1 for standard checks
} as const;

// TTS Settings
export const TTS_SETTINGS = {
  DEFAULT_RATE: 1.0,
  MIN_RATE: 0.5,
  MAX_RATE: 2.0,
  DEFAULT_PITCH: 1.0,
} as const;

// Voice Recognition
export const VOICE_RECOGNITION = {
  LANGUAGE: 'en-US',
  MAX_ALTERNATIVES: 3,
  CONTINUOUS_LISTENING: false,
} as const;

// Haptic Patterns (durations in ms)
export const HAPTIC_PATTERNS = {
  SUCCESS: [0, 50, 100, 50], // pause, vibrate, pause, vibrate
  ERROR: [0, 100, 50, 100],
  WARNING: [0, 75, 75, 75],
  SINGLE_PULSE: [0, 50],
  DOUBLE_PULSE: [0, 50, 100, 50],
  CONTINUOUS_GENTLE: [0, 30, 70, 30], // repeating pattern
} as const;

// Guidance Messages
export const GUIDANCE_MESSAGES = {
  no_check: "I don't see a check. Move the camera over the check.",
  too_far: 'Move closer to the check.',
  too_close: 'Move back slightly.',
  too_left: 'Move slightly right.',
  too_right: 'Move slightly left.',
  too_high: 'Slowly lift it up.',
  too_low: 'Lower the camera a bit.',
  skewed_left: 'Rotate clockwise slightly.',
  skewed_right: 'Rotate counter-clockwise slightly.',
  blurry: 'Hold steady for focus.',
  good: 'Almost there. Hold steady.',
  perfect: 'Perfect. Hold steady.',
  capturing: 'Capturing now...',
} as const;

// Colors from Figma Design
export const COLORS = {
  // Primary
  BLUE_50: '#e3edfa',
  BLUE_500: '#3484e5',
  BLUE_600: '#005abd',

  // Secondary
  GREEN_50: '#ecf8d3',
  GREEN_600: '#577120',

  ORANGE_50: '#fff0e1',
  ORANGE_600: '#9a5b1c',

  VIOLET_50: '#ede6ff',
  VIOLET_600: '#522eae',

  // Neutrals
  WHITE: '#ffffff',
  GRAY_00: 'white',
  GRAY_200: '#e5e7eb',
  GRAY_400: '#9ca3af',
  GRAY_700: '#4b5563',
  GRAY_900: '#111827',
} as const;

// Font Families
export const FONTS = {
  REGULAR: 'Inter_400Regular',
  SEMIBOLD: 'Inter_600SemiBold',
  BOLD: 'Inter_700Bold',
} as const;

// Z-Index Layers
export const Z_INDEX = {
  MODAL: 1000,
  OVERLAY: 900,
  HEADER: 100,
  CONTENT: 1,
} as const;
