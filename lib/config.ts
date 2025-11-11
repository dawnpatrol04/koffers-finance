/**
 * Application configuration constants
 *
 * Centralized config values to avoid hardcoding throughout the app.
 * Values fallback to sensible defaults for development.
 */

export const config = {
  /**
   * Appwrite Database ID
   * Set via NEXT_PUBLIC_APPWRITE_DATABASE_ID env var
   */
  DATABASE_ID: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'koffers_poc',

  /**
   * Appwrite Collection Names
   */
  COLLECTIONS: {
    USERS: 'users',
    PLAID_ITEMS: 'plaidItems',
    PLAID_TRANSACTIONS: 'plaidTransactions',
    ACCOUNTS: 'accounts',
    FILES: 'files',
    RECEIPT_ITEMS: 'receiptItems',
    API_KEYS: 'apiKeys',
    SYNC_JOBS: 'syncJobs',
  },
} as const;

// Export individual constants for convenience
export const DATABASE_ID = config.DATABASE_ID;
export const COLLECTIONS = config.COLLECTIONS;
