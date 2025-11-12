/**
 * Appwrite Server SDK
 *
 * This module provides server-side Appwrite SDK instances with API key authentication.
 * Use this in API routes, server actions, and server components.
 *
 * DO NOT use this in client components - use lib/appwrite-client.ts instead.
 */

import { Client, Databases, Storage, Users, Account } from 'node-appwrite';
import { cookies } from 'next/headers';

if (!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT) {
  throw new Error('NEXT_PUBLIC_APPWRITE_ENDPOINT is required');
}

if (!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID) {
  throw new Error('NEXT_PUBLIC_APPWRITE_PROJECT_ID is required');
}

if (!process.env.APPWRITE_API_KEY) {
  throw new Error('APPWRITE_API_KEY is required for server-side operations');
}

// Initialize server-side Appwrite client with API key
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

// Export service instances
export const databases = new Databases(client);
export const storage = new Storage(client);
export const users = new Users(client);

export { client };

// Database configuration
export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'koffers_poc';
export const COLLECTIONS = {
  // Core collections
  ACCOUNTS: 'accounts',
  CATEGORIES: 'categories',
  TAGS: 'tags',
  TRANSACTIONS: 'transactions',
  RECEIPT_ITEMS: 'receiptItems',
  REMINDERS: 'reminders',
  FILES: 'files',

  // Join tables
  TRANSACTION_TAGS: 'transactionTags',
  ITEM_TAGS: 'itemTags',
  FILE_TAGS: 'fileTags',

  // Plaid integration
  PLAID_ITEMS: 'plaidItems',
  PLAID_TRANSACTIONS: 'plaidTransactions',

  // MCP & API
  API_KEYS: 'apiKeys',
  SYNC_JOBS: 'syncJobs',
} as const;

// Storage bucket IDs
export const STORAGE_BUCKETS = {
  FILES: 'files',
} as const;

// Export ID helper
export { ID } from 'node-appwrite';

// Session management
const SESSION_COOKIE = "appwrite-session";

/**
 * Create a session client using the HTTP-only session cookie
 * Use this in API routes to authenticate requests
 */
export async function createSessionClient() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);

  if (!sessionCookie) {
    throw new Error('No session cookie found');
  }

  const sessionClient = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setSession(sessionCookie.value);

  return {
    account: new Account(sessionClient),
    databases: new Databases(sessionClient),
    storage: new Storage(sessionClient),
    client: sessionClient
  };
}

/**
 * Get the current logged-in user server-side
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
  try {
    const { account } = await createSessionClient();
    return await account.get();
  } catch {
    return null;
  }
}
