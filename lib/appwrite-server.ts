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
  BANK_CONNECTIONS: 'bank_connections',
  BANK_ACCOUNTS: 'bank_accounts',
} as const;
