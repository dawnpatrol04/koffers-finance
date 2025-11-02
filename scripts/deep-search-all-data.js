require('dotenv').config({ path: '.env.local' });
const { Client, Databases } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function deepSearch() {
  console.log('🔍 DEEP SEARCH - Looking for ANY Plaid data...\n');

  try {
    const dbList = await databases.list();

    for (const db of dbList.databases) {
      console.log(`\n📦 Database: ${db.name} (${db.$id})\n`);

      const collections = await databases.listCollections(db.$id);

      for (const collection of collections.collections) {
        try {
          const docs = await databases.listDocuments(db.$id, collection.$id, [], 100); // Get up to 100 docs

          if (docs.total > 0) {
            console.log(`\n📁 ${collection.name} (${collection.$id}) - ${docs.total} documents`);

            // Look through ALL documents for any Plaid-related data
            docs.documents.forEach((doc, idx) => {
              let hasPlaidData = false;
              let plaidInfo = [];

              // Check all fields
              Object.keys(doc).forEach(key => {
                const value = doc[key];
                if (!value) return;

                // Look for access tokens, item IDs, account IDs, etc.
                if (key === 'accessToken' || key === 'access_token') {
                  hasPlaidData = true;
                  plaidInfo.push(`   🔑 ACCESS TOKEN FOUND: ${value.substring(0, 30)}...`);
                }
                if (key === 'itemId' || key === 'item_id') {
                  hasPlaidData = true;
                  plaidInfo.push(`   📋 ITEM ID: ${value}`);
                }
                if (key === 'plaidItemId') {
                  hasPlaidData = true;
                  plaidInfo.push(`   📋 PLAID ITEM ID: ${value}`);
                }
                if (key === 'plaidAccountId' || key === 'accountId') {
                  hasPlaidData = true;
                  plaidInfo.push(`   💳 ACCOUNT ID: ${value}`);
                }
                if (key === 'institutionName' || key === 'institution') {
                  hasPlaidData = true;
                  plaidInfo.push(`   🏦 INSTITUTION: ${value}`);
                }
                if (key === 'userId') {
                  plaidInfo.push(`   👤 USER ID: ${value}`);
                }
                if (key === 'rawData' && value) {
                  hasPlaidData = true;
                  plaidInfo.push(`   📦 HAS RAW DATA (${value.length} chars)`);
                }
              });

              if (hasPlaidData) {
                console.log(`\n   Document ${idx + 1} ($id: ${doc.$id}):`);
                plaidInfo.forEach(info => console.log(info));
              }
            });
          }
        } catch (err) {
          console.log(`   Error: ${err.message}`);
        }
      }
    }

    console.log('\n\n✅ Search complete.');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

deepSearch();
