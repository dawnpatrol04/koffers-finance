/**
 * Configure Appwrite collection permissions
 *
 * This script enables document-level security on all collections
 * and sets permissions to allow authenticated users to read/write their own data.
 */

import { Client, Databases, Permission, Role } from 'node-appwrite';

// Load environment variables
const APPWRITE_ENDPOINT = 'https://api.koffers.ai/v1';
const APPWRITE_PROJECT_ID = '68fdeb62001ad5c77f2f';
const APPWRITE_API_KEY = 'standard_66cde51c2c927d760cdfe5aa6562ff237bd4f3da179f564c592dfec3637601f0089b1e0bd785e2ce8f31aef4e32df4610c4891edcf2c0c8b904367c0859d9cb89332433cdd291f1b2e743ac9b8b7140c96c04e51ac8fd68b54121563374f2c18960b297f97aad78d2d2f90c52bdbabf86340461a40fb831f695c8f1f54c712dc';
const DATABASE_ID = 'koffers_poc';

// Collections that need document security enabled
const COLLECTIONS = [
  'plaidTransactions',
  'accounts',
  'files',
  'receiptItems',
  'categories',
  'tags',
  'syncJobs',
  'apiKeys',
];

async function main() {
  console.log('🔧 Configuring Appwrite collection permissions...\n');

  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  const databases = new Databases(client);

  // Configure each collection
  for (const collectionId of COLLECTIONS) {
    try {
      console.log(`📝 Configuring collection: ${collectionId}`);

      // Update collection to enable document security and set permissions
      await databases.updateCollection(
        DATABASE_ID,
        collectionId,
        collectionId, // name stays the same
        [
          Permission.read(Role.users()),
          Permission.create(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users()),
        ],
        true, // documentSecurity enabled
        true  // enabled
      );

      console.log(`✅ Successfully configured ${collectionId}\n`);
    } catch (error: any) {
      console.error(`❌ Failed to configure ${collectionId}:`, error.message);
      console.error(error);
      console.log('');
    }
  }

  console.log('✅ Collection permission configuration complete!');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
