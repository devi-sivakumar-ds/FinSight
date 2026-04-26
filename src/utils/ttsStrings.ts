// ============================================================================
// TTS Strings — centralized, verbosity-aware speech copy
// ============================================================================
//
// Each entry has { low, medium, high } variants.
// Dynamic strings are functions returning that shape.
// Use v(verbosity, entry) to resolve to the right string.
// An empty string means "skip speaking" for that verbosity level.
// ============================================================================

import { isPureWozMode } from '@/config/studyMode';

export type Verbosity = 'low' | 'medium' | 'high';

export interface VStr {
  low: string;
  medium: string;
  high: string;
}

/** Pick the verbosity-appropriate string from a VStr. */
export function v(verbosity: Verbosity, strings: VStr): string {
  if (isPureWozMode()) {
    return strings.medium;
  }
  return strings[verbosity];
}

export const ttsStrings = {

  // ── Onboarding ─────────────────────────────────────────────────────────────
  onboarding: {
    welcome: {
      low:    'Welcome to FinSight.',
      medium: 'Welcome to FinSight. FinSight is your AI voice assistant that helps you navigate your everyday banking tasks. I will guide you through everything by voice. Your voice is processed in real time to respond to your commands and is never recorded or stored.',
      high:   'Welcome to FinSight. FinSight is your voice-guided banking assistant. I will guide you through your everyday banking tasks by voice. Your voice is processed in real time to respond to your commands and is never recorded or stored. Say continue when you are ready to go to the home page.',
    } as VStr,
  },

  // ── Settings ───────────────────────────────────────────────────────────────
  settings: {
    entry: {
      low:    'Settings.',
      medium: 'In Settings, you can adjust how much detail you hear in each prompt, and control the speed and timing of my voice. What do you want to adjust?',
      high:   'In Settings, you can adjust how much detail you hear in each prompt, and control the speed and timing of my voice. What do you want to adjust?',
    } as VStr,
    screenAnnounce: (currentVerbosity: string, currentPace: number): VStr => ({
      low:    `Settings. Verbosity: ${currentVerbosity}. Pace: ${currentPace}x. Say a command to change.`,
      medium: `Settings. Verbosity is ${currentVerbosity}. Pace is ${currentPace}x. Say 'set verbosity low, medium, or high', or 'set pace slow, normal, or fast'.`,
      high:   `Settings screen. Your verbosity is ${currentVerbosity} and your speech pace is ${currentPace}x. To change verbosity, say 'set verbosity low', 'medium', or 'high'. To change speech pace, say 'set pace slow', 'normal', or 'fast'. To return home, say 'go home'.`,
    }),
    verbosityIntro: {
      low:    'Verbosity settings.',
      medium: "Let me help you adjust the verbosity settings. How much detail would you like me to give? There are three levels: Low, Medium, High. Say the level you'd like to hear an example of.",
      high:   "Let me help you adjust the verbosity settings. How much detail would you like me to give? There are three levels: Low, Medium, High. Say the level you'd like to hear an example of.",
    } as VStr,
    verbosityExampleLow: {
      low:    'Low example.',
      medium: "You've selected LOW. It sounds like this: FinSight is a voice assistant for everyday banking. Sonic sound. Say choose Low to select this, or say Medium or High to hear another example.",
      high:   "You've selected LOW. It sounds like this: FinSight is a voice assistant for everyday banking. Sonic sound. Say choose Low to select this, or say Medium or High to hear another example.",
    } as VStr,
    verbosityExampleMedium: {
      low:    'Medium example.',
      medium: `You’ve selected MEDIUM. It sounds like this: FinSight is a voice assistant for everyday
              banking, designed for blind and low-vision users.(Sonic Sound) Say choose Medium to select this, or say Low or High
              to hear another example.`,
      high:   "You've selected MEDIUM. It sounds like this: [Replace this with the medium verbosity example.] Sonic sound. Say choose Medium to select this, or say Low or High to hear another example.",
    } as VStr,
    verbosityExampleHigh: {
      low:    'High example.',
      medium: `You’ve selected HIGH. It sounds like this: FinSight is a voice-first banking assistant
              designed for blind and low-vision users, helping you complete everyday banking tasks independently and with
              confidence.(Sonic Sound) Say 'choose High to select this, or say Low or Medium to hear another example.`,
      high:   "You've selected HIGH. It sounds like this: [Replace this with the high verbosity example.] Sonic sound. Say choose High to select this, or say Low or Medium to hear another example.",
    } as VStr,
    verbosityChanged: (label: string): VStr => ({
      low:    `${label}.`,
      medium: `Verbosity set to ${label}.`,
      high:   `Verbosity updated to ${label}. The app will now speak with ${label} detail.`,
    }),
    verbositySelected: (label: string): VStr => ({
      low:    `${label}.`,
      medium: `Verbosity has been set to ${label}.`,
      high:   `Verbosity has been set to ${label}.`,
    }),
    preferencesSaved: (paceLabel: string, verbosityLabel: string): VStr => ({
      low:    `${paceLabel}. ${verbosityLabel}.`,
      medium: `Your preferences have been saved. I will speak at ${paceLabel} speed with ${verbosityLabel} detail. Say "verbosity" or "pacing" to make changes, or say "go home."`,
      high:   `Your preferences have been saved. I will speak at ${paceLabel} speed with ${verbosityLabel} detail. Say "verbosity" or "pacing" to make changes, or say "go home."`,
    }),
    verbosityOffer: {
      low:    'Adjust verbosity?',
      medium: 'Do you want to adjust Verbosity?',
      high:   'Do you want to adjust Verbosity?',
    } as VStr,
    pacingOffer: {
      low:    'Adjust pacing?',
      medium: 'Do you want to adjust Pacing?',
      high:   'Do you want to adjust Pacing?',
    } as VStr,
    pacingIntro: {
      low:    'Pacing settings.',
      medium: `Let me help you adjust the pacing. There are three options: 0.5x, 1.0x, and 1.5x. Say the option you would like to hear an example of.`,
      high:   "Let me help you adjust the pacing settings. How fast would you like me to speak? There are three levels: Slow, Medium, High. Say the level you'd like to hear an example of.",
    } as VStr,
    pacingExampleSlow: {
      low:    'Slow example.',
      medium: `You’ve selected 0.5x. It sounds like this: ‘FinSight is a voice assistant for everyday banking.'(Sonic Sound) Say
              'choose 0.5x' to select this, or say '1.0x' or '1.5x' to hear another example.`,
      high:   "You've selected SLOW. It sounds like this: [Replace this with the slow pacing example.] Sonic sound. Say choose Slow to select this, or say Medium or High to hear another example.",
    } as VStr,
    pacingExampleMedium: {
      low:    'Medium pace example.',
      medium: `You’ve selected 1.0x. It sounds like this: ‘FinSight is a voice assistant for everyday banking.'(Sonic Sound) Say
              'choose 1.0x' to select this, or say '0.5x' or '1.5x' to hear another example.`,
      high:   "You've selected MEDIUM. It sounds like this: [Replace this with the medium pacing example.] Sonic sound. Say choose Medium to select this, or say Slow or High to hear another example.",
    } as VStr,
    pacingExampleHigh: {
      low:    'High pace example.',
      medium: `You’ve selected 1.5x. It sounds like this: ‘FinSight is a voice assistant for everyday
              banking.' (Sonic Sound) Say 'choose 1.5x' to select this, or say '0.5x' or '1.0x' to hear another example.`,
      high:   "You've selected HIGH. It sounds like this: [Replace this with the high pacing example.] Sonic sound. Say choose High to select this, or say Slow or Medium to hear another example.",
    } as VStr,
    paceChanged: (pace: number): VStr => ({
      low:    `${pace}x.`,
      medium: `Speech pace set to ${pace}x.`,
      high:   `Speech pace updated to ${pace}x. The app will now speak ${pace < 1 ? 'slower' : pace > 1 ? 'faster' : 'at normal speed'}.`,
    }),
    pacingSelected: (label: string): VStr => ({
      low:    `${label}.`,
      medium: `Pacing has been set to ${label}.`,
      high:   `Pacing has been set to ${label}.`,
    }),
  },

  // ── Main screen ────────────────────────────────────────────────────────────
  main: {
    welcome: {
      low:    'Home page.',
      medium: 'What would you like to do today? You can say a specific banking task in mind, ask me to read menu for all possible tasks, or you can adjust voice setting.',
      high:   'What would you like to do today? You can say a specific banking task in mind, ask me to read menu for all possible tasks, or you can adjust voice setting.',
    } as VStr,
    featureComingSoon: (feature: string): VStr => ({
      low:    'Coming soon.',
      medium: `Currently, you can only ‘deposit a check’. We’re working on more features. Do you want to deposit a check?`,
      high:   `${feature} is not available yet. It will be added in a future update.`,
    }),
  },

  // ── Account select ─────────────────────────────────────────────────────────
  depositOverview: {
    intro: {
      low:    'Deposit check.',
      medium: 'You selected deposit a check.',
      high:   'You selected deposit a check.',
    } as VStr,
    process: {
      low:    'Three steps.',
      medium: `I'll guide you through depositing your check. You'll select an account, and I'll walk you through capturing your check image — I'll tell you when the image is captured. From there, I'll read you the check amount and you'll confirm the deposit. `,
      high:   'We will proceed in three steps. First, choose an account. Next, enter the check amount. Then, capture the front and back of the check.',
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
      high:   'Your privacy matters.',
    } as VStr,
    details: {
      low:    'Not saved in app.',
      medium: 'Your deposit information is used only for this flow and is not stored in the app after this session.',
      high:   'Your deposit information is used only for this flow and is not stored in the app after this session.',
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
      medium: 'Please choose the account where you want to deposit this check.',
      high:   'Please choose the account where you want to deposit this check.',
    } as VStr,
    accountCount: (n: number): VStr => ({
      low:    '',
      medium: `You have ${n} available accounts.`,
      high:   `You have ${n} available accounts. I will read them now.`,
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
      medium: 'Say continue to proceed, or choose a different account.',
      high:   'Say continue to proceed, or choose a different account.',
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
      medium: "Please say the amount you would like to deposit. For example, one hundred fifty dollars.",
      high:   "Please say the amount you would like to deposit. For example, one hundred fifty dollars.",
    } as VStr,
    dailyLimit: (limit: string): VStr => ({
      low:    '',
      medium: `The daily deposit limit is ${limit}.`,
      high:   `The daily deposit limit is ${limit}.`,
    }),
    retryPrompt: {
      low:    'Try again.',
      medium: 'Let us try that again. Please say the deposit amount.',
      high:   'Let us try that again. Please say the deposit amount.',
    } as VStr,
    didntCatch: {
      low:    "Didn't catch that.",
      medium: "Sorry, I did not catch that. Please say an amount like one hundred fifty dollars.",
      high:   "Sorry, I did not catch that. Please say an amount like one hundred fifty dollars.",
    } as VStr,
    voiceConfirm: (amount: string): VStr => ({
      low:    `${amount}. Correct?`,
      medium: `I heard ${amount}. Is that correct? Say yes or no.`,
      high:   `I heard ${amount}. Is that correct? Say yes or no.`,
    }),
    typedConfirm: (amount: string): VStr => ({
      low:    `${amount}.`,
      medium: `The deposit amount is ${amount}. Is that correct? Say yes or no.`,
      high:   `The deposit amount is ${amount}. Is that correct? Say yes or no.`,
    }),
  },

  // ── Check flip ─────────────────────────────────────────────────────────────
  checkFlip: {
    sideCaptured: (side: 'front' | 'back'): VStr => ({
      low:    side === 'front' ? 'Front captured.' : 'Back captured.',
      medium:
        side === 'front'
          ? 'Front captured successfully.'
          : 'Back captured successfully.',
      high:
        side === 'front'
          ? 'The front of your check has been captured successfully.'
          : 'The back of your check has been captured successfully.',
    }),
    flipInstruction: (nextSide: 'front' | 'back'): VStr => ({
      low:    nextSide === 'back' ? 'Flip to show the back.' : 'Flip to show the front.',
      medium:
        nextSide === 'back'
          ? 'Please flip the check over. Before proceeding, ensure you have endorsed the back.'
          : 'Please flip the check over to show the front of the check.',
      high:
        nextSide === 'back'
          ? 'Please flip the check over. Before proceeding, ensure you have endorsed the back.'
          : 'Please flip the check over to show the front of the check.',
    }),
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
      medium: 'Reviewing your check details now. Please wait for the operator to continue.',
      high:   'Reviewing your check details now. Please wait for the operator to continue.',
    } as VStr,
    detailsFound: {
      low:    'Details found.',
      medium: 'Check details found. Reviewing now.',
      high:   'Check details found. Reviewing now.',
    } as VStr,
    usingEnteredAmount: {
      low:    'Using entered amount.',
      medium: 'Could not read all check details. Using your entered amount.',
      high:   'Could not read all check details. Using your entered amount.',
    } as VStr,
    serviceUnavailable: {
      low:    'Service unavailable.',
      medium: 'Could not connect to the check reading service. Please try again.',
      high:   'Could not connect to the check reading service. Please try again.',
    } as VStr,
  },

  // ── Confirmation ───────────────────────────────────────────────────────────
  confirmation: {
    intro: {
      low:    'Check captured.',
      medium: 'Your check has been captured successfully. Let me read the deposit details.',
      high:   'Your check has been captured successfully. Let me read the deposit details.',
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
      medium: 'Submitting your deposit now. Please wait.',
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
      medium: 'Your deposit has been submitted successfully.',
      high:   'Your deposit has been submitted successfully.',
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
