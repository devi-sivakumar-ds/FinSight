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
      medium: 'Welcome to FinSight. FinSight is your AI voice assistant that helps you navigate your everyday banking  tasks. I will guide you through everything by voice. Your voice is processed in real time to respond to your commands and is never recorded or stored.',
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
      medium: `I'll guide you through depositing your check. You'll select an account, and I'll walk you through capturing your check image — I'll tell you when the image is captured. From there, I'll read you the check amount and you'll confirm the deposit. `,
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
      medium: 'Please flip the check over. Before proceeding, ensure you have endorsed the back.',
      high:   'Please flip the check over. Before proceeding, ensure you have endorsed the back.',
    } as VStr,
    continuePrompt: {
      low:    'Continue when ready.',
      medium: 'Say continue when you are ready.',
      high:   'Say continue when you are ready.',
    } as VStr,
  },

  // ── Check capture ──────────────────────────────────────────────────────────
  checkCapture: {
    setupPlacement: (side: 'front' | 'back'): VStr => ({
      low: side === 'front' ? 'Place phone on front.' : 'Place phone on back.',
      medium:
        side === 'front'
          ? 'Place your phone at the bottom left corner of the front of the check.'
          : 'Now place your phone at the bottom left corner of the check.',
      high:
        side === 'front'
          ? 'Place your phone at the bottom left corner of the front of the check.'
          : 'Now place your phone at the bottom left corner of the check.',
    }),
    readyPrompt: {
      low:    'Continue when ready.',
      medium: 'Say continue when you are ready.',
      high:   'Say continue when you are ready.',
    } as VStr,
    liveGuidanceStart: (side: 'front' | 'back'): VStr => ({
      low:    'Guiding now.',
      medium:
        side === 'front'
          ? "Slowly lift your phone up. I'll guide you in real time."
          : "Slowly lift your phone up. I'll guide you in real time.",
      high:
        side === 'front'
          ? "Slowly lift your phone up. I'll guide you in real time."
          : "Slowly lift your phone up. I'll guide you in real time.",
    }),
    frontDetectedReview: (amount: string): VStr => ({
      low:    `Front detected. ${amount}.`,
      medium: `I've detected the front of your check. The amount is ${amount}. Are these details correct?`,
      high:   `I've detected the front of your check. The amount is ${amount}. Are these details correct?`,
    }),
    proceedToBackCapture: {
      low:    'Proceeding to back.',
      medium: "Thank you. We'll now proceed to capturing the back.",
      high:   "Thank you. We'll now proceed to capturing the back.",
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
    guidance: {
      searching: {
        low:    'Move slowly.',
        medium: 'Move your phone slowly over the check.',
        high:   'Move your phone slowly over the check.',
      } as VStr,
      checkFound: {
        low:    'Keep moving.',
        medium: 'Keep moving slowly.',
        high:   'Keep moving slowly.',
      } as VStr,
      moveLeft: {
        low:    'Left.',
        medium: 'Move slightly to the left.',
        high:   'Move slightly to the left.',
      } as VStr,
      moveRight: {
        low:    'Right.',
        medium: 'Move slightly to the right.',
        high:   'Move slightly to the right.',
      } as VStr,
      moveUp: {
        low:    'Top.',
        medium: 'Move slightly to the top.',
        high:   'Move slightly to the top.',
      } as VStr,
      moveDown: {
        low:    'Bottom.',
        medium: 'Move slightly to the bottom.',
        high:   'Move slightly to the bottom.',
      } as VStr,
      raisePhone: {
        low:    'Higher.',
        medium: 'A bit higher.',
        high:   'A bit higher.',
      } as VStr,
      lowerPhone: {
        low:    'Lower.',
        medium: 'A bit lower.',
        high:   'A bit lower.',
      } as VStr,
      tiltLeft: {
        low:    'Tilt left.',
        medium: 'Tilt your phone a little to the left.',
        high:   'Tilt your phone a little to the left.',
      } as VStr,
      tiltRight: {
        low:    'Tilt right.',
        medium: 'Tilt your phone a little to the right.',
        high:   'Tilt your phone a little to the right.',
      } as VStr,
      tooMuchLight: {
        low:    'Shade check.',
        medium: 'Too much light. Try shading the check slightly.',
        high:   'Too much light. Try shading the check slightly.',
      } as VStr,
      notEnoughLight: {
        low:    'Brighter spot.',
        medium: 'Not enough light. Move to a brighter spot.',
        high:   'Not enough light. Move to a brighter spot.',
      } as VStr,
      holdSteady: {
        low:    'Hold steady.',
        medium: 'Perfect. Hold steady.',
        high:   'Perfect. Hold steady.',
      } as VStr,
    },
  },

  // ── OCR processing ─────────────────────────────────────────────────────────
  ocrProcessing: {
    processing: {
      low:    'Processing.',
      medium: 'Check captured. Preparing your deposit details.',
      high:   'Your check has been captured. I am now preparing your deposit details.',
    } as VStr,
    waitingForOperator: {
      low:    'Reviewing.',
      medium: 'Reviewing your check details now.',
      high:   'Reviewing your check details now.',
    } as VStr,
  },

  // ── Confirmation ───────────────────────────────────────────────────────────
  confirmation: {
    intro: {
      low:    'Check captured.',
      medium: 'Your check has been captured. Let me read the details.',
      high:   'Your check has been captured successfully. Let me read the deposit details to you.',
    } as VStr,
    reviewSummary: (amount: string, accountDigits?: string): VStr => ({
      low:    `${amount}.`,
      medium: accountDigits
        ? `I have deposited ${amount} into your checking account ending in ${accountDigits}.`
        : `I have deposited ${amount} into your selected account.`,
      high: accountDigits
        ? `I have deposited ${amount} into your checking account ending in ${accountDigits}.`
        : `I have deposited ${amount} into your selected account.`,
    }),
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
      medium: "Say 'confirm' to proceed, or 'cancel' to stop. You have 10 seconds to respond.",
      high:   "Say 'confirm' to proceed, or 'cancel' to stop. You have 10 seconds to respond.",
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
    received: (amount: string, date: string): VStr => ({
      low:    'Deposit received.',
      medium: `We have received your check. Your deposit of ${amount} has been submitted on ${date}.`,
      high:   `We have received your check. Your deposit of ${amount} has been submitted on ${date}.`,
    }),
    submitted: {
      low:    'Deposit submitted.',
      medium: 'Deposit submitted successfully.',
      high:   'Your deposit has been submitted successfully and is now being processed.',
    } as VStr,
    availableByDate: (date: string): VStr => ({
      low:    '',
      medium: `Your remaining funds will be available by ${date}.`,
      high:   `Your remaining funds will be available by ${date}.`,
    }),
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
      medium: "Your session is complete. Say done to return to the home screen.",
      high:   "Your session is complete. Say done to return to the home screen.",
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
