/**
 * Appwrite Client SDK
 *
 * IMPORTANT: Only use this in client components for:
 * - Client-side file uploads
 * - Client-side database queries (when appropriate)
 *
 * For authentication and user data, use Server Components
 * and server actions from lib/appwrite-server.ts instead.
 */

import { Client, Databases, Storage } from 'appwrite';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

export const databases = new Databases(client);
export const storage = new Storage(client);

export { client };

// Note: Account exports removed - authentication is server-side only
