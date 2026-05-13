// ============================================================================
// Mock Banking API Service
// Simulates backend API calls for development and testing
// ============================================================================

import { Account, Deposit, CheckOCRResponse } from '@/types/index';
import { ACCOUNT_PROFILES } from '@/data/accountProfiles';

class MockBankingAPI {
  private mockAccounts: Account[] = ACCOUNT_PROFILES.map(account => ({ ...account }));

  private mockDeposits: Deposit[] = [];
  private depositCounter: number = 1;

  /**
   * Simulate network delay
   */
  private async delay(ms: number = 1000): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get all user accounts
   */
  public async getAccounts(): Promise<Account[]> {
    console.log('[MockAPI] Fetching accounts...');
    await this.delay(500);
    return [...this.mockAccounts];
  }

  /**
   * Get single account by ID
   */
  public async getAccount(accountId: string): Promise<Account | null> {
    console.log('[MockAPI] Fetching account:', accountId);
    await this.delay(300);
    const account = this.mockAccounts.find(acc => acc.id === accountId);
    return account || null;
  }

  /**
   * Submit check deposit
   */
  public async submitDeposit(
    accountId: string,
    amount: number,
    frontImage: string,
    backImage: string,
    checkNumber?: string,
    routingNumber?: string,
    checkAccountNumber?: string
  ): Promise<Deposit> {
    console.log('[MockAPI] Submitting deposit...');
    console.log('  Account:', accountId);
    console.log('  Amount:', amount);
    console.log('  Check Number:', checkNumber);

    await this.delay(1500); // Simulate processing time

    // Create deposit record
    const deposit: Deposit = {
      depositId: `dep_${this.depositCounter++}`,
      status: 'pending',
      amount,
      accountId,
      createdAt: new Date().toISOString(),
      expectedAvailability: this.getExpectedAvailability(),
      confirmationNumber: this.generateConfirmationNumber(),
    };

    this.mockDeposits.push(deposit);

    // Update account balance (in real app, this would happen after review)
    const account = this.mockAccounts.find(acc => acc.id === accountId);
    if (account) {
      // In mock, we'll immediately add the funds
      account.balance += amount;
    }

    return deposit;
  }

  /**
   * Get deposit by ID
   */
  public async getDeposit(depositId: string): Promise<Deposit | null> {
    console.log('[MockAPI] Fetching deposit:', depositId);
    await this.delay(300);
    const deposit = this.mockDeposits.find(dep => dep.depositId === depositId);
    return deposit || null;
  }

  /**
   * Get all deposits
   */
  public async getDeposits(): Promise<Deposit[]> {
    console.log('[MockAPI] Fetching all deposits...');
    await this.delay(500);
    return [...this.mockDeposits];
  }

  /**
   * Mock OCR processing
   * In production, this would call Google Cloud Vision API
   */
  public async processCheckOCR(
    frontImageBase64: string,
    backImageBase64: string
  ): Promise<CheckOCRResponse> {
    console.log('[MockAPI] Processing OCR...');
    await this.delay(2000); // Simulate OCR processing time

    // Simulate successful OCR (80% success rate)
    const isSuccess = Math.random() > 0.2;

    if (isSuccess) {
      return {
        success: true,
        data: {
          routingNumber: '123456789',
          accountNumber: '987654321',
          checkNumber: this.generateRandomCheckNumber(),
          amount: undefined, // Amount usually not extracted from check
          date: new Date().toISOString().split('T')[0],
          payee: 'Sample Payee',
          confidence: {
            overall: 85 + Math.random() * 10, // 85-95%
            routingNumber: 90 + Math.random() * 10,
            accountNumber: 85 + Math.random() * 10,
            checkNumber: 80 + Math.random() * 15,
          },
        },
      };
    } else {
      return {
        success: false,
        errors: [
          'Unable to read MICR line. Please ensure check is well-lit and in focus.',
        ],
      };
    }
  }

  /**
   * Get expected availability date (1-2 business days)
   */
  private getExpectedAvailability(): string {
    const date = new Date();
    const daysToAdd = Math.random() > 0.5 ? 1 : 2;
    date.setDate(date.getDate() + daysToAdd);
    return date.toISOString();
  }

  /**
   * Generate random confirmation number
   */
  private generateConfirmationNumber(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate random check number
   */
  private generateRandomCheckNumber(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /**
   * Reset mock data (for testing)
   */
  public reset(): void {
    this.mockDeposits = [];
    this.depositCounter = 1;
    this.mockAccounts = ACCOUNT_PROFILES.map(account => ({ ...account }));
    console.log('[MockAPI] Data reset');
  }
}

// Export singleton instance
export default new MockBankingAPI();
