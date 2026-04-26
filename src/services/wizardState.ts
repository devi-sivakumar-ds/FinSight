// ============================================================================
// Wizard State
// Lightweight in-memory state for pure WoZ flow control and dashboard sync.
// ============================================================================

import type { CheckOCRResponse } from '@/types/index';
import { WizardAccountType, WizardAppState, WizardCaptureSide, WizardDepositState, WizardOcrOutcome } from '@/types/wizard';
import type { DepositStackParamList } from '@/types/index';

const DEFAULT_DEPOSIT_STATE: WizardDepositState = {
  frontCaptured: false,
  backCaptured: false,
};

class WizardStateService {
  private deposit: WizardDepositState = { ...DEFAULT_DEPOSIT_STATE };
  private listeners = new Set<(state: WizardDepositState) => void>();

  private emit(): void {
    const snapshot = this.getDepositState();
    this.listeners.forEach(listener => listener(snapshot));
  }

  public getDepositState(): WizardDepositState {
    return { ...this.deposit };
  }

  public resetDeposit(): void {
    this.deposit = { ...DEFAULT_DEPOSIT_STATE };
    this.emit();
  }

  public subscribe(listener: (state: WizardDepositState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public setAccount(accountType: WizardAccountType, accountId: string): void {
    this.deposit = {
      ...this.deposit,
      accountType,
      accountId,
    };
    this.emit();
  }

  public setAmount(amount: number): void {
    this.deposit = {
      ...this.deposit,
      amount,
    };
    this.emit();
  }

  public setCurrentCaptureSide(currentCaptureSide: WizardCaptureSide): void {
    this.deposit = {
      ...this.deposit,
      currentCaptureSide,
    };
    this.emit();
  }

  public setCaptureState(
    frontCaptured: boolean,
    backCaptured: boolean,
    frontImageUri?: string,
    backImageUri?: string
  ): void {
    this.deposit = {
      ...this.deposit,
      frontCaptured,
      backCaptured,
      frontImageUri: frontImageUri ?? this.deposit.frontImageUri,
      backImageUri: backImageUri ?? this.deposit.backImageUri,
    };
    this.emit();
  }

  public setOcrOutcome(
    ocrOutcome: WizardOcrOutcome,
    ocrData?: CheckOCRResponse['data']
  ): void {
    this.deposit = {
      ...this.deposit,
      ocrOutcome,
      ocrData,
    };
    this.emit();
  }

  public setConfirmationNumber(confirmationNumber?: string): void {
    this.deposit = {
      ...this.deposit,
      confirmationNumber,
    };
    this.emit();
  }

  public setRetryScreen(retryScreen?: keyof DepositStackParamList): void {
    this.deposit = {
      ...this.deposit,
      retryScreen,
    };
    this.emit();
  }

  public updateFromAppState(state: WizardAppState): void {
    this.deposit = {
      ...DEFAULT_DEPOSIT_STATE,
      ...state.deposit,
    };
    this.emit();
  }
}

export default new WizardStateService();
