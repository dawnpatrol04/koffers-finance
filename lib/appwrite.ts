import { Client, Account, Databases, OAuthProvider } from 'appwrite';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '');

export const account = new Account(client);
export const databases = new Databases(client);

export { client, OAuthProvider };

// Helper function to get current user
export async function getCurrentUser() {
  try {
    return await account.get();
  } catch (error) {
    return null;
  }
}

// Helper function to logout
export async function logout() {
  try {
    await account.deleteSession("current");
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
}
