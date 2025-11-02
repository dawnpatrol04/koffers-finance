require('dotenv').config({ path: '.env.local' });
const { Client, Databases } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function searchAllData() {
  console.log('🔍 Searching for existing Plaid data...\n');

  try {
    // Check all databases
    const dbList = await databases.list();
    console.log(`Found ${dbList.total} database(s):\n`);

    for (const db of dbList.databases) {
      console.log(`\n📦 Database: ${db.name} (${db.$id})`);

      // List all collections in this database
      const collections = await databases.listCollections(db.$id);
      console.log(`   Collections: ${collections.total}`);

      for (const collection of collections.collections) {
        console.log(`\n   📁 Collection: ${collection.name} (${collection.$id})`);

        try {
          const docs = await databases.listDocuments(db.$id, collection.$id);
          console.log(`      Documents: ${docs.total}`);

          if (docs.total > 0) {
            console.log(`      Sample data:`);
            docs.documents.slice(0, 2).forEach((doc, idx) => {
              console.log(`\n      Document ${idx + 1}:`);
              // Check for access token or itemId
              if (doc.accessToken) {
                console.log(`      ✅ HAS ACCESS TOKEN: ${doc.accessToken.substring(0, 20)}...`);
              }
              if (doc.itemId) {
                console.log(`      ✅ HAS ITEM ID: ${doc.itemId}`);
              }
              if (doc.userId) {
                console.log(`      User ID: ${doc.userId}`);
              }
              if (doc.institutionName) {
                console.log(`      Institution: ${doc.institutionName}`);
              }
            });
          }
        } catch (err) {
          console.log(`      Error reading documents: ${err.message}`);
        }
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

searchAllData();
