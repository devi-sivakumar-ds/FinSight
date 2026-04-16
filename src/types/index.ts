// ============================================================================
// Core Types for FinSight Accessible Banking App
// ============================================================================

// Voice Command System
export interface VoiceCommand {
  phrases: string[];           // Trigger phrases
  action: () => void;          // Action to execute
  context?: string[];          // Screen contexts where active
  confirmation?: string;       // TTS confirmation message
}

// Text-to-Speech System
export enum TTSPriority {
  LOW = 0,        // General info, can be interrupted
  MEDIUM = 1,     // Important info, delay interruption
  HIGH = 2,       // Critical, cannot interrupt
  CRITICAL = 3    // Emergency, interrupt everything
}

export interface TTSMessage {
  text: string;
  priority: TTSPriority;
  interrupt?: boolean;
}

// Haptic Feedback System
export enum HapticPattern {
  // Confirmation patterns
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',

  // Navigation patterns
  EDGE_DETECTED = 'edgeDetected',
  ALIGNED = 'aligned',

  // Guidance patterns
  MOVE_LEFT = 'moveLeft',
  MOVE_RIGHT = 'moveRight',
  MOVE_UP = 'moveUp',
  MOVE_DOWN = 'moveDown',
  HOLD_STEADY = 'holdSteady',
}

// Banking Data Models
export interface Account {
  id: string;
  type: 'checking' | 'savings';
  accountNumber: string;      // Full number
  displayNumber: string;       // Last 4 digits
  balance: number;
  currency: 'USD';
}

export interface CheckOCRRequest {
  frontImageBase64: string;
  backImageBase64: string;
  userId: string;
}

export interface CheckOCRResponse {
  success: boolean;
  data?: {
    routingNumber: string;      // 9 digits
    accountNumber: string;      // Variable length
    checkNumber: string;        // Variable length
    amount?: string;            // May not be machine readable
    date?: string;
    payee?: string;
    confidence: {
      overall: number;          // 0-100
      routingNumber: number;
      accountNumber: number;
      checkNumber: number;
    };
  };
  errors?: string[];
}

export interface Deposit {
  depositId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  amount: number;
  accountId: string;
  createdAt: string;
  processedAt?: string;
  failureReason?: string;
  expectedAvailability?: string;
  confirmationNumber?: string;
}

// Camera & Check Detection
export interface CameraSettings {
  resolution: '1080p' | '720p';
  autoFocus: boolean;
  focusMode: 'continuous' | 'manual';
  orientation: 'portrait' | 'landscape';
  flashMode: 'auto' | 'on' | 'off';
}

export enum GuidanceState {
  NO_CHECK_DETECTED = 'no_check',
  TOO_FAR = 'too_far',
  TOO_CLOSE = 'too_close',
  TOO_LEFT = 'too_left',
  TOO_RIGHT = 'too_right',
  TOO_HIGH = 'too_high',
  TOO_LOW = 'too_low',
  SKEWED_LEFT = 'skewed_left',
  SKEWED_RIGHT = 'skewed_right',
  BLURRY = 'blurry',
  GOOD = 'good',
  PERFECT = 'perfect',
  CAPTURING = 'capturing'
}

export interface CaptureScore {
  coverage: number;      // 0-100, ideal: 70-90
  alignment: number;     // 0-100, ideal: >90
  focus: number;         // 0-100, ideal: >80
  lighting: number;      // 0-100, ideal: >60
}

// Navigation Types
export type DepositStackParamList = {
  AccountSelect: undefined;
  AmountInput: { accountId: string; accountType: 'checking' | 'savings' };
  CheckCapture: {
    accountId: string;
    accountType: 'checking' | 'savings';
    amount: number;
    side: 'front' | 'back';
    frontImageUri?: string; // Present when capturing back side
  };
  CheckFlip: {
    frontImageUri: string;
    accountId: string;
    accountType: 'checking' | 'savings';
    amount: number;
  };
  OCRProcessing: {
    frontImageUri: string;
    backImageUri: string;
    accountId: string;
    accountType: 'checking' | 'savings';
    amount: number;
  };
  Confirmation: {
    accountId: string;
    accountType: 'checking' | 'savings';
    amount: number;
    frontImageUri: string;
    backImageUri: string;
    ocrData?: CheckOCRResponse['data'];
  };
  Success: { deposit: Deposit };
  Error: { error: string; canRetry: boolean; retryScreen?: keyof DepositStackParamList };
};

export type TabParamList = {
  Tasks: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  TabNavigator: undefined;
  DepositFlow: undefined;
};

// State Management
export interface AppState {
  // User session
  userId: string | null;
  isAuthenticated: boolean;

  // Current deposit flow
  currentDeposit: {
    accountId?: string;
    amount?: number;
    frontImageUri?: string;
    backImageUri?: string;
    ocrData?: CheckOCRResponse['data'];
  } | null;

  // Voice & Audio state
  isListening: boolean;
  isSpeaking: boolean;
  lastSpokenText: string | null;

  // Settings
  ttsEnabled: boolean;
  ttsSpeed: number;
  hapticsEnabled: boolean;
  voiceCommandsEnabled: boolean;
}
