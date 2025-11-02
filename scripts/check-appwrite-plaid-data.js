require('dotenv').config({ path: '.env.local' });
const { Client, Databases, Query } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'koffers_poc';

async function checkPlaidData() {
  console.log('🔍 Checking Appwrite for Plaid data...\n');

  try {
    // Check plaidItems collection
    console.log('Checking plaidItems collection...');
    const items = await databases.listDocuments(
      DATABASE_ID,
      'plaidItems',
      [
        Query.limit(100)
      ]
    );

    console.log(`Found ${items.total} plaidItems documents`);

    if (items.documents.length > 0) {
      console.log('\n📦 Plaid Items:');
      items.documents.forEach(item => {
        console.log(`  - ID: ${item.$id}`);
        console.log(`    Item ID: ${item.itemId}`);
        console.log(`    Institution: ${item.institutionName}`);
        console.log(`    Access Token: ${item.accessToken ? '✅ EXISTS' : '❌ MISSING'}`);
        if (item.accessToken) {
          console.log(`    Access Token Value: ${item.accessToken}`);
        }
        console.log(`    Status: ${item.status}`);
        console.log(`    Created: ${item.$createdAt}`);
        console.log('');
      });

      // Look specifically for the production Chase item
      const chaseItem = items.documents.find(item =>
        item.itemId === 'rbX6mKOd3dIXKJ1bL3z1FJ5vOJndBJUBK79m3'
      );

      if (chaseItem) {
        console.log('🎯 FOUND THE PRODUCTION CHASE ITEM!');
        console.log('Access Token:', chaseItem.accessToken);
      } else {
        console.log('❌ Production Chase item NOT FOUND in database');
        console.log('   Expected Item ID: rbX6mKOd3dIXKJ1bL3z1FJ5vOJndBJUBK79m3');
      }
    } else {
      console.log('❌ No plaidItems found in database');
    }

  } catch (error) {
    console.error('Error checking Appwrite:', error.message);
    if (error.code === 404) {
      console.log('\n❌ plaidItems collection does not exist!');
      console.log('   This confirms the collection was deleted.');
    }
  }
}

checkPlaidData();
