import { cookies } from 'next/headers';
import { Client, Account } from 'node-appwrite';

/**
 * Validate session and return authenticated user
 * Use in API routes that need authentication
 */
export async function validateSession() {
  const cookieStore = await cookies();

  // Appwrite session cookie format: a_session_{projectId}
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
  const sessionCookie = cookieStore.get(`a_session_${projectId}`);

  if (!sessionCookie) {
    throw new Error('Unauthorized - No session');
  }

  // Create session client
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(projectId)
    .setSession(sessionCookie.value);

  const account = new Account(client);

  try {
    const user = await account.get();
    return { user, userId: user.$id, client };
  } catch (error) {
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
