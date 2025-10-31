/**
 * Appwrite Server SDK
 *
 * This module provides server-side Appwrite SDK instances with API key authentication.
 * Use this in API routes, server actions, and server components.
 *
 * DO NOT use this in client components - use lib/appwrite-client.ts instead.
 */

import { Client, Databases, Storage, Users } from 'node-appwrite';

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
export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'koffers_db';
export const COLLECTIONS = {
  PLAID_ITEMS: 'plaid_items',
  PLAID_ACCOUNTS: 'plaid_accounts',
  PLAID_TRANSACTIONS: 'plaid_transactions',
  BANK_CONNECTIONS: 'bank_connections',
  BANK_ACCOUNTS: 'bank_accounts',
  API_KEYS: 'api_keys',
  FILES: 'files',
  TRANSACTION_ENRICHMENT: 'transaction_enrichment',
} as const;

// Storage bucket IDs
export const STORAGE_BUCKETS = {
  FILES: 'files',
} as const;

// Export ID helper
export { ID } from 'node-appwrite';
