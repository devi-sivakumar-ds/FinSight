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
    cmd('REPEAT_OVERVIEW', 'Repeat Overview', 'DepositOverview'),
    cmd('CONTINUE_FROM_OVERVIEW', 'Continue', 'DepositOverview'),
    cmd('CLOSE_FROM_OVERVIEW', 'Close', 'DepositOverview'),
  ],

  depositPrivacy: [
    cmd('CONTINUE_FROM_PRIVACY', 'Continue', 'DepositPrivacy'),
    cmd('BACK_FROM_PRIVACY', 'Back', 'DepositPrivacy'),
    cmd('CLOSE_FROM_PRIVACY', 'Close', 'DepositPrivacy'),
  ],

  accountSelect: [
    cmd('REPEAT_ACCOUNT_PROMPT', 'Repeat Account Prompt', 'AccountSelect'),
    cmd('SELECT_CHECKING', 'Select Checking', 'AccountSelect', 'accountType'),
    cmd('SELECT_SAVINGS', 'Select Savings', 'AccountSelect', 'accountType'),
    cmd('REPEAT_ACCOUNT_LIMIT', 'Repeat Account Limit', 'AccountSelect'),
    cmd('START_PRE_CAPTURE_OVERVIEW', 'Start Pre-Capture Overview', 'AccountSelect'),
    cmd('REPEAT_PRE_CAPTURE_OVERVIEW', 'Repeat Pre-Capture Overview', 'AccountSelect'),
    cmd('CONTINUE_FROM_ACCOUNT_SELECT', 'Continue', 'AccountSelect'),
    cmd('CONTINUE_TO_CAMERA', 'Continue To Camera', 'AccountSelect'),
    cmd('BACK_FROM_ACCOUNT_SELECT', 'Back', 'AccountSelect'),
    cmd('CLOSE_FROM_ACCOUNT_SELECT', 'Close', 'AccountSelect'),
  ],

  checkCapture: [
    cmd('REPEAT_CAPTURE_ORIENTATION', 'Repeat Capture Orientation', 'CheckCapture'),
    cmd('REPEAT_CAPTURE_PLACEMENT', 'Repeat Capture Placement', 'CheckCapture'),
    cmd('START_CAPTURE_GUIDANCE', 'Start Capture Guidance', 'CheckCapture'),
    cmd('GUIDE_MOVE_LEFT', 'Guide Move Left', 'CheckCapture'),
    cmd('GUIDE_MOVE_RIGHT', 'Guide Move Right', 'CheckCapture'),
    cmd('GUIDE_MOVE_FORWARD', 'Guide Move Forward', 'CheckCapture'),
    cmd('GUIDE_MOVE_BACK', 'Guide Move Back', 'CheckCapture'),
    cmd('GUIDE_TILT_LEFT', 'Guide Tilt Left', 'CheckCapture'),
    cmd('GUIDE_TILT_RIGHT', 'Guide Tilt Right', 'CheckCapture'),
    cmd('GUIDE_A_BIT_HIGHER', 'Guide A Bit Higher', 'CheckCapture'),
    cmd('GUIDE_A_BIT_LOWER', 'Guide A Bit Lower', 'CheckCapture'),
    cmd('GUIDE_TOO_MUCH_LIGHT', 'Guide Too Much Light', 'CheckCapture'),
    cmd('GUIDE_NOT_ENOUGH_LIGHT', 'Guide Not Enough Light', 'CheckCapture'),
    cmd('GUIDE_HOLD_STEADY', 'Guide Hold Steady', 'CheckCapture'),
    cmd('CAPTURE_FRONT_SUCCESS', 'Front Captured', 'CheckCapture'),
    cmd('SPEAK_FRONT_REVIEW', 'Speak Front Review', 'CheckCapture', 'text'),
    cmd('CONFIRM_FRONT_DETAILS', 'Confirm Front Details', 'CheckCapture'),
    cmd('CAPTURE_BACK_SUCCESS', 'Back Captured', 'CheckCapture'),
    cmd('CAPTURE_RETRY', 'Retry Capture', 'CheckCapture'),
    cmd('CAPTURE_FAIL', 'Capture Failed', 'CheckCapture', 'text'),
    cmd('BACK_FROM_CHECK_CAPTURE', 'Back', 'CheckCapture'),
    cmd('CLOSE_FROM_CHECK_CAPTURE', 'Close', 'CheckCapture'),
  ],

  checkFlip: [
    cmd('REPEAT_BACK_CAPTURE_INTRO', 'Repeat Back Capture Intro', 'CheckFlip'),
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
    cmd('SPEAK_POST_CAPTURE_SUMMARY', 'Speak Post-Capture Summary', 'Confirmation', 'text'),
    cmd('SPEAK_FINAL_CONFIRM_PROMPT', 'Speak Final Confirm Prompt', 'Confirmation'),
    cmd('SPEAK_COUNTDOWN_10', 'Speak Countdown 10', 'Confirmation'),
    cmd('SPEAK_COUNTDOWN_5', 'Speak Countdown 5', 'Confirmation'),
    cmd('CONFIRM_DEPOSIT', 'Confirm Deposit', 'Confirmation'),
    cmd('EDIT_AMOUNT', 'Edit Amount', 'Confirmation'),
    cmd('EDIT_ACCOUNT', 'Edit Account', 'Confirmation'),
    cmd('CANCEL_DEPOSIT', 'Cancel Deposit', 'Confirmation'),
  ],

  success: [
    cmd('SPEAK_SUCCESS_SUMMARY', 'Speak Success Summary', 'Success', 'text'),
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
