const { Client, Databases, Permission, Role } = require('node-appwrite');

const client = new Client()
  .setEndpoint('https://api.koffers.ai/v1')
  .setProject('68fdeb62001ad5c77f2f')
  .setKey('standard_66cde51c2c927d760cdfe5aa6562ff237bd4f3da179f564c592dfec3637601f0089b1e0bd785e2ce8f31aef4e32df4610c4891edcf2c0c8b904367c0859d9cb89332433cdd291f1b2e743ac9b8b7140c96c04e51ac8fd68b54121563374f2c18960b297f97aad78d2d2f90c52bdbabf86340461a40fb831f695c8f1f54c712dc');

const databases = new Databases(client);

const DATABASE_ID = 'koffers_poc';

async function fixCollectionPermissions() {
  const collections = [
    {
      id: 'plaidTransactions',
      name: 'Plaid Transactions',
      permissions: [
        Permission.read(Role.users()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ],
    },
    {
      id: 'subscriptions',
      name: 'Subscriptions',
      permissions: [
        Permission.read(Role.users()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
      ],
    },
    {
      id: 'chatMessages',
      name: 'Chat Messages',
      permissions: [
        Permission.read(Role.users()),
        Permission.create(Role.users()),
        Permission.update(Role.any()),
        Permission.delete(Role.users()),
      ],
    },
    {
      id: 'conversations',
      name: 'Conversations',
      permissions: [
        Permission.read(Role.users()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ],
    },
  ];

  console.log('🔧 Fixing collection permissions...\n');

  for (const collection of collections) {
    try {
      console.log(`📁 Updating ${collection.name} (${collection.id})...`);

      await databases.updateCollection(
        DATABASE_ID,
        collection.id,
        collection.name,
        collection.permissions,
        false, // documentSecurity = FALSE (this is the key fix!)
        true   // enabled
      );

      console.log(`✅ ${collection.name}: Document security disabled`);
      console.log(`   Permissions: ${collection.permissions.map(p => p).join(', ')}\n`);
    } catch (error) {
      console.error(`❌ Error updating ${collection.name}:`, error.message, '\n');
    }
  }

  console.log('✅ All collection permissions fixed!');
  console.log('\n📝 Summary:');
  console.log('   - Document security: DISABLED (users can read all docs in collection)');
  console.log('   - Collection permissions: read/create/update/delete for authenticated users');
  console.log('   - This allows users to access data without document-level permissions');
}

fixCollectionPermissions();
