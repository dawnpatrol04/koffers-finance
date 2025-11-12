/**
 * Appwrite Server SDK - SSR Authentication
 *
 * This module provides server-side Appwrite SDK instances.
 * Use createSessionClient() for authenticated requests.
 * Use createAdminClient() for admin operations (create users, sessions).
 */

"use server";

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

const SESSION_COOKIE = "appwrite-session";

/**
 * Create admin client with API key
 * Use for: creating users, sessions, admin operations
 */
export async function createAdminClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  return {
    get account() {
      return new Account(client);
    },
    get databases() {
      return new Databases(client);
    },
    get storage() {
      return new Storage(client);
    },
    get users() {
      return new Users(client);
    },
  };
}

/**
 * Create session client with user's session cookie
 * Use for: all authenticated user operations
 * Throws if no session exists
 */
export async function createSessionClient() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);

  if (!sessionCookie || !sessionCookie.value) {
    throw new Error('No session');
  }

  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setSession(sessionCookie.value);

  return {
    get account() {
      return new Account(client);
    },
    get databases() {
      return new Databases(client);
    },
    get storage() {
      return new Storage(client);
    },
  };
}

/**
 * Get current authenticated user (server-side)
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
  try {
    const { account } = await createSessionClient();
    return await account.get();
  } catch (error) {
    return null;
  }
}

/**
 * Set session cookie
 */
export async function setSession(secret: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, secret, {
    path: "/",
    httpOnly: true,
    sameSite: "lax", // Changed from "strict" to "lax" to allow cookies on redirects
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

/**
 * Delete session cookie
 */
export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// Note: Database configuration moved to lib/appwrite-config.ts
// Import DATABASE_ID, COLLECTIONS, STORAGE_BUCKETS, ID from there
