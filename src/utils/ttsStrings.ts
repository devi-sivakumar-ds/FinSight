// ============================================================================
// TTS Strings — centralized, verbosity-aware speech copy
// ============================================================================
//
// Each entry has { low, medium, high } variants.
// Dynamic strings are functions returning that shape.
// Use v(verbosity, entry) to resolve to the right string.
// An empty string means "skip speaking" for that verbosity level.
// ============================================================================

export type Verbosity = 'low' | 'medium' | 'high';

export interface VStr {
  low: string;
  medium: string;
  high: string;
}

/** Pick the verbosity-appropriate string from a VStr. */
export function v(verbosity: Verbosity, strings: VStr): string {
  return strings[verbosity];
}

export const ttsStrings = {

  // ── Settings ───────────────────────────────────────────────────────────────
  settings: {
    screenAnnounce: (currentVerbosity: string, currentPace: number): VStr => ({
      low:    `Settings. Verbosity: ${currentVerbosity}. Pace: ${currentPace}x. Say a command to change.`,
      medium: `Settings. Verbosity is ${currentVerbosity}. Pace is ${currentPace}x. Say 'set verbosity low, medium, or high', or 'set pace slow, normal, or fast'.`,
      high:   `Settings screen. Your verbosity is ${currentVerbosity} and your speech pace is ${currentPace}x. To change verbosity, say 'set verbosity low', 'medium', or 'high'. To change speech pace, say 'set pace slow', 'normal', or 'fast'. To return home, say 'go home'.`,
    }),
    verbosityChanged: (label: string): VStr => ({
      low:    `${label}.`,
      medium: `Verbosity set to ${label}.`,
      high:   `Verbosity updated to ${label}. The app will now speak with ${label} detail.`,
    }),
    paceChanged: (pace: number): VStr => ({
      low:    `${pace}x.`,
      medium: `Speech pace set to ${pace}x.`,
      high:   `Speech pace updated to ${pace}x. The app will now speak ${pace < 1 ? 'slower' : pace > 1 ? 'faster' : 'at normal speed'}.`,
    }),
  },

  // ── Main screen ────────────────────────────────────────────────────────────
  main: {
    welcome: {
      low:    'Listening.',
      medium: 'Welcome to FinSight. I am listening. Say deposit a check, check balance, send money, or transfer money.',
      high:   'Welcome to FinSight, your voice-guided banking assistant. I am listening. You can say: deposit a check, check your balance, send money, or transfer money between accounts.',
    } as VStr,
    featureComingSoon: (feature: string): VStr => ({
      low:    'Coming soon.',
      medium: `${feature} is coming soon.`,
      high:   `${feature} is not available yet. It will be added in a future update.`,
    }),
  },

  // ── Account select ─────────────────────────────────────────────────────────
  depositOverview: {
    intro: {
      low:    'Deposit check.',
      medium: 'You chose to deposit a check.',
      high:   'You have chosen to deposit a check.',
    } as VStr,
    process: {
      low:    'Three steps.',
      medium: 'I will guide you through three steps: choose an account, enter the amount, and capture the front and back of the check.',
      high:   'I will guide you through the process. First you will choose an account, then enter the check amount, and finally capture the front and back of the check.',
    } as VStr,
    continuePrompt: {
      low:    'Say continue.',
      medium: "Say continue when you're ready.",
      high:   "When you're ready to begin, say continue.",
    } as VStr,
  },

  // ── Deposit privacy ───────────────────────────────────────────────────────
  depositPrivacy: {
    intro: {
      low:    'Privacy.',
      medium: 'Your privacy matters.',
      high:   'Before we begin, here is a quick privacy note.',
    } as VStr,
    details: {
      low:    'Not saved in app.',
      medium: "Your deposit information is used only for this flow and isn't stored in the app after this session.",
      high:   "Your deposit information is used only to guide this deposit flow and is not stored in the app after this session.",
    } as VStr,
    continuePrompt: {
      low:    'Continue.',
      medium: 'Say continue to choose an account.',
      high:   'Say continue to move on and choose the account for this deposit.',
    } as VStr,
  },

  // ── Account select ─────────────────────────────────────────────────────────
  accountSelect: {
    prompt: {
      low:    'Which account?',
      medium: 'Which account do you want to deposit to?',
      high:   'Which account would you like to deposit your check to?',
    } as VStr,
    accountCount: (n: number): VStr => ({
      low:    '',
      medium: `You have ${n} accounts.`,
      high:   `You have ${n} accounts. I will read them out now.`,
    }),
    accountDetail: (typeLabel: string, digits: string, balance: string): VStr => ({
      low:    `${typeLabel} ending in ${digits}.`,
      medium: `${typeLabel} ending in ${digits}, balance ${balance}`,
      high:   `${typeLabel} account ending in ${digits}, with a current balance of ${balance}.`,
    }),
    accountSelected: (typeLabel: string, digits: string): VStr => ({
      low:    `${typeLabel} selected.`,
      medium: `${typeLabel} ending in ${digits} selected.`,
      high:   `You selected your ${typeLabel} account ending in ${digits}.`,
    }),
    continuePrompt: {
      low:    '',
      medium: 'Say continue to proceed, or select a different account.',
      high:   'Say continue to proceed with this account, or select a different account to change your selection.',
    } as VStr,
    noAccount: {
      low:    'Select an account.',
      medium: 'Please select an account first.',
      high:   'Please select an account before continuing.',
    } as VStr,
  },

  // ── Amount input ───────────────────────────────────────────────────────────
  amountInput: {
    context: (label: string): VStr => ({
      low:    '',
      medium: `You're depositing to ${label} account.`,
      high:   `You are depositing to your ${label} account.`,
    }),
    prompt: {
      low:    'How much?',
      medium: 'How much are you depositing?',
      high:   "How much would you like to deposit? Say the amount, for example, 'one hundred fifty dollars'.",
    } as VStr,
    dailyLimit: (limit: string): VStr => ({
      low:    '',
      medium: `Daily limit: ${limit}.`,
      high:   `Your daily deposit limit is ${limit}.`,
    }),
    retryPrompt: {
      low:    'Try again.',
      medium: 'Okay, how much are you depositing?',
      high:   "Let's try that again. How much would you like to deposit?",
    } as VStr,
    didntCatch: {
      low:    "Didn't catch that.",
      medium: "Sorry, I didn't catch that. Please say an amount like 'one hundred fifty dollars'.",
      high:   "Sorry, I wasn't able to understand the amount. Please say it clearly, for example: one hundred fifty dollars.",
    } as VStr,
    voiceConfirm: (amount: string): VStr => ({
      low:    `${amount}. Correct?`,
      medium: `I heard ${amount}. Is that correct? Say yes to continue or no to try again.`,
      high:   `I heard ${amount}. Is that the correct deposit amount? Say yes to continue, or no to say the amount again.`,
    }),
    typedConfirm: (amount: string): VStr => ({
      low:    `${amount}.`,
      medium: `${amount}. Is that correct? Say yes to continue or no to change it.`,
      high:   `The deposit amount is ${amount}. Is that correct? Say yes to continue, or no to change it.`,
    }),
  },

  // ── Check flip ─────────────────────────────────────────────────────────────
  checkFlip: {
    frontCaptured: {
      low:    'Front captured.',
      medium: 'Front captured successfully.',
      high:   'The front of your check has been captured successfully.',
    } as VStr,
    flipInstruction: {
      low:    'Flip to show the back.',
      medium: 'Now flip the check to show the back, where you would sign it.',
      high:   'Now please flip your check over to show the back side, where you endorse or sign the check.',
    } as VStr,
    tapReady: {
      low:    'Tap when ready.',
      medium: 'Tap the screen when ready.',
      high:   'Tap anywhere on the screen when you are ready to capture the back of the check.',
    } as VStr,
  },

  // ── Check capture ──────────────────────────────────────────────────────────
  checkCapture: {
    setupInstruction: {
      low:    'Lift phone and hold over check.',
      medium: "Now slowly lift your phone straight up. I'll guide you in real time.",
      high:   "Now slowly lift your phone straight up over the check. I will guide you in real time with positioning instructions.",
    } as VStr,
    capturingNow: {
      low:    'Capturing.',
      medium: 'Capturing now!',
      high:   'Capturing your check now. Please hold steady.',
    } as VStr,
    captureFailed: {
      low:    'Failed. Try again.',
      medium: 'Failed to capture image. Please try again.',
      high:   'The image capture failed. Please try again, making sure the check is well lit and fully in frame.',
    } as VStr,
  },

  // ── OCR processing ─────────────────────────────────────────────────────────
  ocrProcessing: {
    processing: {
      low:    'Processing.',
      medium: 'Check captured. Preparing your deposit details.',
      high:   'Your check has been captured. I am now preparing your deposit details.',
    } as VStr,
  },

  // ── Confirmation ───────────────────────────────────────────────────────────
  confirmation: {
    intro: {
      low:    'Check captured.',
      medium: 'Your check has been captured. Let me read the details.',
      high:   'Your check has been captured successfully. Let me read the deposit details to you.',
    } as VStr,
    depositAmount: (amount: string): VStr => ({
      low:    `${amount}.`,
      medium: `Depositing ${amount}.`,
      high:   `The deposit amount is ${amount}.`,
    }),
    checkNumber: (digits: string): VStr => ({
      low:    '',
      medium: `Check number: ${digits}.`,
      high:   `Check number: ${digits}.`,
    }),
    toAccount: (label: string): VStr => ({
      low:    `To ${label}.`,
      medium: `To your ${label} account.`,
      high:   `This will be deposited to your ${label} account.`,
    }),
    confirmPrompt: {
      low:    'Confirm or cancel?',
      medium: "Say 'confirm' to complete the deposit, or 'cancel' to start over.",
      high:   "To complete your deposit, say confirm. To cancel this deposit, say cancel.",
    } as VStr,
    submitting: {
      low:    'Submitting.',
      medium: 'Submitting deposit...',
      high:   'Submitting your deposit now. Please wait.',
    } as VStr,
    submitError: {
      low:    'Submission failed.',
      medium: 'There was a problem submitting your deposit. Please try again.',
      high:   'There was a problem submitting your deposit. Please check your connection and try again.',
    } as VStr,
    editAmount: {
      low:    'Editing amount.',
      medium: 'Returning to amount entry.',
      high:   'Taking you back to the amount entry screen.',
    } as VStr,
    editAccount: {
      low:    'Editing account.',
      medium: 'Returning to account selection.',
      high:   'Taking you back to account selection.',
    } as VStr,
  },

  // ── Success ────────────────────────────────────────────────────────────────
  success: {
    submitted: {
      low:    'Deposit submitted.',
      medium: 'Deposit submitted successfully.',
      high:   'Your deposit has been submitted successfully and is now being processed.',
    } as VStr,
    availability: {
      low:    '',
      medium: 'Your check will be reviewed and funds will be available within 1 to 2 business days.',
      high:   'Your check will be reviewed by our team. Funds are typically available within 1 to 2 business days.',
    } as VStr,
    confirmationNumber: (digits: string): VStr => ({
      low:    `Confirmation: ${digits}.`,
      medium: `Confirmation number: ${digits}.`,
      high:   `Your confirmation number is: ${digits}. Please save this for your records.`,
    }),
    exitPrompt: {
      low:    '',
      medium: "Say 'done' or 'go home' to return to the main screen.",
      high:   "Say done or go home to return to the main screen.",
    } as VStr,
  },

  // ── Error ──────────────────────────────────────────────────────────────────
  error: {
    announcement: (msg: string): VStr => ({
      low:    `Error: ${msg}`,
      medium: `Error: ${msg}`,
      high:   `An error occurred: ${msg}`,
    }),
    retryOption: {
      low:    'Try again or go back.',
      medium: 'You can try again or return to the main screen.',
      high:   'You can tap Try Again to retry the last step, or return to the main screen to start over.',
    } as VStr,
  },

} as const;
