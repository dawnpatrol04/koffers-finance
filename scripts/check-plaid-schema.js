require('dotenv').config({ path: '.env.local' });
const { Client, Databases } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'koffers_poc';

async function checkSchema() {
  try {
    console.log('Checking plaidTransactions collection schema...\n');
    
    const collection = await databases.getCollection(DATABASE_ID, 'plaidTransactions');
    console.log('Collection ID:', collection.$id);
    console.log('Collection Name:', collection.name);
    console.log('\nAttributes:');
    collection.attributes.forEach(attr => {
      console.log(`  - ${attr.key} (${attr.type})`);
    });
    
    console.log('\n\nChecking accounts collection schema...\n');
    const accountsCollection = await databases.getCollection(DATABASE_ID, 'accounts');
    console.log('Collection ID:', accountsCollection.$id);
    console.log('Collection Name:', accountsCollection.name);
    console.log('\nAttributes:');
    accountsCollection.attributes.forEach(attr => {
      console.log(`  - ${attr.key} (${attr.type})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSchema();
