"use server";

import { cookies } from 'next/headers';
import { Client, Account } from 'node-appwrite';
import { redirect } from 'next/navigation';

const SESSION_COOKIE = "appwrite-session";

// Admin client for creating sessions
function createAdminClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!); // Server-side API key

  return { account: new Account(client) };
}

export async function signInWithEmail(email: string, password: string) {
  const { account } = createAdminClient();

  // Create session using admin client
  const session = await account.createEmailPasswordSession(email, password);

  // Store session secret in HTTP-only cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session.secret, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });

  return { success: true };
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect('/login');
}

export async function getSession() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE);
}
