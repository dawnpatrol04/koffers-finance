"use server";

import { createAdminClient, setSession, deleteSession } from './appwrite-server';
import { ID } from 'node-appwrite';
import { redirect } from 'next/navigation';

/**
 * Create a new user account (server-side only)
 * After creating the account, the client should call account.createEmailPasswordSession()
 * to set the browser cookie, then syncSession() to set the server cookie
 */
export async function signUpUser(email: string, password: string, name: string) {
  try {
    const { account } = await createAdminClient();
    await account.create(ID.unique(), email, password, name);
    return { success: true };
  } catch (error: any) {
    console.error('Sign up error:', error);
    return {
      success: false,
      error: error?.message || 'Failed to create account'
    };
  }
}

/**
 * Sync session secret from client-side created session to server-side cookie
 * CRITICAL: This must be called AFTER client creates session with account.createEmailPasswordSession()
 * The client-side call sets the browser cookie (a_session_*), this sets the server cookie (appwrite-session)
 */
export async function syncSession(sessionSecret: string) {
  try {
    await setSession(sessionSecret);
    redirect('/dashboard');
  } catch (error: any) {
    console.error('Session sync error:', error);
    return {
      success: false,
      error: error?.message || 'Failed to sync session'
    };
  }
}

export async function signOut() {
  try {
    const { account } = await createAdminClient();

    // Delete session from Appwrite
    await account.deleteSession('current');
  } catch (error) {
    // Session might already be invalid, ignore error
  } finally {
    // Always delete cookie
    await deleteSession();
    redirect('/login');
  }
}
