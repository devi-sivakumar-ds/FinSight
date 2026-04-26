// ============================================================================
// Wizard Executor
// Maps operator commands to app navigation, state changes, and spoken feedback.
// ============================================================================

import { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { RootStackParamList } from '@/types/index';
import { Pace } from '@/contexts/VoiceSettingsContext';
import { WizardOperatorCommand } from '@/types/wizard';
import { Verbosity, ttsStrings, v } from '@utils/ttsStrings';
import mockBankingAPI from '@services/mockBankingAPI';
import ttsService from '@services/ttsService';
import wizardState from '@services/wizardState';

interface WizardExecutorDeps {
  navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>;
  verbosity: Verbosity;
  setVerbosity: (value: Verbosity) => void;
  setPace: (value: Pace) => void;
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

export function executeWizardCommand(
  command: WizardOperatorCommand,
  deps: WizardExecutorDeps
): void {
  const { navigationRef, verbosity, setVerbosity, setPace } = deps;

  switch (command.id) {
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

    case 'SET_VERBOSITY_LOW':
      setVerbosity('low');
      ttsService.speakMedium(v('low', ttsStrings.settings.verbosityChanged('Low')));
      return;

    case 'SET_VERBOSITY_MEDIUM':
      setVerbosity('medium');
      ttsService.speakMedium(v('medium', ttsStrings.settings.verbosityChanged('Medium')));
      return;

    case 'SET_VERBOSITY_HIGH':
      setVerbosity('high');
      ttsService.speakMedium(v('high', ttsStrings.settings.verbosityChanged('High')));
      return;

    case 'SET_PACE_SLOW':
      setPace(0.5);
      ttsService.speakMedium(v(verbosity, ttsStrings.settings.paceChanged(0.5)));
      return;

    case 'SET_PACE_NORMAL':
      setPace(1.0);
      ttsService.speakMedium(v(verbosity, ttsStrings.settings.paceChanged(1.0)));
      return;

    case 'SET_PACE_FAST':
      setPace(1.5);
      ttsService.speakMedium(v(verbosity, ttsStrings.settings.paceChanged(1.5)));
      return;

    case 'RETURN_HOME_FROM_SETTINGS':
      goHome(navigationRef);
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

    case 'SELECT_CHECKING':
      wizardState.setAccount('checking', 'acc_1');
      ttsService.speakMedium(v(verbosity, ttsStrings.accountSelect.accountSelected('Checking', '7 7 4 9')));
      return;

    case 'SELECT_SAVINGS':
      wizardState.setAccount('savings', 'acc_2');
      ttsService.speakMedium(v(verbosity, ttsStrings.accountSelect.accountSelected('Savings', '3 1 8 2')));
      return;

    case 'CONTINUE_FROM_ACCOUNT_SELECT': {
      const deposit = wizardState.getDepositState();
      const accountType = deposit.accountType ?? 'checking';
      const accountId = deposit.accountId ?? 'acc_1';
      (navigationRef.navigate as any)('DepositFlow', {
        screen: 'AmountInput',
        params: { accountId, accountType },
      });
      return;
    }

    case 'BACK_FROM_ACCOUNT_SELECT':
      if (navigationRef.canGoBack()) navigationRef.goBack();
      return;

    case 'CLOSE_FROM_ACCOUNT_SELECT':
      if (navigationRef.canGoBack()) navigationRef.goBack();
      return;

    case 'SET_AMOUNT': {
      const amount =
        command.payload && 'amount' in command.payload ? Number(command.payload.amount) : 0;
      if (Number.isFinite(amount) && amount > 0) {
        wizardState.setAmount(amount);
        ttsService.speakMedium(v(verbosity, ttsStrings.amountInput.typedConfirm(`$${amount.toFixed(2)}`)));
      }
      return;
    }

    case 'CONFIRM_AMOUNT': {
      const deposit = wizardState.getDepositState();
      const amount = deposit.amount ?? 0;
      const accountType = deposit.accountType ?? 'checking';
      const accountId = deposit.accountId ?? 'acc_1';
      (navigationRef.navigate as any)('DepositFlow', {
        screen: 'Confirmation',
        params: {
          accountId,
          accountType,
          amount,
          frontImageUri: 'wizard://front',
          backImageUri: 'wizard://back',
        },
      });
      return;
    }

    case 'RETRY_AMOUNT':
      ttsService.speakMedium(v(verbosity, ttsStrings.amountInput.retryPrompt));
      return;

    case 'BACK_FROM_AMOUNT_INPUT':
      if (navigationRef.canGoBack()) navigationRef.goBack();
      return;

    case 'CLOSE_FROM_AMOUNT_INPUT':
      if (navigationRef.canGoBack()) navigationRef.goBack();
      return;

    case 'CONFIRM_DEPOSIT': {
      const depositState = wizardState.getDepositState();
      const amount = depositState.amount ?? 0;
      const accountId = depositState.accountId ?? 'acc_1';

      void (async () => {
        const deposit = await mockBankingAPI.submitDeposit(
          accountId,
          amount,
          'wizard://front',
          'wizard://back'
        );
        wizardState.setConfirmationNumber(deposit.confirmationNumber);
        (navigationRef.navigate as any)('DepositFlow', {
          screen: 'Success',
          params: { deposit },
        });
      })();
      return;
    }

    case 'EDIT_AMOUNT': {
      const deposit = wizardState.getDepositState();
      const accountType = deposit.accountType ?? 'checking';
      const accountId = deposit.accountId ?? 'acc_1';
      (navigationRef.navigate as any)('DepositFlow', {
        screen: 'AmountInput',
        params: { accountId, accountType },
      });
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
      (navigationRef.navigate as any)('DepositFlow', { screen: 'AccountSelect' });
      return;

    case 'GO_HOME_FROM_ERROR':
      goHome(navigationRef);
      return;

    default:
      console.log('[WizardExecutor] Command not implemented yet:', command.id);
  }
}
