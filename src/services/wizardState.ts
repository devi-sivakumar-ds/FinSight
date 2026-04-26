// ============================================================================
// Wizard State
// Lightweight in-memory state for pure WoZ flow control and dashboard sync.
// ============================================================================

import { WizardAccountType, WizardAppState, WizardDepositState, WizardOcrOutcome } from '@/types/wizard';

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

  public setCaptureState(frontCaptured: boolean, backCaptured: boolean): void {
    this.deposit = {
      ...this.deposit,
      frontCaptured,
      backCaptured,
    };
  }

  public setOcrOutcome(ocrOutcome: WizardOcrOutcome): void {
    this.deposit = {
      ...this.deposit,
      ocrOutcome,
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
