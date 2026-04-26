// ============================================================================
// Wizard Commands
// Centralized operator command tree for pure Wizard of Oz mode.
// This is the operator-facing equivalent of ttsStrings.ts:
// one place to define the command ids, labels, contexts, and payload shapes.
// ============================================================================

export type WizardCommandContext =
  | 'global'
  | 'Onboarding'
  | 'MainScreen'
  | 'DepositOverview'
  | 'DepositPrivacy'
  | 'AccountSelect'
  | 'AmountInput'
  | 'CheckCapture'
  | 'CheckFlip'
  | 'OCRProcessing'
  | 'Confirmation'
  | 'Success'
  | 'Error'
  | 'Settings';

export type WizardCommandPayloadType =
  | 'none'
  | 'amount'
  | 'accountType'
  | 'ocrOutcome'
  | 'text'
  | 'pace'
  | 'verbosity'
  | 'retryScreen';

export interface WizardCommandDef {
  id: string;
  label: string;
  context: WizardCommandContext;
  payloadType: WizardCommandPayloadType;
  description?: string;
}

function cmd(
  id: string,
  label: string,
  context: WizardCommandContext,
  payloadType: WizardCommandPayloadType = 'none',
  description?: string
): WizardCommandDef {
  return { id, label, context, payloadType, description };
}

export const wizardCommands = {
  global: [
    cmd('GO_HOME', 'Go Home', 'global', 'none', 'Return to the main Tasks screen.'),
    cmd('CLOSE_FLOW', 'Close Flow', 'global', 'none', 'Dismiss the current modal flow.'),
    cmd('GO_BACK', 'Go Back', 'global', 'none', 'Go back one screen when supported.'),
  ],

  onboarding: [
    cmd('CONTINUE_FROM_ONBOARDING', 'Continue', 'Onboarding'),
  ],

  main: [
    cmd('OPEN_DEPOSIT_FLOW', 'Open Deposit Flow', 'MainScreen'),
    cmd('OPEN_SETTINGS', 'Open Settings', 'MainScreen'),
    cmd('SHOW_SEND_MONEY', 'Send Money', 'MainScreen', 'none', 'Trigger the send money placeholder response.'),
    cmd('SHOW_CHECK_BALANCE', 'Check Balance', 'MainScreen', 'none', 'Trigger the check balance placeholder response.'),
    cmd('SHOW_TRANSFER_MONEY', 'Transfer Money', 'MainScreen', 'none', 'Trigger the transfer money placeholder response.'),
  ],

  depositOverview: [
    cmd('CONTINUE_FROM_OVERVIEW', 'Continue', 'DepositOverview'),
    cmd('CLOSE_FROM_OVERVIEW', 'Close', 'DepositOverview'),
  ],

  depositPrivacy: [
    cmd('CONTINUE_FROM_PRIVACY', 'Continue', 'DepositPrivacy'),
    cmd('BACK_FROM_PRIVACY', 'Back', 'DepositPrivacy'),
    cmd('CLOSE_FROM_PRIVACY', 'Close', 'DepositPrivacy'),
  ],

  accountSelect: [
    cmd('SELECT_CHECKING', 'Select Checking', 'AccountSelect', 'accountType'),
    cmd('SELECT_SAVINGS', 'Select Savings', 'AccountSelect', 'accountType'),
    cmd('CONTINUE_FROM_ACCOUNT_SELECT', 'Continue', 'AccountSelect'),
    cmd('BACK_FROM_ACCOUNT_SELECT', 'Back', 'AccountSelect'),
    cmd('CLOSE_FROM_ACCOUNT_SELECT', 'Close', 'AccountSelect'),
  ],

  amountInput: [
    cmd('SET_AMOUNT', 'Set Amount', 'AmountInput', 'amount', 'Set the deposit amount manually from the dashboard.'),
    cmd('SET_CAPTURE_ORDER_FRONT_FIRST', 'Front Then Back', 'AmountInput'),
    cmd('SET_CAPTURE_ORDER_BACK_FIRST', 'Back Then Front', 'AmountInput'),
    cmd('CONFIRM_AMOUNT', 'Confirm Amount', 'AmountInput'),
    cmd('RETRY_AMOUNT', 'Retry Amount', 'AmountInput'),
    cmd('BACK_FROM_AMOUNT_INPUT', 'Back', 'AmountInput'),
    cmd('CLOSE_FROM_AMOUNT_INPUT', 'Close', 'AmountInput'),
  ],

  checkCapture: [
    cmd('START_CAPTURE_GUIDANCE', 'Start Capture Guidance', 'CheckCapture'),
    cmd('CAPTURE_FRONT_SUCCESS', 'Front Captured', 'CheckCapture'),
    cmd('CAPTURE_BACK_SUCCESS', 'Back Captured', 'CheckCapture'),
    cmd('CAPTURE_RETRY', 'Retry Capture', 'CheckCapture'),
    cmd('CAPTURE_FAIL', 'Capture Failed', 'CheckCapture', 'text'),
    cmd('BACK_FROM_CHECK_CAPTURE', 'Back', 'CheckCapture'),
    cmd('CLOSE_FROM_CHECK_CAPTURE', 'Close', 'CheckCapture'),
  ],

  checkFlip: [
    cmd('CONTINUE_FROM_CHECK_FLIP', 'Ready For Back Capture', 'CheckFlip'),
    cmd('BACK_FROM_CHECK_FLIP', 'Back', 'CheckFlip'),
    cmd('CLOSE_FROM_CHECK_FLIP', 'Close', 'CheckFlip'),
  ],

  ocrProcessing: [
    cmd('OCR_SUCCESS', 'OCR Success', 'OCRProcessing', 'ocrOutcome'),
    cmd('OCR_PARTIAL', 'OCR Partial', 'OCRProcessing', 'ocrOutcome'),
    cmd('OCR_FAIL', 'OCR Fail', 'OCRProcessing', 'ocrOutcome'),
  ],

  confirmation: [
    cmd('CONFIRM_DEPOSIT', 'Confirm Deposit', 'Confirmation'),
    cmd('EDIT_AMOUNT', 'Edit Amount', 'Confirmation'),
    cmd('EDIT_ACCOUNT', 'Edit Account', 'Confirmation'),
    cmd('CANCEL_DEPOSIT', 'Cancel Deposit', 'Confirmation'),
  ],

  success: [
    cmd('FINISH_SUCCESS_FLOW', 'Done', 'Success'),
    cmd('RETURN_HOME_FROM_SUCCESS', 'Go Home', 'Success'),
  ],

  error: [
    cmd('RETRY_FROM_ERROR', 'Try Again', 'Error', 'retryScreen'),
    cmd('GO_HOME_FROM_ERROR', 'Go Home', 'Error'),
  ],

  settings: [
    cmd('SETTINGS_REPEAT_INTRO', 'Repeat Settings Intro', 'Settings'),
    cmd('SETTINGS_PROMPT_VERBOSITY', 'Prompt Verbosity', 'Settings'),
    cmd('SETTINGS_ADJUST_VERBOSITY', 'Adjust Verbosity', 'Settings'),
    cmd('SETTINGS_VERBOSITY_EXAMPLE_LOW', 'Verbosity Low Example', 'Settings'),
    cmd('SETTINGS_VERBOSITY_EXAMPLE_MEDIUM', 'Verbosity Medium Example', 'Settings'),
    cmd('SETTINGS_VERBOSITY_EXAMPLE_HIGH', 'Verbosity High Example', 'Settings'),
    cmd('SETTINGS_CHOOSE_VERBOSITY', 'Choose Verbosity', 'Settings'),
    cmd('SETTINGS_PROMPT_PACING', 'Prompt Pacing', 'Settings'),
    cmd('SETTINGS_ADJUST_PACING', 'Adjust Pacing', 'Settings'),
    cmd('SETTINGS_PACING_EXAMPLE_SLOW', 'Pacing Slow Example', 'Settings'),
    cmd('SETTINGS_PACING_EXAMPLE_MEDIUM', 'Pacing Medium Example', 'Settings'),
    cmd('SETTINGS_PACING_EXAMPLE_HIGH', 'Pacing High Example', 'Settings'),
    cmd('SETTINGS_CHOOSE_PACING', 'Choose Pacing', 'Settings'),
    cmd('SETTINGS_SAVE_PREFERENCES', 'Save Preferences', 'Settings'),
    cmd('RETURN_HOME_FROM_SETTINGS', 'Return Home', 'Settings'),
  ],
} as const;

export const wizardCommandList: WizardCommandDef[] = [
  ...wizardCommands.global,
  ...wizardCommands.onboarding,
  ...wizardCommands.main,
  ...wizardCommands.depositOverview,
  ...wizardCommands.depositPrivacy,
  ...wizardCommands.accountSelect,
  ...wizardCommands.amountInput,
  ...wizardCommands.checkCapture,
  ...wizardCommands.checkFlip,
  ...wizardCommands.ocrProcessing,
  ...wizardCommands.confirmation,
  ...wizardCommands.success,
  ...wizardCommands.error,
  ...wizardCommands.settings,
];

export const wizardCommandMap = Object.fromEntries(
  wizardCommandList.map(command => [command.id, command])
) as Record<string, WizardCommandDef>;

export function getWizardCommandsForContext(
  context: WizardCommandContext
): WizardCommandDef[] {
  return wizardCommandList.filter(
    command => command.context === context || command.context === 'global'
  );
}
