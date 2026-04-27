// ============================================================================
// Wizard of Oz Message Types
// Shared app <-> dashboard protocol for pure WoZ mode.
// ============================================================================

import type { CheckOCRResponse, DepositStackParamList, RootStackParamList } from '@/types/index';
import type { Pace } from '@/contexts/VoiceSettingsContext';
import type { Verbosity } from '@utils/ttsStrings';
import type {
  WizardCommandContext,
  WizardCommandPayloadType,
} from '@utils/wizardCommands';

export type WizardAccountType = 'checking' | 'savings';
export type WizardOcrOutcome = 'success' | 'partial' | 'fail';
export type WizardCaptureSide = 'front' | 'back';

export type WizardCommandPayload =
  | null
  | {
      amount: number;
    }
  | {
      accountType: WizardAccountType;
    }
  | {
      outcome: WizardOcrOutcome;
      checkNumber?: string;
      routingNumber?: string;
      accountNumber?: string;
      error?: string;
    }
  | {
      text: string;
      amountText?: string;
      accountLabel?: string;
      accountDigits?: string;
    }
  | {
      pace: Pace;
    }
  | {
      verbosity: Verbosity;
    }
  | {
      retryScreen?: keyof DepositStackParamList;
    };

export interface WizardOperatorCommand {
  id: string;
  context: WizardCommandContext;
  payloadType: WizardCommandPayloadType;
  payload: WizardCommandPayload;
  issuedAt: string;
  sessionId: string;
}

export interface WizardSessionInfo {
  sessionId: string;
  studyMode: 'pure_woz';
  connectedAt: string;
  participantLabel?: string;
  operatorLabel?: string;
  notes?: string;
}

export interface WizardDepositState {
  accountType?: WizardAccountType;
  accountId?: string;
  amount?: number;
  reviewedAmountText?: string;
  reviewedAccountLabel?: string;
  reviewedAccountDigits?: string;
  currentCaptureSide?: WizardCaptureSide;
  frontCaptured: boolean;
  backCaptured: boolean;
  frontImageUri?: string;
  backImageUri?: string;
  ocrOutcome?: WizardOcrOutcome;
  ocrData?: CheckOCRResponse['data'];
  confirmationNumber?: string;
  retryScreen?: keyof DepositStackParamList;
}

export interface WizardAppState {
  sessionId: string;
  connected: boolean;
  currentContext: WizardCommandContext;
  currentRootRoute: keyof RootStackParamList;
  currentDepositRoute?: keyof DepositStackParamList;
  currentScreenTitle?: string;
  lastCommandId?: string;
  deposit: WizardDepositState;
  settings: {
    verbosity: Verbosity;
    pace: Pace;
  };
  updatedAt: string;
}

export interface WizardLogEvent {
  id: string;
  sessionId: string;
  timestamp: string;
  type:
    | 'session_started'
    | 'session_ended'
    | 'app_connected'
    | 'app_disconnected'
    | 'operator_command_sent'
    | 'app_state_updated'
    | 'operator_note';
  commandId?: string;
  context?: WizardCommandContext;
  payload?: WizardCommandPayload;
  note?: string;
}

export type WizardMessageFromDashboard =
  | {
      type: 'operator_command';
      command: WizardOperatorCommand;
    }
  | {
      type: 'ping';
      timestamp: string;
    };

export type WizardMessageFromApp =
  | {
      type: 'app_state';
      state: WizardAppState;
    }
  | {
      type: 'session_info';
      session: WizardSessionInfo;
    }
  | {
      type: 'log_event';
      event: WizardLogEvent;
    }
  | {
      type: 'pong';
      timestamp: string;
    };
