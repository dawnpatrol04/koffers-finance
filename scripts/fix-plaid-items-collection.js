/**
 * Emergency Fix: Add missing userId field to plaidItems collection
 */

require('dotenv').config({ path: '.env.local' });
const { Client, Databases } = require('node-appwrite');

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = 'koffers_poc';

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

async function fixPlaidItems() {
  console.log('🔧 Adding missing fields to plaidItems collection...');

  try {
    // Add userId field
    await databases.createStringAttribute(DATABASE_ID, 'plaidItems', 'userId', 36, true);
    console.log('✅ Added userId field');

    // Add rawData field for storing complete Plaid response
    await databases.createStringAttribute(DATABASE_ID, 'plaidItems', 'rawData', 65535, false);
    console.log('✅ Added rawData field');

    console.log('\n✨ Fix complete! User can now reconnect banks.');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixPlaidItems();
