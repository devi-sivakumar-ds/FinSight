// ============================================================================
// Wizard Executor
// Maps operator commands to app navigation, state changes, and spoken feedback.
// ============================================================================

import { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { RootStackParamList } from '@/types/index';
import { Pace } from '@/contexts/VoiceSettingsContext';
import { WizardOperatorCommand } from '@/types/wizard';
import { Verbosity, ttsStrings, v } from '@utils/ttsStrings';
import ttsService from '@services/ttsService';

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

export function executeWizardCommand(
  command: WizardOperatorCommand,
  deps: WizardExecutorDeps
): void {
  const { navigationRef, verbosity, setVerbosity, setPace } = deps;

  switch (command.id) {
    case 'GO_HOME':
      if (navigationRef.canGoBack()) {
        navigationRef.goBack();
      } else {
        navigateToTab(navigationRef, 'Tasks');
      }
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
      navigateToTab(navigationRef, 'Tasks');
      return;

    default:
      console.log('[WizardExecutor] Command not implemented yet:', command.id);
  }
}
