/**
 * Accounts Business Logic
 * Shared between Chat AI tools and MCP server
 */

import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-config';
import { databases } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';
import type { Account } from './types';

/**
 * Get all accounts for a user
 * @param userId - The user's ID
 * @returns Array of accounts with balances
 */
export async function getAccounts(userId: string): Promise<Account[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.ACCOUNTS,
    [Query.equal('userId', userId)]
  );

  return response.documents.map((doc: any) => ({
    id: doc.$id,
    plaidAccountId: doc.plaidAccountId,
    name: doc.name,
    type: doc.type,
    subtype: doc.subtype,
    currentBalance: doc.currentBalance || 0,
    availableBalance: doc.availableBalance,
    currency: 'USD',
    mask: doc.lastFour,
    institutionName: doc.institution,
  }));
}

/**
 * Get total balance across all accounts
 * @param userId - The user's ID
 * @returns Total balance
 */
export async function getTotalBalance(userId: string): Promise<number> {
  const accounts = await getAccounts(userId);
  return accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
}

/**
 * Get single account by ID
 * @param userId - The user's ID
 * @param accountId - The account document ID
 * @returns Account details
 * @throws Error if account not found or user doesn't own it
 */
export async function getAccountById(
  userId: string,
  accountId: string
): Promise<Account> {
  const account = await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.ACCOUNTS,
    accountId
  );

  // Security check
  if (account.userId !== userId) {
    throw new Error('Unauthorized: Account does not belong to user');
  }

  return {
    id: account.$id,
    plaidAccountId: account.plaidAccountId,
    name: account.name,
    type: account.type,
    subtype: account.subtype,
    currentBalance: account.currentBalance || 0,
    availableBalance: account.availableBalance,
    currency: 'USD',
    mask: account.lastFour,
    institutionName: account.institution,
  };
}

/**
 * Get accounts summary (for dashboard widgets)
 * @param userId - The user's ID
 * @returns Accounts with total
 */
export async function getAccountsSummary(userId: string) {
  const accounts = await getAccounts(userId);
  const total = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

  return {
    accounts,
    totalBalance: total,
    accountCount: accounts.length,
  };
}
