require('dotenv').config({ path: '.env.local' });
const sdk = require('node-appwrite');

const client = new sdk.Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new sdk.Databases(client);
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'koffers_poc';

async function checkSchema() {
  try {
    const collection = await databases.getCollection(DATABASE_ID, 'accounts');
    console.log('accounts collection attributes:');
    collection.attributes.forEach(attr => {
      console.log(`  - ${attr.key} (${attr.type})`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSchema();
