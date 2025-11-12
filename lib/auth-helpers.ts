import { cookies } from 'next/headers';
import { Client, Account } from 'node-appwrite';

const SESSION_COOKIE = "appwrite-session";

/**
 * Validate session and return authenticated user
 * Use in API routes that need authentication
 * Uses HTTP-only session cookie for authentication
 */
export async function validateSession(req?: Request) {
  console.log('[validateSession] Starting validation...');

  // Get session cookie
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);

  if (!sessionCookie) {
    console.error('[validateSession] No session cookie found');
    throw new Error('Unauthorized - No session');
  }

  console.log('[validateSession] Using session from cookie');

  // Create session client
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setSession(sessionCookie.value);

  const account = new Account(client);

  try {
    const user = await account.get();
    console.log('[validateSession] Authenticated user:', user.$id);
    return { user, userId: user.$id, client };
  } catch (error) {
    console.error('[validateSession] Appwrite auth failed:', error);
    throw new Error('Unauthorized - Invalid session');
  }
}

/**
 * Check if user is admin
 */
export async function requireAdmin() {
  const { user, client } = await validateSession();

  // Check admin status via labels
  const isAdmin = user.labels?.includes('admin') || false;

  if (!isAdmin) {
    throw new Error('Forbidden - Admin access required');
  }

  return { user, userId: user.$id, client };
}
