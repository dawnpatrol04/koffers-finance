"use server";

import { createAdminClient, setSession, deleteSession } from './appwrite-server';
import { ID } from 'node-appwrite';
import { redirect } from 'next/navigation';

export async function signUpWithEmail(email: string, password: string, name: string) {
  try {
    const { account } = await createAdminClient();

    // Create user account
    await account.create(ID.unique(), email, password, name);

    // Create session
    const session = await account.createEmailPasswordSession(email, password);

    // Store session in cookie
    await setSession(session.secret);

    return { success: true };
  } catch (error: any) {
    console.error('Sign up error:', error);
    return {
      success: false,
      error: error?.message || 'Failed to create account'
    };
  }
}

export async function signInWithEmail(email: string, password: string) {
  try {
    const { account } = await createAdminClient();

    // Create session
    const session = await account.createEmailPasswordSession(email, password);

    // Store session in cookie
    await setSession(session.secret);

    return { success: true };
  } catch (error: any) {
    console.error('Sign in error:', error);
    return {
      success: false,
      error: error?.message || 'Invalid email or password'
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
