import { Client, Account, Databases, Teams, Storage } from 'appwrite';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '');

export const account = new Account(client);
export const databases = new Databases(client);
export const teams = new Teams(client);
export const storage = new Storage(client);

export { client };

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

// Team preferences helpers
export interface TeamPrefs {
  name?: string;
  email?: string;
  logoUrl?: string;
  country?: string;
  countryCode?: string;
  baseCurrency?: string;
}

export async function getTeamPrefs(teamId: string): Promise<TeamPrefs> {
  try {
    const prefs = await teams.getPrefs(teamId);
    return prefs as TeamPrefs;
  } catch (error) {
    console.error("Error getting team prefs:", error);
    return {};
  }
}

export async function updateTeamPrefs(teamId: string, prefs: Partial<TeamPrefs>): Promise<TeamPrefs> {
  try {
    // Get current prefs first
    const currentPrefs = await getTeamPrefs(teamId);

    // Merge new prefs with current prefs
    const merged = { ...currentPrefs, ...prefs };

    // Update with merged prefs
    const updated = await teams.updatePrefs(teamId, merged);
    return updated as TeamPrefs;
  } catch (error) {
    console.error("Error updating team prefs:", error);
    throw error;
  }
}

export async function deleteTeam(teamId: string): Promise<void> {
  try {
    await teams.delete(teamId);
  } catch (error) {
    console.error("Error deleting team:", error);
    throw error;
  }
}
