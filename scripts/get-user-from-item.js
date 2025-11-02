require('dotenv').config({ path: '.env.local' });
const sdk = require('node-appwrite');

const client = new sdk.Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new sdk.Databases(client);
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'koffers_poc';

async function getUserId() {
  const items = await databases.listDocuments(DATABASE_ID, 'plaidItems');
  if (items.total > 0) {
    const item = items.documents[0];
    console.log('Found Plaid item:');
    console.log(`  User ID: ${item.userId}`);
    console.log(`  Item ID: ${item.itemId}`);
    console.log(`  Institution: ${item.institutionName}`);
    return item.userId;
  }
  console.log('No Plaid items found');
}

getUserId();
