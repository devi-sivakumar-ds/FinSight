// ============================================================================
// Wizard State
// Lightweight in-memory state for pure WoZ flow control and dashboard sync.
// ============================================================================

import type { CheckOCRResponse } from '@/types/index';
import { WizardAccountType, WizardAppState, WizardCaptureOrder, WizardDepositState, WizardOcrOutcome } from '@/types/wizard';

const DEFAULT_DEPOSIT_STATE: WizardDepositState = {
  frontCaptured: false,
  backCaptured: false,
};

class WizardStateService {
  private deposit: WizardDepositState = { ...DEFAULT_DEPOSIT_STATE };

  public getDepositState(): WizardDepositState {
    return { ...this.deposit };
  }

  public resetDeposit(): void {
    this.deposit = { ...DEFAULT_DEPOSIT_STATE };
  }

  public setAccount(accountType: WizardAccountType, accountId: string): void {
    this.deposit = {
      ...this.deposit,
      accountType,
      accountId,
    };
  }

  public setAmount(amount: number): void {
    this.deposit = {
      ...this.deposit,
      amount,
    };
  }

  public setCaptureOrder(captureOrder: WizardCaptureOrder): void {
    this.deposit = {
      ...this.deposit,
      captureOrder,
    };
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
  }

  public setConfirmationNumber(confirmationNumber?: string): void {
    this.deposit = {
      ...this.deposit,
      confirmationNumber,
    };
  }

  public updateFromAppState(state: WizardAppState): void {
    this.deposit = {
      ...DEFAULT_DEPOSIT_STATE,
      ...state.deposit,
    };
  }
}

export default new WizardStateService();
