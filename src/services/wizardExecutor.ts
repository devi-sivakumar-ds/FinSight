// ============================================================================
// Wizard Executor
// Maps operator commands to app navigation, state changes, and spoken feedback.
// ============================================================================

import { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { CheckOCRResponse, DepositStackParamList, RootStackParamList } from '@/types/index';
import { Pace } from '@/contexts/VoiceSettingsContext';
import { WizardOperatorCommand } from '@/types/wizard';
import { Verbosity, ttsStrings, v } from '@utils/ttsStrings';
import mockBankingAPI from '@services/mockBankingAPI';
import ttsService from '@services/ttsService';
import wizardState from '@services/wizardState';
import { DEPOSIT_LIMITS } from '@utils/constants';
import { formatAmountForSpeech } from '@utils/amountParser';

interface WizardExecutorDeps {
  navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>;
  verbosity: Verbosity;
  visualVerbosity: Verbosity;
  visualPace: Pace;
  setVisualVerbosity: (value: Verbosity) => void;
  setVisualPace: (value: Pace) => void;
}

function getDepositBaseParams() {
  const deposit = wizardState.getDepositState();
  return {
    deposit,
    amount: deposit.amount ?? 0,
    accountType: deposit.accountType ?? 'checking',
    accountId: deposit.accountId ?? 'acc_1',
  };
}

function navigateToRetryStep(
  navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>,
  retryScreen?: keyof RootStackParamList | keyof DepositStackParamList
) {
  const { deposit, amount, accountType, accountId } = getDepositBaseParams();
  const resolvedRetryScreen = (retryScreen as keyof DepositStackParamList | undefined) ?? deposit.retryScreen;

  switch (resolvedRetryScreen) {
    case 'AmountInput':
      (navigationRef.navigate as any)('DepositFlow', { screen: 'AccountSelect' });
      return;
    case 'CheckCapture':
      (navigationRef.navigate as any)('DepositFlow', {
        screen: 'CheckCapture',
        params: {
          accountId,
          accountType,
          amount,
          side: deposit.currentCaptureSide ?? (deposit.backCaptured ? 'front' : 'back'),
          frontImageUri: deposit.frontImageUri,
          backImageUri: deposit.backImageUri,
        },
      });
      return;
    case 'OCRProcessing':
      if (deposit.frontImageUri && deposit.backImageUri) {
        (navigationRef.navigate as any)('DepositFlow', {
          screen: 'OCRProcessing',
          params: {
            frontImageUri: deposit.frontImageUri,
            backImageUri: deposit.backImageUri,
            accountId,
            accountType,
            amount,
          },
        });
      }
      return;
    case 'Confirmation':
      if (deposit.frontImageUri && deposit.backImageUri) {
        (navigationRef.navigate as any)('DepositFlow', {
          screen: 'Confirmation',
          params: {
            accountId,
            accountType,
            amount,
            frontImageUri: deposit.frontImageUri,
            backImageUri: deposit.backImageUri,
            ocrData: deposit.ocrData,
          },
        });
      }
      return;
    case 'AccountSelect':
    default:
      (navigationRef.navigate as any)('DepositFlow', { screen: 'AccountSelect' });
  }
}

function navigateToTab(
  navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>,
  tab: 'Tasks' | 'Settings'
) {
  (navigationRef.navigate as any)('TabNavigator', { screen: tab });
}

function goHome(
  navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>
) {
  navigationRef.resetRoot({
    index: 0,
    routes: [{ name: 'TabNavigator' as keyof RootStackParamList }],
  });

  setTimeout(() => {
    navigateToTab(navigationRef, 'Tasks');
  }, 0);
}

function buildWizardOcrData(command: WizardOperatorCommand): CheckOCRResponse['data'] | undefined {
  if (!command.payload || !('outcome' in command.payload)) return undefined;

  const checkNumber = command.payload.checkNumber?.trim();
  const routingNumber = command.payload.routingNumber?.trim();
  const accountNumber = command.payload.accountNumber?.trim();
  const hasData = checkNumber || routingNumber || accountNumber;

  if (!hasData) return undefined;

  return {
    checkNumber: checkNumber ?? '',
    routingNumber: routingNumber ?? '',
    accountNumber: accountNumber ?? '',
    confidence: {
      overall: 0,
      routingNumber: 0,
      accountNumber: 0,
      checkNumber: 0,
    },
  };
}

function getVerbosityLabel(verbosity: Verbosity): 'Low' | 'Medium' | 'High' {
  switch (verbosity) {
    case 'low':
      return 'Low';
    case 'high':
      return 'High';
    case 'medium':
    default:
      return 'Medium';
  }
}

function getPaceLabel(pace: Pace): 'Slow' | 'Medium' | 'High' {
  switch (pace) {
    case 0.5:
      return 'Slow';
    case 1.5:
      return 'High';
    case 1.0:
    default:
      return 'Medium';
  }
}

function getPaceValueLabel(pace: Pace): '0.5x' | '1.0x' | '1.5x' {
  switch (pace) {
    case 0.5:
      return '0.5x';
    case 1.5:
      return '1.5x';
    case 1.0:
    default:
      return '1.0x';
  }
}

export function executeWizardCommand(
  command: WizardOperatorCommand,
  deps: WizardExecutorDeps
): void {
  const {
    navigationRef,
    verbosity,
    visualVerbosity,
    visualPace,
    setVisualVerbosity,
    setVisualPace,
  } = deps;

  const speakSettings = (entry: { low: string; medium: string; high: string }) => {
    ttsService.speakMedium(v(verbosity, entry));
  };

  const speakDepositOverview = () => {
    ttsService.speakMedium(v(verbosity, ttsStrings.depositOverview.intro));
    setTimeout(() => {
      ttsService.speakMedium(v(verbosity, ttsStrings.depositOverview.process));
      setTimeout(() => {
        ttsService.speakMedium(v(verbosity, ttsStrings.depositOverview.continuePrompt));
      }, 1700);
    }, 900);
  };

  const speakAccountPrompt = () => {
    ttsService.speakMedium(v(verbosity, ttsStrings.accountSelect.prompt));
    setTimeout(() => {
      ttsService.speakMedium(v(verbosity, ttsStrings.accountSelect.accountCount(2)));
    }, 1000);
  };

  const speakSelectedAccountLimit = (accountType: 'checking' | 'savings') => {
    const typeLabel = accountType === 'checking' ? 'Checking' : 'Savings';
    const limit = formatAmountForSpeech(DEPOSIT_LIMITS.DAILY_LIMIT);
    ttsService.speakMedium(v(verbosity, ttsStrings.accountSelect.dailyLimitSelected(typeLabel, limit)));
    setTimeout(() => {
      ttsService.speakMedium(v(verbosity, ttsStrings.accountSelect.readyPrompt));
    }, 1400);
  };

  const speakPreCaptureOverview = () => {
    ttsService.speakMedium(v(verbosity, ttsStrings.accountSelect.preCaptureIntro));
    setTimeout(() => {
      ttsService.speakMedium(v(verbosity, ttsStrings.accountSelect.preCaptureSurface));
      setTimeout(() => {
        ttsService.speakMedium(v(verbosity, ttsStrings.accountSelect.preCaptureRetention));
        setTimeout(() => {
          ttsService.speakMedium(v(verbosity, ttsStrings.accountSelect.readyPrompt));
        }, 1500);
      }, 1400);
    }, 1100);
  };

  const speakCapturePlacement = (side: 'front' | 'back') => {
    ttsService.speakMedium(v(verbosity, ttsStrings.checkCapture.setupPlacement(side)));
    setTimeout(() => {
      ttsService.speakMedium(v(verbosity, ttsStrings.checkCapture.readyPrompt));
    }, 1500);
  };

  const speakCaptureGuidance = (
    key:
      | 'moveLeft'
      | 'moveRight'
      | 'moveUp'
      | 'moveDown'
      | 'tiltLeft'
      | 'tiltRight'
      | 'raisePhone'
      | 'lowerPhone'
      | 'tooMuchLight'
      | 'notEnoughLight'
      | 'holdSteady'
  ) => {
    ttsService.speakMedium(v(verbosity, ttsStrings.checkCapture.guidance[key]));
  };

  const hasSelectedAccount = () => {
    const deposit = wizardState.getDepositState();
    return Boolean(deposit.accountType && deposit.accountId);
  };

  switch (command.id) {
    case 'CONTINUE_FROM_ONBOARDING':
      navigationRef.resetRoot({
        index: 0,
        routes: [{ name: 'TabNavigator' as keyof RootStackParamList }],
      });
      setTimeout(() => {
        navigateToTab(navigationRef, 'Tasks');
      }, 0);
      return;

    case 'GO_HOME':
      goHome(navigationRef);
      return;

    case 'CLOSE_FLOW':
      if (navigationRef.canGoBack()) {
        navigationRef.goBack();
      }
      return;

    case 'GO_BACK':
      if (navigationRef.canGoBack()) {
        navigationRef.goBack();
      }
      return;

    case 'SAY_NEED_MORE_TIME':
      ttsService.speakMedium('Do you need more time?');
      return;

    case 'SAY_DIDNT_CATCH':
      ttsService.speakHigh("I didn't catch that.");
      return;

    case 'OPEN_DEPOSIT_FLOW':
      wizardState.resetDeposit();
      navigationRef.navigate('DepositFlow');
      return;

    case 'OPEN_SETTINGS':
      navigateToTab(navigationRef, 'Settings');
      return;

    case 'SHOW_SEND_MONEY':
      ttsService.speakMedium(v(verbosity, ttsStrings.main.featureComingSoon('Send money')));
      return;

    case 'SHOW_CHECK_BALANCE':
      ttsService.speakMedium(v(verbosity, ttsStrings.main.featureComingSoon('Check balance')));
      return;

    case 'SHOW_TRANSFER_MONEY':
      ttsService.speakMedium(v(verbosity, ttsStrings.main.featureComingSoon('Transfer money')));
      return;

    case 'SETTINGS_REPEAT_INTRO':
      speakSettings(ttsStrings.settings.entry);
      return;

    case 'SETTINGS_PROMPT_VERBOSITY':
      speakSettings(ttsStrings.settings.verbosityOffer);
      return;

    case 'SETTINGS_ADJUST_VERBOSITY':
      speakSettings(ttsStrings.settings.verbosityIntro);
      return;

    case 'SETTINGS_VERBOSITY_EXAMPLE_LOW':
      setVisualVerbosity('low');
      speakSettings(ttsStrings.settings.verbosityExampleLow);
      return;

    case 'SETTINGS_VERBOSITY_EXAMPLE_MEDIUM':
      setVisualVerbosity('medium');
      speakSettings(ttsStrings.settings.verbosityExampleMedium);
      return;

    case 'SETTINGS_VERBOSITY_EXAMPLE_HIGH':
      setVisualVerbosity('high');
      speakSettings(ttsStrings.settings.verbosityExampleHigh);
      return;

    case 'SETTINGS_CHOOSE_VERBOSITY': {
      const label = getVerbosityLabel(visualVerbosity);
      ttsService.speakMedium(v(verbosity, ttsStrings.settings.verbositySelected(label)));
      return;
    }

    case 'SETTINGS_PROMPT_PACING':
      speakSettings(ttsStrings.settings.pacingOffer);
      return;

    case 'SETTINGS_ADJUST_PACING':
      speakSettings(ttsStrings.settings.pacingIntro);
      return;

    case 'SETTINGS_PACING_EXAMPLE_SLOW':
      setVisualPace(0.5);
      ttsService.speakMediumAtRate(v(verbosity, ttsStrings.settings.pacingExampleSlow), 0.5);
      return;

    case 'SETTINGS_PACING_EXAMPLE_MEDIUM':
      setVisualPace(1.0);
      ttsService.speakMediumAtRate(v(verbosity, ttsStrings.settings.pacingExampleMedium), 1.0);
      return;

    case 'SETTINGS_PACING_EXAMPLE_HIGH':
      setVisualPace(1.5);
      ttsService.speakMediumAtRate(v(verbosity, ttsStrings.settings.pacingExampleHigh), 1.5);
      return;

    case 'SETTINGS_CHOOSE_PACING':
      ttsService.speakMedium(v(verbosity, ttsStrings.settings.pacingSelected(getPaceLabel(visualPace))));
      return;

    case 'SETTINGS_SAVE_PREFERENCES':
      ttsService.speakMedium(
        v(
          verbosity,
          ttsStrings.settings.preferencesSaved(
            getPaceValueLabel(visualPace),
            getVerbosityLabel(visualVerbosity)
          )
        )
      );
      return;

    case 'RETURN_HOME_FROM_SETTINGS':
      goHome(navigationRef);
      return;

    case 'REPEAT_OVERVIEW':
      speakDepositOverview();
      return;

    case 'CONTINUE_FROM_OVERVIEW':
      (navigationRef.navigate as any)('DepositFlow', { screen: 'DepositPrivacy' });
      return;

    case 'CLOSE_FROM_OVERVIEW':
      if (navigationRef.canGoBack()) navigationRef.goBack();
      return;

    case 'CONTINUE_FROM_PRIVACY':
      (navigationRef.navigate as any)('DepositFlow', { screen: 'AccountSelect' });
      return;

    case 'BACK_FROM_PRIVACY':
      if (navigationRef.canGoBack()) navigationRef.goBack();
      return;

    case 'CLOSE_FROM_PRIVACY':
      if (navigationRef.canGoBack()) navigationRef.goBack();
      return;

    case 'REPEAT_ACCOUNT_PROMPT':
      speakAccountPrompt();
      return;

    case 'SELECT_CHECKING':
      wizardState.setAccount('checking', 'acc_1');
      speakSelectedAccountLimit('checking');
      return;

    case 'SELECT_SAVINGS':
      wizardState.setAccount('savings', 'acc_2');
      speakSelectedAccountLimit('savings');
      return;

    case 'REPEAT_ACCOUNT_LIMIT': {
      const deposit = wizardState.getDepositState();
      if (!deposit.accountType) {
        ttsService.speakMedium(v(verbosity, ttsStrings.accountSelect.noAccount));
        return;
      }
      speakSelectedAccountLimit(deposit.accountType ?? 'checking');
      return;
    }

    case 'START_PRE_CAPTURE_OVERVIEW':
    case 'REPEAT_PRE_CAPTURE_OVERVIEW':
      if (!hasSelectedAccount()) {
        ttsService.speakMedium(v(verbosity, ttsStrings.accountSelect.noAccount));
        return;
      }
      speakPreCaptureOverview();
      return;

    case 'CONTINUE_FROM_ACCOUNT_SELECT': {
      if (!hasSelectedAccount()) {
        ttsService.speakMedium(v(verbosity, ttsStrings.accountSelect.noAccount));
        return;
      }
      speakPreCaptureOverview();
      return;
    }

    case 'CONTINUE_TO_CAMERA': {
      const deposit = wizardState.getDepositState();
      if (!hasSelectedAccount()) {
        ttsService.speakMedium(v(verbosity, ttsStrings.accountSelect.noAccount));
        return;
      }
      const accountType = deposit.accountType ?? 'checking';
      const accountId = deposit.accountId ?? 'acc_1';
      const amount = deposit.amount ?? 0;
      const firstSide = deposit.captureOrder === 'back_first' ? 'back' : 'front';
      wizardState.setCurrentCaptureSide(firstSide);
      (navigationRef.navigate as any)('DepositFlow', {
        screen: 'CheckCapture',
        params: {
          accountId,
          accountType,
          amount,
          side: firstSide,
        },
      });
      return;
    }

    case 'BACK_FROM_ACCOUNT_SELECT':
      if (navigationRef.canGoBack()) navigationRef.goBack();
      return;

    case 'CLOSE_FROM_ACCOUNT_SELECT':
      if (navigationRef.canGoBack()) navigationRef.goBack();
      return;

    case 'SET_CAPTURE_ORDER_FRONT_FIRST':
      wizardState.setCaptureOrder('front_first');
      return;

    case 'SET_CAPTURE_ORDER_BACK_FIRST':
      wizardState.setCaptureOrder('back_first');
      return;

    case 'BACK_FROM_CHECK_CAPTURE':
      if (navigationRef.canGoBack()) navigationRef.goBack();
      return;

    case 'CLOSE_FROM_CHECK_CAPTURE':
      if (navigationRef.canGoBack()) navigationRef.goBack();
      return;

    case 'REPEAT_CAPTURE_ORIENTATION':
      ttsService.speakMedium(v(verbosity, ttsStrings.checkCapture.setupOrientation));
      return;

    case 'REPEAT_CAPTURE_PLACEMENT': {
      const deposit = wizardState.getDepositState();
      const side = deposit.currentCaptureSide ?? (deposit.backCaptured ? 'front' : 'back');
      speakCapturePlacement(side);
      return;
    }

    case 'START_CAPTURE_GUIDANCE': {
      const deposit = wizardState.getDepositState();
      const accountType = deposit.accountType ?? 'checking';
      const accountId = deposit.accountId ?? 'acc_1';
      const amount = deposit.amount ?? 0;
      const side = deposit.currentCaptureSide ?? (deposit.backCaptured ? 'front' : 'back');
      (navigationRef.navigate as any)('DepositFlow', {
        screen: 'CheckCapture',
        params: {
          accountId,
          accountType,
          amount,
          side,
          frontImageUri: deposit.frontImageUri,
          backImageUri: deposit.backImageUri,
          autoStart: true,
        },
      });
      return;
    }

    case 'GUIDE_MOVE_LEFT':
      speakCaptureGuidance('moveLeft');
      return;

    case 'GUIDE_MOVE_RIGHT':
      speakCaptureGuidance('moveRight');
      return;

    case 'GUIDE_MOVE_FORWARD':
      speakCaptureGuidance('moveUp');
      return;

    case 'GUIDE_MOVE_BACK':
      speakCaptureGuidance('moveDown');
      return;

    case 'GUIDE_TILT_LEFT':
      speakCaptureGuidance('tiltLeft');
      return;

    case 'GUIDE_TILT_RIGHT':
      speakCaptureGuidance('tiltRight');
      return;

    case 'GUIDE_A_BIT_HIGHER':
      speakCaptureGuidance('raisePhone');
      return;

    case 'GUIDE_A_BIT_LOWER':
      speakCaptureGuidance('lowerPhone');
      return;

    case 'GUIDE_TOO_MUCH_LIGHT':
      speakCaptureGuidance('tooMuchLight');
      return;

    case 'GUIDE_NOT_ENOUGH_LIGHT':
      speakCaptureGuidance('notEnoughLight');
      return;

    case 'GUIDE_HOLD_STEADY':
      speakCaptureGuidance('holdSteady');
      return;

    case 'CAPTURE_FRONT_SUCCESS': {
      const deposit = wizardState.getDepositState();
      const frontImageUri = deposit.frontImageUri ?? 'wizard://front';
      if (deposit.backCaptured) {
        const accountType = deposit.accountType ?? 'checking';
        const accountId = deposit.accountId ?? 'acc_1';
        const amount = deposit.amount ?? 0;
        const backImageUri = deposit.backImageUri ?? 'wizard://back';
        wizardState.setCaptureState(true, true, frontImageUri, backImageUri);
        (navigationRef.navigate as any)('DepositFlow', {
          screen: 'OCRProcessing',
          params: { frontImageUri, backImageUri, accountId, accountType, amount },
        });
      } else {
        wizardState.setCaptureState(true, false, frontImageUri, deposit.backImageUri);
      }
      return;
    }

    case 'SPEAK_FRONT_REVIEW': {
      if (command.payload && 'text' in command.payload && command.payload.text.trim()) {
        ttsService.speakMedium(command.payload.text.trim());
      }
      return;
    }

    case 'CONFIRM_FRONT_DETAILS': {
      const deposit = wizardState.getDepositState();
      const accountType = deposit.accountType ?? 'checking';
      const accountId = deposit.accountId ?? 'acc_1';
      const amount = deposit.amount ?? 0;
      const frontImageUri = deposit.frontImageUri ?? 'wizard://front';

      ttsService.speakMedium(v(verbosity, ttsStrings.checkCapture.proceedToBackCapture));

      setTimeout(() => {
        (navigationRef.navigate as any)('DepositFlow', {
          screen: 'CheckFlip',
          params: {
            capturedImageUri: frontImageUri,
            capturedSide: 'front',
            nextSide: 'back',
            accountId,
            accountType,
            amount,
            frontImageUri,
          },
        });
      }, 900);
      return;
    }

    case 'REPEAT_BACK_CAPTURE_INTRO':
      ttsService.speakMedium(v(verbosity, ttsStrings.checkFlip.flipInstruction('back')));
      setTimeout(() => {
        ttsService.speakMedium(v(verbosity, ttsStrings.checkFlip.continuePrompt));
      }, 1400);
      return;

    case 'CONTINUE_FROM_CHECK_FLIP': {
      const deposit = wizardState.getDepositState();
      const accountType = deposit.accountType ?? 'checking';
      const accountId = deposit.accountId ?? 'acc_1';
      const amount = deposit.amount ?? 0;
      const frontImageUri = deposit.frontImageUri;
      const backImageUri = deposit.backImageUri;
      const nextSide = deposit.frontCaptured && !deposit.backCaptured ? 'back' : 'front';
      wizardState.setCurrentCaptureSide(nextSide);
      (navigationRef.navigate as any)('DepositFlow', {
        screen: 'CheckCapture',
        params: {
          frontImageUri,
          backImageUri,
          accountId,
          accountType,
          amount,
          side: nextSide,
        },
      });
      return;
    }

    case 'CAPTURE_BACK_SUCCESS': {
      const deposit = wizardState.getDepositState();
      const accountType = deposit.accountType ?? 'checking';
      const accountId = deposit.accountId ?? 'acc_1';
      const amount = deposit.amount ?? 0;
      const backImageUri = deposit.backImageUri ?? 'wizard://back';
      if (deposit.frontCaptured) {
        const frontImageUri = deposit.frontImageUri ?? 'wizard://front';
        wizardState.setCaptureState(true, true, frontImageUri, backImageUri);
        (navigationRef.navigate as any)('DepositFlow', {
          screen: 'OCRProcessing',
          params: { frontImageUri, backImageUri, accountId, accountType, amount },
        });
      } else {
        wizardState.setCaptureState(false, true, deposit.frontImageUri, backImageUri);
        (navigationRef.navigate as any)('DepositFlow', {
          screen: 'CheckFlip',
          params: {
            capturedImageUri: backImageUri,
            capturedSide: 'back',
            nextSide: 'front',
            accountId,
            accountType,
            amount,
            backImageUri,
          },
        });
      }
      return;
    }

    case 'CAPTURE_RETRY':
      ttsService.speakMedium(v(verbosity, ttsStrings.checkCapture.captureFailed));
      return;

    case 'CAPTURE_FAIL': {
      const message =
        command.payload && 'text' in command.payload && command.payload.text
          ? command.payload.text
          : 'Failed to capture check image. Please try again.';
      wizardState.setRetryScreen('CheckCapture');
      (navigationRef.navigate as any)('DepositFlow', {
        screen: 'Error',
        params: {
          error: message,
          canRetry: true,
          retryScreen: 'CheckCapture',
        },
      });
      return;
    }

    case 'BACK_FROM_CHECK_FLIP':
      if (navigationRef.canGoBack()) navigationRef.goBack();
      return;

    case 'CLOSE_FROM_CHECK_FLIP':
      if (navigationRef.canGoBack()) navigationRef.goBack();
      return;

    case 'OCR_SUCCESS':
    case 'OCR_PARTIAL':
    case 'OCR_FAIL': {
      const deposit = wizardState.getDepositState();
      const accountType = deposit.accountType ?? 'checking';
      const accountId = deposit.accountId ?? 'acc_1';
      const amount = deposit.amount ?? 0;
      const frontImageUri = deposit.frontImageUri ?? 'wizard://front';
      const backImageUri = deposit.backImageUri ?? 'wizard://back';
      const outcome =
        command.id === 'OCR_SUCCESS' ? 'success' : command.id === 'OCR_PARTIAL' ? 'partial' : 'fail';
      const ocrData = command.id === 'OCR_FAIL' ? undefined : buildWizardOcrData(command);

      wizardState.setOcrOutcome(outcome, ocrData);
      wizardState.setRetryScreen(undefined);
      (navigationRef.navigate as any)('DepositFlow', {
        screen: 'Confirmation',
        params: {
          accountId,
          accountType,
          amount,
          frontImageUri,
          backImageUri,
          ocrData,
        },
      });
      return;
    }

    case 'SPEAK_POST_CAPTURE_SUMMARY':
      if (command.payload && 'text' in command.payload && command.payload.text.trim()) {
        ttsService.speakMedium(command.payload.text.trim());
      }
      return;

    case 'SPEAK_FINAL_CONFIRM_PROMPT':
      ttsService.speakMedium(v(verbosity, ttsStrings.confirmation.confirmPrompt));
      return;

    case 'SPEAK_COUNTDOWN_10':
      ttsService.speakMedium(v(verbosity, ttsStrings.confirmation.countdownTen));
      return;

    case 'SPEAK_COUNTDOWN_5':
      ttsService.speakMedium(v(verbosity, ttsStrings.confirmation.countdownFive));
      return;

    case 'CONFIRM_DEPOSIT': {
      const depositState = wizardState.getDepositState();
      const amount = depositState.amount ?? 0;
      const accountId = depositState.accountId ?? 'acc_1';

      void (async () => {
        const deposit = await mockBankingAPI.submitDeposit(
          accountId,
          amount,
          depositState.frontImageUri ?? 'wizard://front',
          depositState.backImageUri ?? 'wizard://back',
          depositState.ocrData?.checkNumber,
          depositState.ocrData?.routingNumber,
          depositState.ocrData?.accountNumber
        );
        wizardState.setConfirmationNumber(deposit.confirmationNumber);
        wizardState.setRetryScreen(undefined);
        (navigationRef.navigate as any)('DepositFlow', {
          screen: 'Success',
          params: { deposit },
        });
      })();
      return;
    }

    case 'SPEAK_SUCCESS_SUMMARY':
      if (command.payload && 'text' in command.payload && command.payload.text.trim()) {
        ttsService.speakMedium(command.payload.text.trim());
      }
      return;

    case 'EDIT_AMOUNT': {
      (navigationRef.navigate as any)('DepositFlow', { screen: 'AccountSelect' });
      return;
    }

    case 'EDIT_ACCOUNT':
      (navigationRef.navigate as any)('DepositFlow', { screen: 'AccountSelect' });
      return;

    case 'CANCEL_DEPOSIT':
      if (navigationRef.canGoBack()) navigationRef.goBack();
      return;

    case 'FINISH_SUCCESS_FLOW':
    case 'RETURN_HOME_FROM_SUCCESS':
      goHome(navigationRef);
      return;

    case 'RETRY_FROM_ERROR':
      navigateToRetryStep(
        navigationRef,
        command.payload && 'retryScreen' in command.payload ? command.payload.retryScreen : undefined
      );
      return;

    case 'GO_HOME_FROM_ERROR':
      goHome(navigationRef);
      return;

    default:
      console.log('[WizardExecutor] Command not implemented yet:', command.id);
  }
}
