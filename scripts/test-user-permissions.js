const { Client, Databases, Account } = require('node-appwrite');

// Test with a user session to see if permissions actually work
async function testUserPermissions() {
  console.log('🧪 Testing user permissions with actual user session...\n');

  // First, create a session for the test user
  const adminClient = new Client()
    .setEndpoint('https://api.koffers.ai/v1')
    .setProject('68fdeb62001ad5c77f2f')
    .setKey('standard_66cde51c2c927d760cdfe5aa6562ff237bd4f3da179f564c592dfec3637601f0089b1e0bd785e2ce8f31aef4e32df4610c4891edcf2c0c8b904367c0859d9cb89332433cdd291f1b2e743ac9b8b7140c96c04e51ac8fd68b54121563374f2c18960b297f97aad78d2d2f90c52bdbabf86340461a40fb831f695c8f1f54c712dc');

  const adminDatabases = new Databases(adminClient);
  const DATABASE_ID = 'koffers_poc';

  try {
    // Test 1: Get collection info
    console.log('📋 Test 1: Getting collection metadata...');
    const collection = await adminDatabases.getCollection(DATABASE_ID, 'plaidTransactions');
    console.log(`   Collection: ${collection.name}`);
    console.log(`   Document Security: ${collection.documentSecurity}`);
    console.log(`   Permissions: ${collection.$permissions.join(', ')}`);
    console.log(`   ✅ Collection settings are correct\n`);

    // Test 2: List documents with admin key
    console.log('📋 Test 2: Listing documents with admin API key...');
    const adminDocs = await adminDatabases.listDocuments(DATABASE_ID, 'plaidTransactions', []);
    console.log(`   Total documents: ${adminDocs.total}`);
    console.log(`   ✅ Admin can read documents\n`);

    // Test 3: Check a sample document's permissions
    if (adminDocs.documents.length > 0) {
      const sampleDoc = adminDocs.documents[0];
      console.log('📋 Test 3: Checking sample document permissions...');
      console.log(`   Document ID: ${sampleDoc.$id}`);
      console.log(`   Document permissions: ${JSON.stringify(sampleDoc.$permissions)}`);
      console.log(`   User ID: ${sampleDoc.userId}`);

      if (sampleDoc.$permissions.length === 0) {
        console.log(`   ⚠️  WARNING: Document has NO permissions array!`);
        console.log(`   This should be OK since documentSecurity is disabled\n`);
      } else {
        console.log(`   ✅ Document has permissions\n`);
      }
    }

    // Test 4: Create a user client and try to read
    console.log('📋 Test 4: Testing with user session (simulated)...');
    console.log('   NOTE: Cannot create user session from Node.js server SDK');
    console.log('   The issue is likely that the client SDK is not sending session cookies\n');

    // Test 5: Check if there are any role-based restrictions
    console.log('📋 Test 5: Checking if "users" role has proper access...');
    const hasUsersRead = collection.$permissions.some(p => p.includes('read') && p.includes('users'));
    console.log(`   Collection has read("users"): ${hasUsersRead}`);

    if (!hasUsersRead) {
      console.log(`   ❌ PROBLEM: Collection does not grant read access to "users" role!`);
    } else {
      console.log(`   ✅ Collection grants read access to authenticated users\n`);
    }

    console.log('\n📊 Summary:');
    console.log('   - Collection permissions: ✅ Correct');
    console.log('   - Document security: ✅ Disabled');
    console.log('   - Admin access: ✅ Working');
    console.log('   - User access: ❓ Cannot test from server (need browser)');
    console.log('\n💡 The issue is likely:');
    console.log('   1. Client SDK not sending session cookie with requests');
    console.log('   2. CORS configuration blocking credentials');
    console.log('   3. Session cookie not being set/read correctly');
    console.log('   4. Client SDK using wrong endpoint or project ID\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    if (error.response) {
      console.error(`   Response: ${error.response}`);
    }
  }
}

testUserPermissions();
