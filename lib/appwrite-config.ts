/**
 * Appwrite Configuration Constants
 * Database IDs, collection names, and storage bucket IDs
 */

export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'koffers_poc';

export const COLLECTIONS = {
  ACCOUNTS: 'accounts',
  CATEGORIES: 'categories',
  TAGS: 'tags',
  TRANSACTIONS: 'transactions',
  RECEIPT_ITEMS: 'receiptItems',
  REMINDERS: 'reminders',
  FILES: 'files',
  TRANSACTION_TAGS: 'transactionTags',
  ITEM_TAGS: 'itemTags',
  FILE_TAGS: 'fileTags',
  PLAID_ITEMS: 'plaidItems',
  PLAID_TRANSACTIONS: 'plaidTransactions',
  API_KEYS: 'apiKeys',
  SYNC_JOBS: 'syncJobs',
} as const;

export const STORAGE_BUCKETS = {
  FILES: 'files',
} as const;

export { ID } from 'node-appwrite';
