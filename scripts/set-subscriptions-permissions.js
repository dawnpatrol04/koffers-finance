const { Client, Databases, Permission, Role } = require('node-appwrite');

const client = new Client()
  .setEndpoint('https://api.koffers.ai/v1')
  .setProject('68fdeb62001ad5c77f2f')
  .setKey('standard_66cde51c2c927d760cdfe5aa6562ff237bd4f3da179f564c592dfec3637601f0089b1e0bd785e2ce8f31aef4e32df4610c4891edcf2c0c8b904367c0859d9cb89332433cdd291f1b2e743ac9b8b7140c96c04e51ac8fd68b54121563374f2c18960b297f97aad78d2d2f90c52bdbabf86340461a40fb831f695c8f1f54c712dc');

const databases = new Databases(client);

const DATABASE_ID = 'koffers_poc';
const COLLECTION_ID = 'subscriptions';

async function setPermissions() {
  try {
    console.log('Setting collection permissions...\n');

    // Update collection with permissions
    await databases.updateCollection(
      DATABASE_ID,
      COLLECTION_ID,
      'Subscriptions', // name
      [
        Permission.read(Role.users()),    // Any authenticated user can read
        Permission.create(Role.users()),  // Any authenticated user can create
        Permission.update(Role.users()),  // Any authenticated user can update
        // No delete permission for users - admin only via API key
      ],
      true, // documentSecurity enabled
      true  // enabled
    );

    console.log('✅ Permissions set successfully!');
    console.log('\nCollection permissions:');
    console.log('  - Read: users (any authenticated user)');
    console.log('  - Create: users (any authenticated user)');
    console.log('  - Update: users (any authenticated user)');
    console.log('  - Delete: none (admin only via API key)');
    console.log('  - Document Security: enabled');
    console.log('\n✅ subscriptions collection is fully configured and ready to use!');

  } catch (error) {
    console.error('\n❌ Error setting permissions:', error);
    process.exit(1);
  }
}

setPermissions();
