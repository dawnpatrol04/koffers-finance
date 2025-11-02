require('dotenv').config({ path: '.env.local' });
const sdk = require('node-appwrite');

const client = new sdk.Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new sdk.Databases(client);
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'koffers_poc';

const collections = [
  'transactions',
  'receiptItems',
  'files',
  'tags',
  'transactionTags',
  'itemTags',
  'fileTags',
  'reminders'
];

async function checkSchemas() {
  console.log('📊 Checking all collection schemas...\n');

  for (const collectionId of collections) {
    try {
      const collection = await databases.getCollection(DATABASE_ID, collectionId);
      console.log(`✅ ${collectionId}:`);
      collection.attributes.forEach(attr => {
        const required = attr.required ? ', required' : '';
        console.log(`   - ${attr.key} (${attr.type}${required})`);
      });
      console.log('');
    } catch (error) {
      console.log(`❌ ${collectionId}: ${error.message}\n`);
    }
  }
}

checkSchemas();
