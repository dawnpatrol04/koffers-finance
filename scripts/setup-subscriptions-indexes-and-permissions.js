const { Client, Databases } = require('node-appwrite');

const client = new Client()
  .setEndpoint('https://api.koffers.ai/v1')
  .setProject('68fdeb62001ad5c77f2f')
  .setKey('standard_66cde51c2c927d760cdfe5aa6562ff237bd4f3da179f564c592dfec3637601f0089b1e0bd785e2ce8f31aef4e32df4610c4891edcf2c0c8b904367c0859d9cb89332433cdd291f1b2e743ac9b8b7140c96c04e51ac8fd68b54121563374f2c18960b297f97aad78d2d2f90c52bdbabf86340461a40fb831f695c8f1f54c712dc');

const databases = new Databases(client);

const DATABASE_ID = 'koffers_poc';
const COLLECTION_ID = 'subscriptions';

async function setup() {
  try {
    console.log('Creating indexes...\n');

    // Create userId index
    try {
      await databases.createIndex(
        DATABASE_ID,
        COLLECTION_ID,
        'userId_index',
        'key',
        ['userId'],
        ['ASC']
      );
      console.log('✓ Created userId_index');
    } catch (error) {
      if (error.type === 'index_already_exists') {
        console.log('⊘ userId_index already exists, skipping');
      } else {
        throw error;
      }
    }

    // Create status index
    try {
      await databases.createIndex(
        DATABASE_ID,
        COLLECTION_ID,
        'status_index',
        'key',
        ['status'],
        ['ASC']
      );
      console.log('✓ Created status_index');
    } catch (error) {
      if (error.type === 'index_already_exists') {
        console.log('⊘ status_index already exists, skipping');
      } else {
        throw error;
      }
    }

    console.log('\n✅ Indexes created successfully!');
    console.log('\n⚠️  IMPORTANT: You must manually set collection permissions in the Appwrite console:');
    console.log('1. Go to: https://api.parsons.ai/console/project-default-68fdeb62001ad5c77f2f/databases/database-koffers_poc/table-subscriptions');
    console.log('2. Click Settings → Permissions');
    console.log('3. Enable "Document Security"');
    console.log('4. Set Collection Permissions:');
    console.log('   - Read: users (any authenticated user)');
    console.log('   - Create: users (any authenticated user)');
    console.log('   - Update: users (any authenticated user)');
    console.log('   - Delete: none (admin only via API key)');
    console.log('\n✅ Setup complete! Ready to test the billing page.');

  } catch (error) {
    console.error('\n❌ Error during setup:', error);
    process.exit(1);
  }
}

setup();
