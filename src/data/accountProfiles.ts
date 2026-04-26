import type { Account } from '@/types/index';

export type AccountProfile = Account & {
  dailyLimit: number;
};

export const ACCOUNT_PROFILES: AccountProfile[] = [
  {
    id: 'acc_1',
    type: 'checking',
    accountNumber: '1234567890',
    displayNumber: '7749',
    balance: 2270.0,
    dailyLimit: 10000.0,
    currency: 'USD',
  },
  {
    id: 'acc_2',
    type: 'savings',
    accountNumber: '0987654321',
    displayNumber: '3182',
    balance: 18000.0,
    dailyLimit: 5000.0,
    currency: 'USD',
  },
];

export function getAccountProfileById(accountId?: string): AccountProfile | undefined {
  return ACCOUNT_PROFILES.find(account => account.id === accountId);
}

export function getAccountProfileByType(
  accountType: 'checking' | 'savings'
): AccountProfile | undefined {
  return ACCOUNT_PROFILES.find(account => account.type === accountType);
}
