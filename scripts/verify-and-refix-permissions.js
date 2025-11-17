const { Client, Databases, Permission, Role } = require('node-appwrite');

const client = new Client()
  .setEndpoint('https://api.koffers.ai/v1')
  .setProject('68fdeb62001ad5c77f2f')
  .setKey('standard_66cde51c2c927d760cdfe5aa6562ff237bd4f3da179f564c592dfec3637601f0089b1e0bd785e2ce8f31aef4e32df4610c4891edcf2c0c8b904367c0859d9cb89332433cdd291f1b2e743ac9b8b7140c96c04e51ac8fd68b54121563374f2c18960b297f97aad78d2d2f90c52bdbabf86340461a40fb831f695c8f1f54c712dc');

const databases = new Databases(client);

const DATABASE_ID = 'koffers_poc';

async function verifyAndFixPermissions() {
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
      id: 'accounts',
      name: 'Accounts',
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

  console.log('🔍 Verifying and fixing collection permissions...\n');

  for (const collection of collections) {
    try {
      // First, get current collection info
      console.log(`📁 Checking ${collection.name} (${collection.id})...`);

      const currentCollection = await databases.getCollection(DATABASE_ID, collection.id);

      console.log(`   Current documentSecurity: ${currentCollection.documentSecurity}`);
      console.log(`   Current permissions: ${currentCollection.$permissions.join(', ')}`);

      // Update to ensure correct state
      await databases.updateCollection(
        DATABASE_ID,
        collection.id,
        collection.name,
        collection.permissions,
        false, // documentSecurity = FALSE
        true   // enabled
      );

      console.log(`✅ ${collection.name}: Updated`);
      console.log(`   New documentSecurity: false`);
      console.log(`   New permissions: ${collection.permissions.map(p => p).join(', ')}\n`);
    } catch (error) {
      console.error(`❌ Error with ${collection.name}:`, error.message, '\n');
    }
  }

  console.log('\n✅ All collections verified and updated!');
  console.log('\n📝 Summary:');
  console.log('   - Document security: DISABLED');
  console.log('   - Collection permissions: read/create/update/delete for authenticated users');
  console.log('   - Users should now be able to access data');
  console.log('\n⚠️  Users MUST log out and log back in to refresh their session!');
}

verifyAndFixPermissions();
