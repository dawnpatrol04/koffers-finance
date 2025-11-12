import { cookies } from 'next/headers';
import { Client, Account } from 'node-appwrite';

/**
 * Validate session and return authenticated user
 * Use in API routes that need authentication
 * Supports both cookie-based and JWT-based authentication
 */
export async function validateSession(req?: Request) {
  console.log('[validateSession] Starting validation...');

  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
  let sessionToken: string | null = null;

  // Try JWT from Authorization header first (for client-side requests)
  if (req) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      sessionToken = authHeader.substring(7);
      console.log('[validateSession] Using JWT from Authorization header');
    }
  }

  // Fall back to cookies (for server-side requests)
  if (!sessionToken) {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log('[validateSession] All cookies:', allCookies.map(c => c.name));
    console.log('[validateSession] Looking for cookie: a_session_' + projectId);

    const sessionCookie = cookieStore.get(`a_session_${projectId}`);
    if (sessionCookie) {
      sessionToken = sessionCookie.value;
      console.log('[validateSession] Using session from cookie');
    }
  }

  if (!sessionToken) {
    console.error('[validateSession] No session found (no cookie or JWT)');
    throw new Error('Unauthorized - No session');
  }

  // Create session client
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(projectId)
    .setJWT(sessionToken); // setJWT works for both session cookies and JWTs

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
